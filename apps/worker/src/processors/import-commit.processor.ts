import { Worker, Job } from 'bullmq';
import { MikroORM } from '@mikro-orm/postgresql';
import { getRedisConnection } from '../config/redis';
import {
  Document,
  DocumentVersion,
  ImportBatch,
  ImportItem,
  Organization,
  Trackable,
} from '@tracker/db';
import { ImportBatchStatus, ImportItemStatus } from '@tracker/shared';

interface ImportCommitJob {
  batchId: string;
  organizationId: string;
  userId: string;
}

export function createImportCommitWorker(orm: MikroORM) {
  return new Worker<ImportCommitJob>(
    'import-commit',
    async (job: Job<ImportCommitJob>) => {
      const { batchId, organizationId, userId } = job.data;
      const em = orm.em.fork();

      const batch = await em.findOne(
        ImportBatch,
        { id: batchId, organization: organizationId } as any,
        { filters: false, populate: [] as any },
      );
      if (!batch) throw new Error('Batch not found');

      const { Client: MinioClient } = await import('minio');
      const minio = new MinioClient({
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: Number(process.env.MINIO_PORT) || 9000,
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      });
      const bucket = process.env.MINIO_BUCKET || 'tracker-storage';

      const items = await em.find(
        ImportItem,
        {
          batch: batchId,
          organization: organizationId,
          status: ImportItemStatus.MAPPED,
        } as any,
        {
          filters: false,
          populate: ['mappedDocument', 'mappedTrackable', 'mappedDocument.folder'] as any,
        },
      );

      let committed = 0;
      for (const item of items) {
        const doc = item.mappedDocument as Document | undefined;
        const tr = item.mappedTrackable as Trackable | undefined;
        if (!doc?.id || !tr?.id || !item.stagingKey) {
          item.status = ImportItemStatus.FAILED;
          item.errorMessage = 'Falta documento o trackable';
          await em.flush();
          continue;
        }

        const folder = (doc as any).folder;
        const folderId = folder?.id ?? folder;
        const folderPart = folderId ? `folder-${folderId}` : 'folder-root';
        const fname = (doc.filename || doc.title || 'file').replace(/[/\\]/g, '_');
        const destKey = `org-${organizationId}/trackable-${tr.id}/${folderPart}/${Date.now()}-${fname}`;

        const stream = await minio.getObject(bucket, item.stagingKey);
        const chunks: Buffer[] = [];
        for await (const c of stream) {
          chunks.push(Buffer.from(c));
        }
        const buf = Buffer.concat(chunks);
        await minio.putObject(bucket, destKey, buf, buf.length, {
          'Content-Type': doc.mimeType || 'application/octet-stream',
        });

        doc.minioKey = destKey;
        await em.nativeUpdate(
          DocumentVersion,
          { document: doc.id } as any,
          { minioKey: destKey } as any,
        );
        doc.tags = (doc.tags || []).filter((t) => !t.startsWith('import:'));

        const meta = (tr.metadata || {}) as Record<string, unknown>;
        tr.metadata = { ...meta, importCommitted: true, importCommittedAt: new Date().toISOString() };

        item.status = ImportItemStatus.COMMITTED;
        committed += 1;
        batch.committedItems = committed;
        await em.flush();
        await job.updateProgress(Math.round((committed / Math.max(items.length, 1)) * 100));
      }

      batch.status = ImportBatchStatus.COMMITTED;
      await em.flush();

      const org = await em.findOne(Organization, { id: organizationId } as any, { filters: false });
      if (org && org.onboardingState?.migrationCompleted !== true) {
        org.onboardingState = { ...(org.onboardingState ?? {}), migrationCompleted: true };
        await em.flush();
      }

      // Purga staging del lote (best-effort)
      const prefix = `staging/org-${organizationId}/batch-${batchId}/`;
      const keys: string[] = [];
      let marker: string | undefined;
      for (;;) {
        const res = await minio.listObjectsQuery(bucket, prefix, marker);
        for (const obj of res.objects) {
          if (obj.name) keys.push(obj.name);
        }
        if (!res.isTruncated) break;
        marker = res.nextMarker;
      }
      if (keys.length) {
        await minio.removeObjects(bucket, keys);
      }
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );
}
