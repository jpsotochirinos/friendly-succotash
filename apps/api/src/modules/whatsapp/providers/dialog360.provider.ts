import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  IWhatsAppProvider,
  InteractiveButtonsSpec,
  InteractiveListSpec,
  ParsedIncomingMessage,
} from './whatsapp-provider.interface';

@Injectable()
export class Dialog360Provider implements IWhatsAppProvider {
  constructor(private readonly _config: ConfigService) {}

  async sendMessage(_to: string, _body: string): Promise<string> {
    // TODO: implementar en Fase 2
    throw new NotImplementedException('360dialog provider — Fase 2');
  }

  async sendTemplate(_to: string, _templateName: string, _params: string[]): Promise<string> {
    // TODO: implementar en Fase 2
    throw new NotImplementedException('360dialog provider — Fase 2');
  }

  async sendMedia(_to: string, _mediaUrl: string, _caption?: string): Promise<string> {
    throw new NotImplementedException('360dialog provider — send media');
  }

  async sendInteractiveList(_to: string, _spec: InteractiveListSpec): Promise<string> {
    throw new NotImplementedException('360dialog provider — interactive list');
  }

  async sendInteractiveButtons(_to: string, _spec: InteractiveButtonsSpec): Promise<string> {
    throw new NotImplementedException('360dialog provider — interactive buttons');
  }

  verifyWebhookSignature(
    _payload: Buffer,
    _signature: string,
    _headers?: Record<string, string>,
    _webhookUrlPath?: string,
  ): boolean {
    // TODO: implementar en Fase 2
    throw new NotImplementedException('360dialog provider — Fase 2');
  }

  parseIncomingMessage(_raw: Record<string, unknown>): ParsedIncomingMessage | null {
    // TODO: implementar en Fase 2
    throw new NotImplementedException('360dialog provider — Fase 2');
  }
}
