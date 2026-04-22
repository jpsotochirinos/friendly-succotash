import { Worker, Job } from 'bullmq';
import { createWriteStream, promises as fsp } from 'node:fs';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform, type Readable } from 'node:stream';
import { google } from 'googleapis';
import { MikroORM } from '@mikro-orm/postgresql';
import {
  ImportBatch,
  ImportItem,
  Organization,
} from '@tracker/db';
import {
  ImportBatchStatus,
  ImportChannel,
  ImportItemStatus,
  PlanTier,
  assertBatchWithinTier,
} from '@tracker/shared';
import { getRedisConnection } from '../config/redis';

export interface ImportDriveIngestJob {
  batchId: string;
  organizationId: string;
  rootFolderId?: string;
}

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';

const GOOGLE_EXPORT: Record<string, { exportMime: string; ext: string }> = {
  'application/vnd.google-apps.document': {
    exportMime:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ext: '.docx',
  },
  'application/vnd.google-apps.spreadsheet': {
    exportMime:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: '.xlsx',
  },
  'application/vnd.google-apps.presentation': {
    exportMime:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ext: '.pptx',
  },
  'application/vnd.google-apps.drawing': {
    exportMime: 'application/pdf',
    ext: '.pdf',
  },
};

function guessMimeFromPath(p: string): string {
  const ext = p.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    txt: 'text/plain',
  };
  return map[ext] || 'application/octet-stream';
}

function sanitizeSegment(name: string): string {
  return name.replace(/[/\\]/g, '_');
}

export function createImportDriveIngestWorker(orm: MikroORM) {
  return new Worker<ImportDriveIngestJob>(
    'import-drive-ingest',
    async (job: Job<ImportDriveIngestJob>) => {
      const { batchId, organizationId, rootFolderId = 'root' } = job.data;
      const em = orm.em.fork();
      const maxFiles = Number(process.env.DRIVE_MAX_FILES_PER_BATCH || 50_000);

      const batch = await em.findOne(
        ImportBatch,
        { id: batchId, organization: organizationId } as any,
        { filters: false },
      );
      if (!batch) throw new Error(`Import batch ${batchId} not found`);
      if (batch.channel !== ImportChannel.OAUTH_DRIVE) {
        throw new Error('Canal no es Google Drive');
      }
      const importBatch = batch;

      const refresh = (batch.config as any)?.oauth?.google?.refreshToken as
        | string
        | undefined;
      if (!refresh) {
        batch.status = ImportBatchStatus.FAILED;
        batch.errorMessage = 'Sin refresh token de Google';
        await em.flush();
        return;
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET no configurados');
      }

      const org = await em.findOne(Organization, { id: organizationId }, { filters: false });
      const tier = (org?.planTier as PlanTier) ?? PlanTier.FREE;

      const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
      oauth2.setCredentials({ refresh_token: refresh });
      const drive = google.drive({ version: 'v3', auth: oauth2 });

      const { Client: MinioClient } = await import('minio');
      const minio = new MinioClient({
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: Number(process.env.MINIO_PORT) || 9000,
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      });
      const bucket = process.env.MINIO_BUCKET || 'tracker-storage';

      batch.status = ImportBatchStatus.INGESTING;
      batch.errorMessage = undefined;
      batch.processedItems = 0;
      batch.totalItems = 0;
      await em.flush();

      const seenSha = new Set<string>();
      let totalBytes = 0;
      let itemCount = 0;

      const stack: { id: string; rel: string }[] = [{ id: rootFolderId, rel: '' }];

      async function listChildren(parentId: string) {
        const files: { id: string; name: string; mimeType?: string | null; size?: string | null }[] = [];
        let pageToken: string | undefined;
        do {
          const res = await drive.files.list({
            q: `'${parentId}' in parents and trashed=false`,
            fields:
              'nextPageToken, files(id,name,mimeType,parents,size,modifiedTime,md5Checksum)',
            pageToken,
            pageSize: 1000,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          });
          for (const f of res.data.files ?? []) {
            if (f.id && f.name) files.push(f as any);
          }
          pageToken = res.data.nextPageToken ?? undefined;
        } while (pageToken);
        return files;
      }

      async function streamToTmp(
        stream: Readable,
      ): Promise<{ tmpPath: string; sha256: string; size: number }> {
        const tmpPath = path.join(os.tmpdir(), `gdrive-${randomUUID()}`);
        const hash = createHash('sha256');
        const write = createWriteStream(tmpPath);
        const hasher = new Transform({
          transform(chunk: Buffer, _enc, cb) {
            hash.update(chunk);
            cb(null, chunk);
          },
        });
        await pipeline(stream, hasher, write);
        const stat = await fsp.stat(tmpPath);
        return { tmpPath, sha256: hash.digest('hex'), size: stat.size };
      }

      async function processBinaryFile(
        fileId: string,
        sourcePath: string,
        mimeHint: string,
      ) {
        const res = await drive.files.get(
          { fileId, alt: 'media', supportsAllDrives: true },
          { responseType: 'stream' },
        );
        const { tmpPath, sha256, size } = await streamToTmp(res.data as Readable);
        try {
          if (seenSha.has(sha256)) return;
          const check = assertBatchWithinTier(tier, totalBytes + size, itemCount + 1);
          if (!check.ok) {
            throw new Error(check.reason);
          }
          const stagingKey = `staging/org-${organizationId}/batch-${batchId}/${sourcePath}`;
          await minio.putObject(
            bucket,
            stagingKey,
            fs.createReadStream(tmpPath),
            size,
            { 'Content-Type': mimeHint || guessMimeFromPath(sourcePath) },
          );
          seenSha.add(sha256);
          totalBytes += size;
          itemCount += 1;
          em.create(ImportItem, {
            batch: batchId,
            sourcePath,
            sha256,
            sizeBytes: String(size),
            mimeDetected: mimeHint || guessMimeFromPath(sourcePath),
            stagingKey,
            status: ImportItemStatus.QUEUED,
            organization: organizationId,
          } as any);
          importBatch.processedItems = itemCount;
          importBatch.totalItems = itemCount;
          await em.flush();
          await job.updateProgress(Math.min(95, Math.round((itemCount / Math.max(maxFiles, 1)) * 90)));
        } finally {
          await fsp.unlink(tmpPath).catch(() => undefined);
        }
      }

      async function processExportFile(
        fileId: string,
        sourcePath: string,
        exportMime: string,
        mimeOut: string,
      ) {
        const res = await drive.files.export(
          { fileId, mimeType: exportMime },
          { responseType: 'stream' },
        );
        const { tmpPath, sha256, size } = await streamToTmp(res.data as Readable);
        try {
          if (seenSha.has(sha256)) return;
          const check = assertBatchWithinTier(tier, totalBytes + size, itemCount + 1);
          if (!check.ok) {
            throw new Error(check.reason);
          }
          const stagingKey = `staging/org-${organizationId}/batch-${batchId}/${sourcePath}`;
          await minio.putObject(
            bucket,
            stagingKey,
            fs.createReadStream(tmpPath),
            size,
            { 'Content-Type': mimeOut },
          );
          seenSha.add(sha256);
          totalBytes += size;
          itemCount += 1;
          em.create(ImportItem, {
            batch: batchId,
            sourcePath,
            sha256,
            sizeBytes: String(size),
            mimeDetected: mimeOut,
            stagingKey,
            status: ImportItemStatus.QUEUED,
            organization: organizationId,
          } as any);
          importBatch.processedItems = itemCount;
          importBatch.totalItems = itemCount;
          await em.flush();
          await job.updateProgress(Math.min(95, Math.round((itemCount / Math.max(maxFiles, 1)) * 90)));
        } finally {
          await fsp.unlink(tmpPath).catch(() => undefined);
        }
      }

      try {
        while (stack.length) {
          if (itemCount >= maxFiles) {
            throw new Error(`Límite de archivos por lote (${maxFiles}) alcanzado`);
          }
          const { id: folderId, rel: parentRel } = stack.pop()!;
          const children = await listChildren(folderId);
          children.sort((a, b) => {
            const af = a.mimeType === FOLDER_MIME ? 0 : 1;
            const bf = b.mimeType === FOLDER_MIME ? 0 : 1;
            if (af !== bf) return af - bf;
            return (a.name || '').localeCompare(b.name || '');
          });

          for (const f of children) {
            if (itemCount >= maxFiles) break;
            const name = sanitizeSegment(f.name || 'unnamed');
            const rel = parentRel ? `${parentRel}/${name}` : name;

            if (f.mimeType === FOLDER_MIME) {
              stack.push({ id: f.id, rel });
              continue;
            }
            if (f.mimeType === SHORTCUT_MIME) {
              continue;
            }

            if (f.mimeType?.startsWith('application/vnd.google-apps.')) {
              const exp = f.mimeType ? GOOGLE_EXPORT[f.mimeType] : undefined;
              if (!exp) {
                continue;
              }
              const base = name.replace(/\.[^/.]+$/, '');
              const outPath = `${base}${exp.ext}`;
              const fullPath = parentRel ? `${parentRel}/${outPath}` : outPath;
              await processExportFile(f.id, fullPath, exp.exportMime, guessMimeFromPath(fullPath));
              continue;
            }

            await processBinaryFile(f.id, rel, guessMimeFromPath(rel));
          }
        }

        batch.totalItems = itemCount;
        batch.processedItems = itemCount;
        batch.status = ImportBatchStatus.ANALYZING;
        await em.flush();

        const { Queue } = await import('bullmq');
        const analyzeQueue = new Queue('import-analyze', {
          connection: getRedisConnection(),
        });
        await analyzeQueue.add(
          'run',
          { batchId, organizationId },
          { removeOnComplete: 100, removeOnFail: 50 },
        );
      } catch (e) {
        batch.status = ImportBatchStatus.FAILED;
        batch.errorMessage = (e as Error).message;
        await em.flush();
        throw e;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 1,
      limiter: { max: 2, duration: 1000 },
    },
  );
}
