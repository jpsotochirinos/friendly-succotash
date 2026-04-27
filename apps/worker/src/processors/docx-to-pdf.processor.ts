import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { Worker, type Job } from 'bullmq';
import type { MikroORM } from '@mikro-orm/core';
import {
  createNotificationEventWithRecipients,
  Document,
  Organization,
  SignatureRequest,
  SignatureRequestSigner,
  User,
} from '@tracker/db';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_RECIPIENT_ROLES,
  SignatureMode,
  SignatureRequestStatus,
  SignerStatus,
} from '@tracker/shared';
import { signatureRequestTemplate } from '@tracker/email';
import { getRedisConnection } from '../config/redis';
import { sendPlainEmail } from '../utils/mailer';

const execFileAsync = promisify(execFile);

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function convertDocxToPdfWithGotenberg(docxBuf: Buffer, filename: string, baseUrl: string): Promise<Buffer> {
  const url = `${baseUrl.replace(/\/$/, '')}/forms/libreoffice/convert`;
  const form = new FormData();
  const blob = new Blob([new Uint8Array(docxBuf)], { type: DOCX_MIME });
  form.append('files', blob, filename || 'document.docx');
  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gotenberg ${res.status}: ${errText.slice(0, 500)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function convertDocxToPdfWithLibreOffice(
  loBin: string,
  inPath: string,
  workDir: string,
): Promise<Buffer> {
  await execFileAsync(loBin, ['--headless', '--convert-to', 'pdf', '--outdir', workDir, inPath]);
  const { readdir } = await import('node:fs/promises');
  const files = await readdir(workDir);
  const pdfName = files.find((f) => f.endsWith('.pdf'));
  if (!pdfName) throw new Error('LibreOffice no generó PDF');
  return readFile(join(workDir, pdfName));
}

function hashToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex');
}
function newToken(): { plain: string; hash: string; expires: Date } {
  const plain = randomBytes(32).toString('base64url');
  const h = 72 * 60 * 60 * 1000;
  return { plain, hash: hashToken(plain), expires: new Date(Date.now() + h) };
}

function appBase(): string {
  return (process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(
    /\/$/,
    '',
  );
}

export function createDocxToPdfWorker(orm: MikroORM) {
  return new Worker(
    'docx-to-pdf',
    async (job: Job) => {
      const { requestId, documentId, organizationId } = job.data as {
        requestId: string;
        documentId: string;
        organizationId: string;
      };
      const em = orm.em.fork();
      em.setFilterParams('tenant', { organizationId });
      const loBin = process.env.LIBREOFFICE_BIN || 'libreoffice';

      const req = await em.findOne(
        SignatureRequest,
        { id: requestId, organization: organizationId },
        { populate: ['signers', 'signers.user'] },
      );
      if (!req) {
        throw new Error('Solicitud no encontrada');
      }
      const doc = await em.findOne(
        Document,
        { id: documentId, organization: organizationId },
        { populate: ['uploadedBy'] },
      );
      if (!doc) {
        req.conversionError = 'Documento no encontrado';
        req.docxConversionPending = false;
        req.status = SignatureRequestStatus.CANCELLED;
        await em.flush();
        throw new Error('Documento no encontrado');
      }

      const toErr = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));
      const markFailed = async (e: Error): Promise<never> => {
        req.conversionError = e.message;
        req.docxConversionPending = false;
        req.status = SignatureRequestStatus.CANCELLED;
        if (doc) doc.lockedForSigning = false;
        await em.flush();
        throw e;
      };

      if (!doc.minioKey) {
        return await markFailed(new Error('Documento sin archivo en almacenamiento'));
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
      let docxBuf: Buffer;
      try {
        const stream = await minio.getObject(bucket, doc.minioKey);
        const chunks: Buffer[] = [];
        for await (const c of stream) {
          chunks.push(Buffer.from(c));
        }
        docxBuf = Buffer.concat(chunks);
      } catch (e) {
        return await markFailed(toErr(e));
      }
      const fileLabel = doc.filename || 'document.docx';
      const gotenbergBase = (process.env.GOTENBERG_URL || '').trim();

      let pdfBuf: Buffer;
      let workDir: string | null = null;
      try {
        if (gotenbergBase) {
          pdfBuf = await convertDocxToPdfWithGotenberg(docxBuf, fileLabel, gotenbergBase);
        } else {
          workDir = await mkdtemp(join(tmpdir(), 'alega-docx-'));
          const inPath = join(workDir, 'in.docx');
          await writeFile(inPath, docxBuf);
          pdfBuf = await convertDocxToPdfWithLibreOffice(loBin, inPath, workDir);
        }
      } catch (e) {
        if (workDir) {
          await rm(workDir, { recursive: true, force: true });
        }
        return await markFailed(toErr(e));
      }
      if (workDir) {
        await rm(workDir, { recursive: true, force: true });
      }

      const pdfKey = `org-${organizationId}/documents/${documentId}/signing-work.pdf`;
      try {
        await minio.putObject(bucket, pdfKey, pdfBuf, pdfBuf.length, { 'Content-Type': 'application/pdf' });
      } catch (e) {
        return await markFailed(toErr(e));
      }
      doc.pdfMinioKey = pdfKey;

      const hashBefore = createHash('sha256').update(pdfBuf).digest('hex');
      (req as any).documentHashBefore = hashBefore;
      req.status = SignatureRequestStatus.PENDING;
      req.docxConversionPending = false;
      await em.flush();

      const org = await em.findOne(Organization, { id: organizationId });
      const orgName = org?.name ?? 'Alega';
      for (const s of req.signers.getItems()) {
        if (!s.user && s.externalEmail && !s.tokenHash) {
          const t = newToken();
          s.tokenHash = t.hash;
          s.tokenExpiresAt = t.expires;
          const url = `${appBase()}/sign?token=${encodeURIComponent(t.plain)}`;
          const html = signatureRequestTemplate(url, req.title, orgName, true);
          await sendPlainEmail({ to: s.externalEmail, subject: `Firma requerida: ${req.title} — Alega`, html });
          s.status = SignerStatus.NOTIFIED;
        }
      }

      if (req.mode === SignatureMode.SEQUENTIAL) {
        const first = [...req.signers.getItems()].sort((a, b) => a.signerOrder - b.signerOrder)[0];
        if (first?.user) {
          const u = await em.findOne(User, { id: (first.user as User).id });
          if (u) {
            const url = `${appBase()}/signatures/${req.id}/sign`;
            const html = signatureRequestTemplate(url, req.title, orgName, false);
            await sendPlainEmail({ to: u.email, subject: `Solicitud de firma: ${req.title} — Alega`, html });
            await createNotificationEventWithRecipients(em as any, {
              organizationId,
              type: NOTIFICATION_TYPES.SIGNATURE_REQUEST,
              title: `Firma requerida: ${req.title}`,
              message: `Debe firmar en ${orgName}.`,
              data: { signatureRequestId: req.id, signerId: first.id },
              dedupeKey: `signature:${req.id}:signer:${first.id}:notify`,
              recipients: [{ userId: u.id, role: NOTIFICATION_RECIPIENT_ROLES.ASSIGNEE }],
              sourceEntityType: 'signature_request',
              sourceEntityId: req.id,
            });
            first.status = SignerStatus.NOTIFIED;
          }
        }
      } else {
        for (const s of req.signers.getItems()) {
          if (s.user) {
            const u = await em.findOne(User, { id: (s.user as User).id });
            if (u) {
              const url = `${appBase()}/signatures/${req.id}/sign`;
              const html = signatureRequestTemplate(url, req.title, orgName, false);
              await sendPlainEmail({ to: u.email, subject: `Solicitud de firma: ${req.title} — Alega`, html });
              await createNotificationEventWithRecipients(em as any, {
                organizationId,
                type: NOTIFICATION_TYPES.SIGNATURE_REQUEST,
                title: `Firma requerida: ${req.title}`,
                message: `Debe firmar en ${orgName}.`,
                data: { signatureRequestId: req.id, signerId: s.id },
                dedupeKey: `signature:${req.id}:signer:${s.id}:notify`,
                recipients: [{ userId: u.id, role: NOTIFICATION_RECIPIENT_ROLES.ASSIGNEE }],
                sourceEntityType: 'signature_request',
                sourceEntityId: req.id,
              });
              s.status = SignerStatus.NOTIFIED;
            }
          }
        }
      }

      await em.flush();
      return { ok: true, pdfKey, hash: hashBefore };
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );
}
