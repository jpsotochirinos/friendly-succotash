import { Worker, Job } from 'bullmq';
import { MikroORM } from '@mikro-orm/postgresql';
import { getRedisConnection } from '../config/redis';
import {
  ImportBatch,
  ImportItem,
  Organization,
} from '@tracker/db';
import {
  ImportBatchStatus,
  ImportItemStatus,
  PlanTier,
  hybridClassify,
  getImportCapabilities,
  suggestTrackableKey,
} from '@tracker/shared';
import { extractText } from '../utils/text-extractor';
import { mapImportDrafts } from '../import/map-to-domain';
import { publishMigrationEvent } from '../utils/migration-redis-publish';

interface ImportAnalyzeJob {
  batchId: string;
  organizationId: string;
}

export function createImportAnalyzeWorker(orm: MikroORM) {
  return new Worker<ImportAnalyzeJob>(
    'import-analyze',
    async (job: Job<ImportAnalyzeJob>) => {
      const { batchId, organizationId } = job.data;
      const em = orm.em.fork();

      const batch = await em.findOne(
        ImportBatch,
        { id: batchId, organization: organizationId } as any,
        { filters: false },
      );
      if (!batch) {
        throw new Error(`Import batch ${batchId} not found`);
      }

      const org = await em.findOne(Organization, { id: organizationId }, { filters: false });
      const tier = getImportCapabilities((org?.planTier as PlanTier) ?? PlanTier.FREE);

      batch.status = ImportBatchStatus.ANALYZING;
      await em.flush();
      publishMigrationEvent(batchId, 'batch.status', { status: batch.status });

      const items = await em.find(
        ImportItem,
        { batch: batchId, organization: organizationId, status: ImportItemStatus.QUEUED } as any,
        { filters: false },
      );

      if (items.length === 0) {
        batch.status = ImportBatchStatus.READY_FOR_REVIEW;
        await em.flush();
        publishMigrationEvent(batchId, 'batch.ready', { status: batch.status });
        return;
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

      let done = 0;
      for (const item of items) {
        if (!item.stagingKey) {
          item.status = ImportItemStatus.FAILED;
          item.errorMessage = 'Sin stagingKey';
          await em.flush();
          continue;
        }

        const stream = await minio.getObject(bucket, item.stagingKey);
        const chunks: Buffer[] = [];
        for await (const c of stream) {
          chunks.push(Buffer.from(c));
        }
        const buf = Buffer.concat(chunks);
        const mime = item.mimeDetected || 'application/octet-stream';

        let textPreview = '';
        try {
          textPreview = await extractText(buf, mime);
        } catch (e) {
          item.errorMessage = (e as Error).message;
        }

        if (!textPreview.trim() && mime === 'application/pdf' && tier.allowOcr) {
          const ocrUrl = process.env.OCR_SERVICE_URL;
          if (ocrUrl) {
            try {
              const res = await fetch(`${ocrUrl.replace(/\/$/, '')}/ocr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  base64: buf.toString('base64'),
                  filename: 'doc.pdf',
                  mimeType: mime,
                }),
              });
              if (res.ok) {
                const j = (await res.json()) as { text?: string };
                textPreview = j.text || '';
              }
            } catch {
              /* ignore */
            }
          }
        }

        const preview = textPreview.slice(0, 200_000);
        item.extractedTextPreview = preview.slice(0, 20_000);

        const classification = hybridClassify({
          filename: item.sourcePath.split('/').pop() || item.sourcePath,
          textPreview: preview,
          tier,
        });
        item.classification = classification as any;

        const sug = suggestTrackableKey(item.sourcePath, preview);
        item.suggestedTrackableKey = sug.key;
        item.trackableConfidence = sug.confidence;

        item.status = ImportItemStatus.CLASSIFIED;
        done += 1;
        batch.processedItems = done;
        await em.flush();
        publishMigrationEvent(batchId, 'item.classified', {
          itemId: item.id,
          done,
          total: items.length,
        });
        await job.updateProgress(Math.round((done / Math.max(items.length, 1)) * 90));
      }

      batch.status = ImportBatchStatus.MAPPING;
      await em.flush();
      publishMigrationEvent(batchId, 'batch.status', { status: batch.status });

      await mapImportDrafts(em, batch, organizationId);

      batch.processedItems = items.length;
      await em.flush();
      publishMigrationEvent(batchId, 'batch.ready', {
        status: ImportBatchStatus.READY_FOR_REVIEW,
      });
    },
    { connection: getRedisConnection(), concurrency: 2 },
  );
}
