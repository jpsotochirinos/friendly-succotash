import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { EntityManager } from '@mikro-orm/postgresql';
import { ImportBatch } from '@tracker/db';
import { ImportChannel } from '@tracker/shared';

/**
 * OAuth Google Drive / OneDrive (Microsoft) — intercambio de código y almacenamiento en config del lote.
 * La descarga masiva se dispara desde el worker o endpoint dedicado.
 */
@Injectable()
export class ImportOAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly em: EntityManager,
  ) {}

  getGoogleDriveAuthUrl(batchId: string, organizationId: string, redirectUri: string): string {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new BadRequestException('GOOGLE_CLIENT_ID no configurado.');
    }
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      this.config.get<string>('GOOGLE_CLIENT_SECRET'),
      redirectUri,
    );
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive.readonly'],
      state: Buffer.from(JSON.stringify({ batchId, organizationId })).toString('base64url'),
    });
  }

  async exchangeGoogleCode(
    code: string,
    redirectUri: string,
    batchId: string,
    organizationId: string,
  ): Promise<void> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const secret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !secret) {
      throw new BadRequestException('Google OAuth no configurado.');
    }
    const oauth2Client = new google.auth.OAuth2(clientId, secret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);
    const batch = await this.em.findOne(ImportBatch, {
      id: batchId,
      organization: organizationId,
    } as any);
    if (!batch) throw new BadRequestException('Lote no encontrado');
    batch.channel = ImportChannel.OAUTH_DRIVE;
    batch.config = {
      ...(batch.config || {}),
      oauth: {
        ...(batch.config as any)?.oauth,
        google: {
          refreshToken: tokens.refresh_token,
          accessToken: tokens.access_token,
          expiryDate: tokens.expiry_date,
        },
      },
    };
    await this.em.flush();
  }

  /** Placeholder Microsoft Graph — URL de autorización (cliente debe registrar app Azure). */
  getMicrosoftAuthUrlPlaceholder(): { authorizeUrl: string; note: string } {
    return {
      authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      note:
        'Configure MICROSOFT_CLIENT_ID y redirect URI. Use el mismo patrón state=batchId+orgId que Google.',
    };
  }

  /** Dropbox OAuth2 authorize URL (placeholder; requiere DROPBOX_APP_KEY). */
  getDropboxAuthUrlPlaceholder(): { authorizeUrl: string; note: string } {
    return {
      authorizeUrl: 'https://www.dropbox.com/oauth2/authorize',
      note: 'Pase client_id y redirect_uri según app Dropbox.',
    };
  }
}
