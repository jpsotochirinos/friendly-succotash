import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type {
  IWhatsAppProvider,
  InteractiveButtonsSpec,
  InteractiveListSpec,
  ParsedIncomingMessage,
} from './whatsapp-provider.interface';
import { normalizeWhatsAppPhone } from '../utils/phone.util';

@Injectable()
export class MetaProvider implements IWhatsAppProvider {
  constructor(private readonly config: ConfigService) {}

  async sendMessage(_to: string, _body: string): Promise<string> {
    // TODO: implementar en Fase 3 (Graph API messages)
    throw new NotImplementedException('Meta Cloud API — Fase 3');
  }

  async sendTemplate(_to: string, _templateName: string, _params: string[]): Promise<string> {
    // TODO: implementar en Fase 3
    throw new NotImplementedException('Meta Cloud API — Fase 3');
  }

  async sendMedia(_to: string, _mediaUrl: string, _caption?: string): Promise<string> {
    throw new NotImplementedException('Meta Cloud API — send media');
  }

  async sendInteractiveList(_to: string, _spec: InteractiveListSpec): Promise<string> {
    throw new NotImplementedException('Meta Cloud API — interactive list');
  }

  async sendInteractiveButtons(_to: string, _spec: InteractiveButtonsSpec): Promise<string> {
    throw new NotImplementedException('Meta Cloud API — interactive buttons');
  }

  verifyWebhookSignature(
    payload: Buffer,
    signature: string,
    headers?: Record<string, string>,
    _webhookUrlPath?: string,
  ): boolean {
    const sig = signature || headers?.['x-hub-signature-256'] || '';
    const appSecret = this.config.get<string>('META_APP_SECRET');
    if (!appSecret || !sig.startsWith('sha256=')) return false;
    const expected =
      'sha256=' + crypto.createHmac('sha256', appSecret).update(payload).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch {
      return false;
    }
  }

  parseIncomingMessage(raw: Record<string, unknown>): ParsedIncomingMessage | null {
    // TODO: implementar en Fase 3 — estructura entry/changes/messages
    try {
      const entry = (raw.entry as unknown[])?.[0] as Record<string, unknown> | undefined;
      const change = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined;
      const value = change?.value as Record<string, unknown> | undefined;
      const messages = value?.messages as unknown[] | undefined;
      const msg = messages?.[0] as Record<string, unknown> | undefined;
      if (!msg?.id) return null;
      const from = String(msg.from ?? '');
      const bodyObj = msg.text as Record<string, unknown> | undefined;
      const body = String(bodyObj?.body ?? '');
      const ts = Number(msg.timestamp);
      return {
        externalId: String(msg.id),
        fromPhone: normalizeWhatsAppPhone(from),
        toPhone: normalizeWhatsAppPhone(String((value?.metadata as Record<string, unknown>)?.display_phone_number ?? '')),
        body,
        groupId: null,
        timestamp: Number.isFinite(ts) ? new Date(ts * 1000) : new Date(),
        mentionsBot: /@alega\b/i.test(body),
        mediaUrls: undefined,
      };
    } catch {
      return null;
    }
  }
}
