import { Worker, Job } from 'bullmq';
import { createWriteStream, promises as fsp } from 'node:fs';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform, Readable } from 'node:stream';
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

const MS_SCOPE = 'Files.Read.All Sites.Read.All offline_access';

export interface ImportMsGraphIngestJob {
  batchId: string;
  organizationId: string;
  mode: 'onedrive' | 'sharepoint';
  siteId?: string;
  rootItemId?: string;
}

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

async function refreshMsAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
}> {
  const tenant = process.env.MICROSOFT_TENANT || 'common';
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const secret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new Error('MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET no configurados');
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: secret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: MS_SCOPE,
  });
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    },
  );
  const j = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
  };
  if (!res.ok || !j.access_token) {
    throw new Error(j.error || 'Error renovando token Microsoft');
  }
  return { access_token: j.access_token, refresh_token: j.refresh_token };
}

export function createImportMsGraphIngestWorker(orm: MikroORM) {
  return new Worker<ImportMsGraphIngestJob>(
    'import-ms-graph-ingest',
    async (job: Job<ImportMsGraphIngestJob>) => {
      const { batchId, organizationId, mode, siteId, rootItemId } = job.data;
      const em = orm.em.fork();
      const maxFiles = Number(process.env.DRIVE_MAX_FILES_PER_BATCH || 50_000);

      const batch = await em.findOne(
        ImportBatch,
        { id: batchId, organization: organizationId } as any,
        { filters: false },
      );
      if (!batch) throw new Error(`Import batch ${batchId} not found`);
      if (
        batch.channel !== ImportChannel.OAUTH_ONEDRIVE &&
        batch.channel !== ImportChannel.OAUTH_SHAREPOINT
      ) {
        throw new Error('Canal no es OneDrive/SharePoint');
      }
      const msBatch = batch;

      let refresh = (batch.config as any)?.oauth?.microsoft?.refreshToken as string | undefined;
      if (!refresh) {
        batch.status = ImportBatchStatus.FAILED;
        batch.errorMessage = 'Sin refresh token de Microsoft';
        await em.flush();
        return;
      }

      const org = await em.findOne(Organization, { id: organizationId }, { filters: false });
      const tier = (org?.planTier as PlanTier) ?? PlanTier.FREE;

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

      let tokenBundle = await refreshMsAccessToken(refresh);
      if (tokenBundle.refresh_token) {
        refresh = tokenBundle.refresh_token;
        (msBatch.config as any).oauth = {
          ...(msBatch.config as any).oauth,
          microsoft: {
            ...(msBatch.config as any).oauth?.microsoft,
            refreshToken: refresh,
          },
        };
        await em.flush();
      }
      let accessToken = tokenBundle.access_token;
      let currentRefresh: string = refresh;

      const graphBase = 'https://graph.microsoft.com/v1.0';

      async function graphGet<T>(urlPath: string): Promise<T> {
        const res = await fetch(`${graphBase}${urlPath}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.status === 401) {
          tokenBundle = await refreshMsAccessToken(currentRefresh);
          accessToken = tokenBundle.access_token;
          if (tokenBundle.refresh_token) {
            refresh = tokenBundle.refresh_token;
            currentRefresh = tokenBundle.refresh_token;
            (msBatch.config as any).oauth.microsoft.refreshToken = refresh;
            await em.flush();
          }
          const retry = await fetch(`${graphBase}${urlPath}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!retry.ok) {
            throw new Error(`Graph ${urlPath}: ${retry.status}`);
          }
          return retry.json() as Promise<T>;
        }
        if (!res.ok) {
          throw new Error(`Graph ${urlPath}: ${res.status}`);
        }
        return res.json() as Promise<T>;
      }

      async function graphGetStream(urlPath: string): Promise<Readable> {
        const res = await fetch(`${graphBase}${urlPath}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.status === 401) {
          tokenBundle = await refreshMsAccessToken(currentRefresh);
          accessToken = tokenBundle.access_token;
          if (tokenBundle.refresh_token) {
            refresh = tokenBundle.refresh_token;
            currentRefresh = tokenBundle.refresh_token;
            (msBatch.config as any).oauth.microsoft.refreshToken = refresh;
            await em.flush();
          }
          const retry = await fetch(`${graphBase}${urlPath}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!retry.ok || !retry.body) {
            throw new Error(`Graph download ${urlPath}: ${retry.status}`);
          }
          return Readable.fromWeb(retry.body as any);
        }
        if (!res.ok || !res.body) {
          throw new Error(`Graph download ${urlPath}: ${res.status}`);
        }
        return Readable.fromWeb(res.body as any);
      }

      const seenSha = new Set<string>();
      let totalBytes = 0;
      let itemCount = 0;

      interface GraphDriveItem {
        id: string;
        name: string;
        folder?: { childCount?: number };
        file?: { mimeType?: string };
        size?: number;
        package?: { type?: string };
      }

      async function listChildren(itemId: string, modeLocal: 'onedrive' | 'sharepoint'): Promise<GraphDriveItem[]> {
        let path: string;
        if (modeLocal === 'onedrive') {
          path =
            itemId === 'root'
              ? '/me/drive/root/children'
              : `/me/drive/items/${encodeURIComponent(itemId)}/children`;
        } else {
          const site = siteId?.trim();
          if (!site) throw new Error('siteId requerido');
          const enc = encodeURIComponent(site);
          path =
            itemId === 'root'
              ? `/sites/${enc}/drive/root/children`
              : `/sites/${enc}/drive/items/${encodeURIComponent(itemId)}/children`;
        }
        const data = await graphGet<{ value?: GraphDriveItem[] }>(path);
        return data.value ?? [];
      }

      async function streamToTmp(stream: Readable): Promise<{
        tmpPath: string;
        sha256: string;
        size: number;
      }> {
        const tmpPath = path.join(os.tmpdir(), `msgraph-${randomUUID()}`);
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

      async function processFileItem(
        item: GraphDriveItem,
        relPath: string,
        modeLocal: 'onedrive' | 'sharepoint',
      ) {
        const mime =
          item.file?.mimeType || guessMimeFromPath(relPath);
        const site = siteId?.trim() ?? '';
        if (modeLocal === 'sharepoint' && !site) {
          throw new Error('siteId requerido para SharePoint');
        }
        const pathDownload =
          modeLocal === 'onedrive'
            ? `/me/drive/items/${encodeURIComponent(item.id)}/content`
            : `/sites/${encodeURIComponent(site)}/drive/items/${encodeURIComponent(item.id)}/content`;

        const stream = await graphGetStream(pathDownload);
        const { tmpPath, sha256, size } = await streamToTmp(stream);
        try {
          if (seenSha.has(sha256)) return;
          const check = assertBatchWithinTier(tier, totalBytes + size, itemCount + 1);
          if (!check.ok) {
            throw new Error(check.reason);
          }
          const stagingKey = `staging/org-${organizationId}/batch-${batchId}/${relPath}`;
          await minio.putObject(
            bucket,
            stagingKey,
            fs.createReadStream(tmpPath),
            size,
            { 'Content-Type': mime },
          );
          seenSha.add(sha256);
          totalBytes += size;
          itemCount += 1;
          em.create(ImportItem, {
            batch: batchId,
            sourcePath: relPath,
            sha256,
            sizeBytes: String(size),
            mimeDetected: mime,
            stagingKey,
            status: ImportItemStatus.QUEUED,
            organization: organizationId,
          } as any);
          msBatch.processedItems = itemCount;
          msBatch.totalItems = itemCount;
          await em.flush();
          await job.updateProgress(Math.min(95, Math.round((itemCount / Math.max(maxFiles, 1)) * 90)));
        } finally {
          await fsp.unlink(tmpPath).catch(() => undefined);
        }
      }

      const stack: { itemId: string; rel: string }[] = [];
      const startId =
        rootItemId && rootItemId !== 'root' ? rootItemId : 'root';
      stack.push({ itemId: startId, rel: '' });

      try {
        while (stack.length) {
          if (itemCount >= maxFiles) {
            throw new Error(`Límite de archivos por lote (${maxFiles}) alcanzado`);
          }
          const { itemId, rel: parentRel } = stack.pop()!;
          const children = await listChildren(itemId, mode);
          children.sort((a, b) => {
            const af = a.folder ? 0 : 1;
            const bf = b.folder ? 0 : 1;
            if (af !== bf) return af - bf;
            return (a.name || '').localeCompare(b.name || '');
          });

          for (const ch of children) {
            if (itemCount >= maxFiles) break;
            const name = sanitizeSegment(ch.name || 'unnamed');
            const rel = parentRel ? `${parentRel}/${name}` : name;

            if (ch.folder) {
              stack.push({ itemId: ch.id, rel });
              continue;
            }
            if (ch.package) {
              continue;
            }
            await processFileItem(ch, rel, mode);
          }
        }

        msBatch.totalItems = itemCount;
        msBatch.processedItems = itemCount;
        msBatch.status = ImportBatchStatus.ANALYZING;
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
        msBatch.status = ImportBatchStatus.FAILED;
        msBatch.errorMessage = (e as Error).message;
        await em.flush();
        throw e;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 1,
    },
  );
}
