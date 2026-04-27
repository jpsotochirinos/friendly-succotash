import { createHash } from 'node:crypto';
import { Worker, type Job } from 'bullmq';
import type { MikroORM } from '@mikro-orm/core';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as QRCode from 'qrcode';
import {
  Organization,
  SignatureRequest,
  SignatureRequestSigner,
  User,
} from '@tracker/db';
import { SignatureRequestStatus, SignerStatus } from '@tracker/shared';
import { signatureCompletedTemplate } from '@tracker/email';
import { getRedisConnection } from '../config/redis';
import { sendPlainEmail } from '../utils/mailer';

function appBase(): string {
  return (process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(
    /\/$/,
    '',
  );
}

async function appendRegistry(
  pdfBytes: Buffer,
  request: SignatureRequest,
  signers: SignatureRequestSigner[],
  org: Organization,
  documentHashAfter: string,
  publicUrl: string,
): Promise<Buffer> {
  const doc = await PDFDocument.load(pdfBytes);
  const first = doc.getPage(0);
  const { width, height } = first.getSize();
  const page = doc.addPage([width, height]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 40;
  let y = height - margin;
  const line = (text: string, size = 10, bold = false) => {
    page.drawText(text.substring(0, 500), {
      x: margin,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0, 0, 0),
      maxWidth: width - 2 * margin,
    });
    y -= size + 4;
  };
  line('REGISTRO ELECTRÓNICO DE FIRMAS — ALEGA', 12, true);
  y -= 4;
  line(`Documento: ${request.title}`);
  line(`Estudio: ${(org as any).name ?? '—'}`);
  line(`Hash SHA-256: ${documentHashAfter}`);
  line('Sellado TSA: (ver metadata del sistema o endpoint de verificación)', 8);
  y -= 6;
  const done = signers
    .filter((s) => s.status === SignerStatus.SIGNED)
    .sort((a, b) => a.signerOrder - b.signerOrder);
  for (const s of done) {
    const name = s.externalName
      || (s.user && typeof s.user === 'object'
        ? [((s.user as User).firstName), ((s.user as User).lastName)].filter(Boolean).join(' ').trim()
        || (s.user as User).email
        : '—');
    const when = s.signedAt ? s.signedAt.toISOString() : '—';
    line(`• ${name} — ${when} — OTP: sí`, 9);
  }
  const verifyPath = `${publicUrl}/verify-req/${request.id}`;
  y -= 6;
  line(`Verificar: ${verifyPath}`, 8);
  const qrPng = await QRCode.toBuffer(verifyPath, { type: 'png', width: 120, margin: 1 });
  const qimg = await doc.embedPng(qrPng);
  const qw = 100;
  page.drawImage(qimg, { x: width - margin - qw, y: margin, width: qw, height: qw });
  return Buffer.from(await doc.save());
}

export function createSignaturesFinalizeWorker(orm: MikroORM) {
  return new Worker(
    'signatures-finalize',
    async (job: Job) => {
      const { requestId, tenantId } = job.data as { requestId: string; tenantId: string };
      const em = orm.em.fork();
      em.setFilterParams('tenant', { organizationId: tenantId });
      const req = await em.findOne(
        SignatureRequest,
        { id: requestId, organization: tenantId },
        { populate: ['document', 'signers', 'signers.user', 'organization'] },
      );
      if (!req || !req.document) {
        return { skipped: true };
      }
      if (req.status === SignatureRequestStatus.COMPLETED) {
        return { skipped: true, idempotent: true };
      }

      const doc = req.document;
      const key = doc.pdfMinioKey;
      if (!key) throw new Error('document.pdfMinioKey faltante');

      const { Client: MinioClient } = await import('minio');
      const minio = new MinioClient({
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: Number(process.env.MINIO_PORT) || 9000,
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      });
      const bucket = process.env.MINIO_BUCKET || 'tracker-storage';
      const stream = await minio.getObject(bucket, key);
      const ch: Buffer[] = [];
      for await (const c of stream) {
        ch.push(Buffer.from(c));
      }
      const pdfIn = Buffer.concat(ch);
      const baseHash = createHash('sha256').update(pdfIn).digest('hex');
      const publicBase = appBase();
      const org = req.organization as Organization;
      const outPdf = await appendRegistry(
        pdfIn,
        req,
        req.signers.getItems(),
        org,
        baseHash,
        publicBase,
      );
      const documentHashAfter = createHash('sha256').update(outPdf).digest('hex');

      const finalKey = `signed-documents/${tenantId}/${requestId}/signed.pdf`;
      await minio.putObject(bucket, finalKey, outPdf, outPdf.length, { 'Content-Type': 'application/pdf' });

      req.status = SignatureRequestStatus.COMPLETED;
      req.completedAt = new Date();
      req.documentSignedKey = finalKey;
      req.documentHashAfter = documentHashAfter;
      if (doc) doc.lockedForSigning = false;
      await em.flush();

      const presign = await minio.presignedGetObject(bucket, finalKey, 7 * 24 * 3600);
      const orgName = (org as any)?.name ?? 'Alega';
      const creator = await em.findOne(User, { id: (req.createdBy as any)?.id });
      if (creator?.email) {
        const html = signatureCompletedTemplate(req.title, presign, orgName);
        await sendPlainEmail({
          to: creator.email,
          subject: `Documento firmado: ${req.title} — Alega`,
          html,
        });
      }
      for (const s of req.signers.getItems()) {
        const email = s.externalEmail
          || (s.user
            ? (await em.findOne(User, { id: (s.user as User).id }))?.email
            : null);
        if (email) {
          const html = signatureCompletedTemplate(req.title, presign, orgName);
          await sendPlainEmail({ to: email, subject: `Documento firmado: ${req.title} — Alega`, html });
        }
      }

      return { documentHashAfter };
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );
}
