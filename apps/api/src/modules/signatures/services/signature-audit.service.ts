import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { Request } from 'express';
import { SignatureEvent, SignatureRequestSigner } from '@tracker/db';
import { SignatureEventType } from '@tracker/shared';

function clientIp(req?: Request | null): string {
  if (!req) return '0.0.0.0';
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) {
    return xf.split(',')[0]!.trim();
  }
  return req.ip || '0.0.0.0';
}

function clientUa(req?: Request | null): string {
  if (!req) return '';
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : '';
}

@Injectable()
export class SignatureAuditService {
  constructor(private readonly em: EntityManager) {}

  async record(
    organizationId: string,
    signer: SignatureRequestSigner,
    type: SignatureEventType,
    req: Request | null | undefined,
    extra?: Partial<Pick<SignatureEvent, 'otpVerifiedAt' | 'documentHash' | 'metadata' | 'eventAt'>>,
  ): Promise<void> {
    const ev = this.em.create(SignatureEvent, {
      organization: organizationId,
      signer,
      eventType: type,
      ipAddress: clientIp(req ?? null),
      userAgent: clientUa(req ?? null) || 'unknown',
      eventAt: extra?.eventAt ?? new Date(),
      otpVerifiedAt: extra?.otpVerifiedAt,
      documentHash: extra?.documentHash,
      metadata: extra?.metadata,
    } as any);
    await this.em.persistAndFlush(ev);
  }
}
