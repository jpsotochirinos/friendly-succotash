import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import type {
  IWhatsAppProvider,
  InteractiveButtonsSpec,
  InteractiveListSpec,
  ParsedIncomingMessage,
} from './whatsapp-provider.interface';
import { normalizeWhatsAppPhone } from '../utils/phone.util';

function cleanSecret(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"'))
    || (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

@Injectable()
export class TwilioProvider implements IWhatsAppProvider {
  constructor(private readonly config: ConfigService) {}

  private getClient() {
    const sid = cleanSecret(this.config.get<string>('TWILIO_ACCOUNT_SID'));
    const token = cleanSecret(this.config.get<string>('TWILIO_AUTH_TOKEN'));
    if (!sid || !token) {
      throw new BadRequestException(
        'TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required for Twilio (check .env and restart API)',
      );
    }
    if (!sid.startsWith('AC')) {
      throw new BadRequestException(
        'TWILIO_ACCOUNT_SID must be the Account SID from Twilio Console (starts with AC), not an API Key (SK…)',
      );
    }
    return twilio(sid, token);
  }

  private fromNumber(): string {
    return this.config.get<string>('TWILIO_WHATSAPP_FROM') || 'whatsapp:+14155238886';
  }

  /** Origen público que Twilio usa al llamar webhooks (debe coincidir con validateRequest). */
  private webhookPublicBase(): string {
    const explicit =
      this.config.get<string>('TWILIO_WEBHOOK_BASE_URL')?.trim()
      || this.config.get<string>('APP_URL_NGROK')?.trim();
    if (explicit) return explicit.replace(/\/$/, '');
    return (this.config.get<string>('APP_URL') || 'http://localhost:3000').trim().replace(/\/$/, '');
  }

  /** Anula Status Callback inválido en Messaging Service / remitente (ej. texto "none" en consola). */
  private messageStatusCallbackUrl(): string {
    return `${this.webhookPublicBase()}/api/whatsapp/webhook/status`;
  }

  async sendMessage(to: string, body: string): Promise<string> {
    const client = this.getClient();
    const toNorm = to.startsWith('whatsapp:') ? to : `whatsapp:${normalizeWhatsAppPhone(to)}`;
    const msg = await client.messages.create({
      from: this.fromNumber(),
      to: toNorm,
      body,
      statusCallback: this.messageStatusCallbackUrl(),
    });
    return msg.sid;
  }

  async sendTemplate(to: string, templateName: string, params: string[]): Promise<string> {
    const body = [`[${templateName}]`, ...params].filter(Boolean).join('\n');
    return this.sendMessage(to, body);
  }

  async sendMedia(to: string, mediaUrl: string, caption?: string): Promise<string> {
    const client = this.getClient();
    const toNorm = to.startsWith('whatsapp:') ? to : `whatsapp:${normalizeWhatsAppPhone(to)}`;
    const msg = await client.messages.create({
      from: this.fromNumber(),
      to: toNorm,
      ...(caption?.trim() ? { body: caption.trim().slice(0, 1600) } : {}),
      mediaUrl: [mediaUrl],
      statusCallback: this.messageStatusCallbackUrl(),
    } as Parameters<typeof client.messages.create>[0]);
    return msg.sid;
  }

  private async sendContentMessage(
    to: string,
    contentSid: string,
    vars: Record<string, string>,
  ): Promise<string> {
    const client = this.getClient();
    const toNorm = to.startsWith('whatsapp:') ? to : `whatsapp:${normalizeWhatsAppPhone(to)}`;
    const msg = await client.messages.create({
      from: this.fromNumber(),
      to: toNorm,
      contentSid,
      contentVariables: JSON.stringify(vars),
      statusCallback: this.messageStatusCallbackUrl(),
    } as Parameters<typeof client.messages.create>[0]);
    return msg.sid;
  }

  async sendInteractiveList(to: string, spec: InteractiveListSpec): Promise<string> {
    const rows = spec.rows.slice(0, 10);
    const listSid = this.config.get<string>('TWILIO_LIST_CONTENT_SID')?.trim();
    if (listSid) {
      const vars: Record<string, string> = {
        body: spec.body.slice(0, 1024),
        button: (spec.buttonLabel || 'Opciones').slice(0, 20),
      };
      if (spec.footer) vars.footer = spec.footer.slice(0, 60);
      for (let i = 0; i < 10; i++) {
        const r = rows[i];
        vars[`item_${i + 1}_id`] = r?.id ?? '';
        vars[`item_${i + 1}_title`] = r?.title?.slice(0, 24) ?? '';
        // Twilio Content variable keys max 16 chars (`item_N_description` is too long).
        vars[`item_${i + 1}_desc`] = r?.description?.slice(0, 72) ?? '';
      }
      return this.sendContentMessage(to, listSid, vars);
    }
    const lines = rows.map((r, i) => `${i + 1}) ${r.title}`).join('\n');
    return this.sendMessage(
      to,
      `${spec.body}\n\n${lines}\n\nResponde con el número de la opción.`,
    );
  }

  async sendInteractiveButtons(to: string, spec: InteractiveButtonsSpec): Promise<string> {
    const buttons = spec.buttons.slice(0, 3);
    const btnSid = this.config.get<string>('TWILIO_CONFIRM_CONTENT_SID')?.trim();
    if (btnSid) {
      const vars: Record<string, string> = {
        body: spec.body.slice(0, 1024),
      };
      for (let i = 0; i < 3; i++) {
        const b = buttons[i];
        vars[`btn_${i + 1}_id`] = b?.id ?? '';
        vars[`btn_${i + 1}_title`] = b?.title?.slice(0, 20) ?? '';
      }
      return this.sendContentMessage(to, btnSid, vars);
    }
    const lines = buttons.map((b, i) => `${i + 1}) ${b.title}`).join('\n');
    return this.sendMessage(to, `${spec.body}\n\n${lines}\n\nResponde 1 o 2.`);
  }

  verifyWebhookSignature(
    payload: Buffer,
    signature: string,
    _headers?: Record<string, string>,
    webhookUrlPath: string = '/api/whatsapp/webhook',
  ): boolean {
    const token = cleanSecret(this.config.get<string>('TWILIO_AUTH_TOKEN'));
    if (!token || !signature) return false;
    const url = `${this.webhookPublicBase()}${webhookUrlPath}`;
    let params: Record<string, string> = {};
    try {
      const qs = new URLSearchParams(payload.toString('utf8'));
      qs.forEach((v, k) => {
        params[k] = v;
      });
    } catch {
      return false;
    }
    return twilio.validateRequest(token, signature, url, params);
  }

  parseIncomingMessage(raw: Record<string, unknown>): ParsedIncomingMessage | null {
    const sid =
      raw.MessageSid ??
      raw.SmsSid ??
      raw.SmsMessageSid ??
      (typeof raw.messageSid === 'string' ? raw.messageSid : undefined);
    if (!sid || typeof sid !== 'string') return null;
    const fromRaw = String(raw.From ?? '');
    const toRaw = String(raw.To ?? '');
    let interactiveReply: { id: string; title?: string } | undefined;
    const bp = raw.ButtonPayload ?? raw['ButtonPayload'];
    if (bp != null && String(bp).length) {
      interactiveReply = {
        id: String(bp),
        title: raw.ButtonText != null ? String(raw.ButtonText) : undefined,
      };
    }
    const listId = raw.ListId ?? raw['ListId'] ?? raw.ListReplyId;
    if (!interactiveReply && listId != null && String(listId).length) {
      interactiveReply = {
        id: String(listId),
        title: raw.ListTitle != null ? String(raw.ListTitle) : undefined,
      };
    }
    const rawBody = String(raw.Body ?? '');
    const body =
      rawBody.trim().length > 0 ? rawBody : interactiveReply?.title ? String(interactiveReply.title) : '';
    const numMedia = Math.min(10, Math.max(0, Number(raw.NumMedia ?? 0) || 0));
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const u = raw[`MediaUrl${i}`];
      if (typeof u === 'string' && u.length) mediaUrls.push(u);
    }
    return {
      externalId: sid,
      fromPhone: normalizeWhatsAppPhone(fromRaw),
      toPhone: normalizeWhatsAppPhone(toRaw),
      body,
      groupId: null,
      timestamp: new Date(),
      mentionsBot: /@alega\b/i.test(body),
      mediaUrls: mediaUrls.length ? mediaUrls : undefined,
      interactiveReply,
    };
  }
}
