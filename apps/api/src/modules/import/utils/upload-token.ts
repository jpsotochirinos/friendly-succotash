import { createHmac, timingSafeEqual } from 'node:crypto';

export interface UploadTokenPayload {
  batchId: string;
  organizationId: string;
  sig: string;
}

function secret(): string {
  return process.env.IMPORT_UPLOAD_SECRET || process.env.JWT_SECRET || 'dev-import-secret-change-me';
}

export function createUploadToken(batchId: string, organizationId: string): string {
  const sig = createHmac('sha256', secret())
    .update(`${batchId}:${organizationId}`)
    .digest('hex');
  const payload: UploadTokenPayload = { batchId, organizationId, sig };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function verifyUploadToken(token: string): UploadTokenPayload | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as UploadTokenPayload;
    const expected = createHmac('sha256', secret())
      .update(`${parsed.batchId}:${parsed.organizationId}`)
      .digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(parsed.sig, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return parsed;
  } catch {
    return null;
  }
}
