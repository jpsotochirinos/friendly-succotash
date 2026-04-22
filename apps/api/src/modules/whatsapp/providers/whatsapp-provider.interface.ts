export interface InteractiveListRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveListSpec {
  body: string;
  footer?: string;
  buttonLabel?: string;
  rows: InteractiveListRow[];
}

export interface InteractiveButtonsSpec {
  body: string;
  buttons: Array<{ id: string; title: string }>;
}

export interface ParsedIncomingMessage {
  externalId: string;
  fromPhone: string;
  /** Número destino (línea Business / sandbox). */
  toPhone: string;
  body: string;
  groupId: string | null;
  timestamp: Date;
  /** Si el mensaje contiene @Alega (o variante). */
  mentionsBot: boolean;
  /** URLs de adjuntos (p. ej. Twilio MediaUrl0..n). */
  mediaUrls?: string[];
  /** Respuesta a botón o ítem de lista (Twilio WhatsApp interactive). */
  interactiveReply?: { id: string; title?: string };
}

export interface IWhatsAppProvider {
  sendMessage(to: string, body: string): Promise<string>;
  sendTemplate(to: string, templateName: string, params: string[]): Promise<string>;
  /** Outbound media (Twilio: `mediaUrl`). Caption maps to `body` when supported. */
  sendMedia(to: string, mediaUrl: string, caption?: string): Promise<string>;
  sendInteractiveList(to: string, spec: InteractiveListSpec): Promise<string>;
  sendInteractiveButtons(to: string, spec: InteractiveButtonsSpec): Promise<string>;
  verifyWebhookSignature(
    payload: Buffer,
    signature: string,
    headers?: Record<string, string>,
    /** Solo Twilio: path absoluto desde el origen (ej. /api/whatsapp/webhook/status). Debe coincidir con la URL firmada. */
    webhookUrlPath?: string,
  ): boolean;
  parseIncomingMessage(raw: Record<string, unknown>): ParsedIncomingMessage | null;
}

export const WHATSAPP_PROVIDER = 'WHATSAPP_PROVIDER';
