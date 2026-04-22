import type { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import * as path from 'node:path';
import * as os from 'node:os';
import { ImportService } from './import.service';
import { verifyUploadToken } from './utils/upload-token';
import { getAllowedCorsOrigins } from '../../common/cors-origins';

function tusAllowedOrigins(): string[] {
  return getAllowedCorsOrigins();
}

/**
 * Monta el servidor TUS bajo `/api/import/tus` (middleware Express plano; coincide con `path` del Server).
 */
export async function mountTusImport(
  app: NestExpressApplication,
  importService: ImportService,
): Promise<void> {
  const { Server } = await import('@tus/server');
  const { FileStore } = await import('@tus/file-store');

  const tusDir = path.join(os.tmpdir(), 'tracker-tus-import');
  const datastore = new FileStore({ directory: tusDir });

  const tusServer = new Server({
    path: '/api/import/tus',
    datastore,
    maxSize: 5 * 1024 * 1024 * 1024,
    respectForwardedHeaders: true,
    allowedHeaders: [
      'Authorization',
      'X-Requested-With',
      'Tus-Resumable',
      'Upload-Length',
      'Upload-Metadata',
      'Upload-Offset',
      'Upload-Defer-Length',
      'Upload-Concat',
      'Content-Type',
    ],
    allowedOrigins: tusAllowedOrigins(),
    allowedCredentials: true,
    onUploadCreate: async (_req, upload) => {
      const meta = upload.metadata || {};
      const tokenRaw = meta.token ?? meta.uploadtoken;
      const batchId = meta.batchid ?? meta.batchId;
      if (!tokenRaw || !batchId) {
        throw Object.assign(new Error('Faltan token o batchId en Upload-Metadata'), {
          status_code: 400,
        });
      }
      const token = typeof tokenRaw === 'string' ? tokenRaw : String(tokenRaw);
      const verified = verifyUploadToken(token);
      if (!verified || verified.batchId !== batchId) {
        throw Object.assign(new Error('Token de subida inválido'), { status_code: 403 });
      }
      return { metadata: upload.metadata };
    },
    onUploadFinish: async (_req, upload) => {
      const meta = upload.metadata || {};
      const tokenRaw = meta.token ?? meta.uploadtoken;
      const batchId = meta.batchid ?? meta.batchId;
      const filenameMeta = meta.filename ?? meta.name;
      let originalName = 'upload.bin';
      if (filenameMeta) {
        const s = String(filenameMeta);
        try {
          const dec = Buffer.from(s, 'base64').toString('utf8');
          originalName = dec && !dec.includes('\0') ? dec : s;
        } catch {
          originalName = s;
        }
      }
      const token = typeof tokenRaw === 'string' ? tokenRaw : String(tokenRaw);
      const verified = verifyUploadToken(token);
      if (!verified || !batchId) {
        throw Object.assign(new Error('Token inválido al finalizar'), { status_code: 403 });
      }
      const storagePath = upload.storage?.path;
      if (!storagePath) {
        throw Object.assign(new Error('Sin ruta de almacenamiento'), { status_code: 500 });
      }
      await importService.finalizeTusUpload({
        localPath: storagePath,
        originalName,
        batchId: String(batchId),
        organizationId: verified.organizationId,
      });
      return {};
    },
  });

  const expressApp = app.getHttpAdapter().getInstance();
  /** Router dedicado para que el stack quede claro y no se mezcle con rutas Nest. */
  const tusRouter = express.Router({ mergeParams: true });
  tusRouter.use((req, res) => {
    tusServer.handle(req, res).catch((err: Error) => {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end(err.message || 'TUS error');
      }
    });
  });
  expressApp.use('/api/import/tus', tusRouter);
}
