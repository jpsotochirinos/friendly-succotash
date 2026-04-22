import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export type WhatsAppMediaVerifyResult =
  | { ok: true; documentId: string; organizationId: string }
  | { ok: false; reason: 'invalid' | 'expired' };

@Injectable()
export class WhatsAppMediaTokenService {
  constructor(private readonly config: ConfigService) {}

  sign(opts: { documentId: string; organizationId: string; ttlSec?: number }): string {
    const secret = this.config.get<string>('WHATSAPP_MEDIA_SECRET')?.trim();
    if (!secret) {
      throw new Error('WHATSAPP_MEDIA_SECRET is required to sign WhatsApp media URLs');
    }
    const defaultTtl = Number(this.config.get('WHATSAPP_MEDIA_TTL_SECONDS')) || 600;
    const ttl = opts.ttlSec ?? (Number.isFinite(defaultTtl) ? defaultTtl : 600);
    const exp = Math.floor(Date.now() / 1000) + Math.max(30, ttl);
    const payload = JSON.stringify({ d: opts.documentId, o: opts.organizationId, exp });
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
    return `${payloadB64}.${sig}`;
  }

  verify(token: string | undefined): WhatsAppMediaVerifyResult {
    const secret = this.config.get<string>('WHATSAPP_MEDIA_SECRET')?.trim();
    if (!secret || !token?.includes('.')) {
      return { ok: false, reason: 'invalid' };
    }
    const i = token.lastIndexOf('.');
    const payloadB64 = token.slice(0, i);
    const sig = token.slice(i + 1);
    let payload: string;
    try {
      payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
    } catch {
      return { ok: false, reason: 'invalid' };
    }
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    try {
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
        return { ok: false, reason: 'invalid' };
      }
    } catch {
      return { ok: false, reason: 'invalid' };
    }
    let data: { d?: string; o?: string; exp?: number };
    try {
      data = JSON.parse(payload) as { d?: string; o?: string; exp?: number };
    } catch {
      return { ok: false, reason: 'invalid' };
    }
    if (!data.d || !data.o || typeof data.exp !== 'number') {
      return { ok: false, reason: 'invalid' };
    }
    if (Math.floor(Date.now() / 1000) > data.exp) {
      return { ok: false, reason: 'expired' };
    }
    return { ok: true, documentId: data.d, organizationId: data.o };
  }
}
