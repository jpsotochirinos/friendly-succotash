import { Worker, Job } from 'bullmq';
import { MikroORM } from '@mikro-orm/postgresql';
import { getRedisConnection } from '../config/redis';
import {
  Document,
  DocumentVersion,
  Folder,
  ImportBatch,
  ImportItem,
  Trackable,
  WorkflowItem,
} from '@tracker/db';
import { ImportBatchStatus, ImportItemStatus } from '@tracker/shared';

interface ImportRevertJob {
  batchId: string;
  organizationId: string;
}

export function createImportRevertWorker(orm: MikroORM) {
  return new Worker<ImportRevertJob>(
    'import-revert',
    async (job: Job<ImportRevertJob>) => {
      const { batchId, organizationId } = job.data;
      const em = orm.em.fork();

      const items = await em.find(
        ImportItem,
        { batch: batchId, organization: organizationId } as any,
        { filters: false },
      );

      const docIds = new Set<string>();
      const trackableIds = new Set<string>();
      for (const it of items) {
        const d = it.mappedDocument as { id?: string } | undefined;
        const t = it.mappedTrackable as { id?: string } | undefined;
        if (d?.id) docIds.add(d.id);
        if (t?.id) trackableIds.add(t.id);
      }

      for (const docId of docIds) {
        await em.nativeDelete(DocumentVersion, { document: docId } as any);
        await em.nativeDelete(Document, { id: docId, organization: organizationId } as any);
      }

      for (const tid of trackableIds) {
        await em.nativeDelete(WorkflowItem, { trackable: tid } as any);
        await em.nativeDelete(Folder, { trackable: tid } as any);
        await em.nativeDelete(Trackable, { id: tid, organization: organizationId } as any);
      }

      await em.nativeDelete(ImportItem, { batch: batchId } as any);

      const batch = await em.findOne(ImportBatch, { id: batchId } as any, { filters: false });
      if (batch) {
        batch.status = ImportBatchStatus.REVERTED;
        await em.flush();
      }

      const { Client: MinioClient } = await import('minio');
      const minio = new MinioClient({
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: Number(process.env.MINIO_PORT) || 9000,
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      });
      const bucket = process.env.MINIO_BUCKET || 'tracker-storage';
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

      await em.nativeDelete(ImportBatch, { id: batchId } as any);
      await job.updateProgress(100);
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );
}
