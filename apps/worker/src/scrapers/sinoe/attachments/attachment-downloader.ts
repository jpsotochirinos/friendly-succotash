import type { Page } from 'playwright';
import * as crypto from 'crypto';

function absoluteUrl(href: string, base: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

/**
 * Descarga binario con cookies del contexto (sesión SINOE).
 */
export async function downloadWithSession(
  page: Page,
  href: string,
): Promise<{ buffer: Buffer; contentType: string | undefined }> {
  const ctx = page.context();
  const url = absoluteUrl(href, page.url());
  const res = await ctx.request.get(url, { timeout: 120_000 });
  if (!res.ok()) {
    throw new Error(`download failed ${res.status()}: ${url}`);
  }
  const buf = Buffer.from(await res.body());
  const contentType = res.headers()['content-type'];
  return { buffer: buf, contentType };
}

export function sha256Hex(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function extensionFromMime(mime: string | undefined, fallback = 'bin'): string {
  if (!mime) return fallback;
  const m = mime.split(';')[0]?.trim().toLowerCase();
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'application/zip': 'zip',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };
  return map[m || ''] || fallback;
}
