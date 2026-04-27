import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Intento de sellado TSA (RFC 3161) — best effort; el flujo de firma continúa si falla.
 */
@Injectable()
export class SignatureTsaService {
  private readonly log = new Logger(SignatureTsaService.name);
  private readonly tsaUrl: string;

  constructor(private readonly config: ConfigService) {
    this.tsaUrl = this.config.get<string>('TSA_URL', 'https://freetsa.org/tsr');
  }

  /**
   * @returns respuesta TSR en base64, o `null` si no se pudo contactar o completar
   */
  async requestTimestamp(_documentHashHex: string): Promise<string | null> {
    // Implementación completa requiere ASN.1 TimeStampRequest; el sellado se hace en el worker
    // (openssl) cuando esté disponible. La API deja un stub.
    this.log.debug(`TSA URL configurada: ${this.tsaUrl} (procesado en worker)`);
    return null;
  }
}
