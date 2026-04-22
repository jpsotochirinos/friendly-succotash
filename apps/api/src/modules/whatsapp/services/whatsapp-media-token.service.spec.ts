import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { WhatsAppMediaTokenService } from './whatsapp-media-token.service';

function cfg(secret: string, ttl = '600'): ConfigService {
  return {
    get: (k: string) => {
      if (k === 'WHATSAPP_MEDIA_SECRET') return secret;
      if (k === 'WHATSAPP_MEDIA_TTL_SECONDS') return ttl;
      return undefined;
    },
  } as unknown as ConfigService;
}

describe('WhatsAppMediaTokenService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('signs and verifies', () => {
    const s = new WhatsAppMediaTokenService(cfg('whats-app-media-secret-key-32b'));
    const t = s.sign({ documentId: 'd1', organizationId: 'o1', ttlSec: 120 });
    expect(s.verify(t)).toEqual({ ok: true, documentId: 'd1', organizationId: 'o1' });
  });

  it('rejects tampered token', () => {
    const s = new WhatsAppMediaTokenService(cfg('whats-app-media-secret-key-32b'));
    const t = s.sign({ documentId: 'd1', organizationId: 'o1' });
    const tampered = `${t.slice(0, -8)}abcdefgh`;
    expect(s.verify(tampered)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects expired token', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'));
    const s = new WhatsAppMediaTokenService(cfg('whats-app-media-secret-key-32b'));
    const t = s.sign({ documentId: 'd1', organizationId: 'o1', ttlSec: 60 });
    vi.setSystemTime(new Date('2025-06-01T12:00:30Z'));
    expect(s.verify(t)).toEqual({ ok: true, documentId: 'd1', organizationId: 'o1' });
    vi.setSystemTime(new Date('2025-06-01T12:02:00Z'));
    expect(s.verify(t)).toEqual({ ok: false, reason: 'expired' });
  });

  it('sign throws if secret missing', () => {
    const s = new WhatsAppMediaTokenService(cfg(''));
    expect(() => s.sign({ documentId: 'd1', organizationId: 'o1' })).toThrow(
      /WHATSAPP_MEDIA_SECRET/,
    );
  });
});
