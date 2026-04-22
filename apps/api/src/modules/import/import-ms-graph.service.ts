import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import { ImportBatch } from '@tracker/db';
import { ImportChannel } from '@tracker/shared';

const MS_SCOPE = 'Files.Read.All Sites.Read.All offline_access';

/**
 * OAuth Microsoft (OneDrive / SharePoint) + listado vía Graph para la UI.
 */
@Injectable()
export class ImportMsGraphService {
  constructor(
    private readonly config: ConfigService,
    private readonly em: EntityManager,
  ) {}

  private getTenant(): string {
    return this.config.get<string>('MICROSOFT_TENANT') || 'common';
  }

  private getMsal(): ConfidentialClientApplication {
    const clientId = this.config.get<string>('MICROSOFT_CLIENT_ID');
    const secret = this.config.get<string>('MICROSOFT_CLIENT_SECRET');
    const tenant = this.getTenant();
    if (!clientId || !secret) {
      throw new BadRequestException('MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET no configurados.');
    }
    return new ConfidentialClientApplication({
      auth: {
        clientId,
        clientSecret: secret,
        authority: `https://login.microsoftonline.com/${tenant}`,
      },
    });
  }

  async getAuthUrl(
    batchId: string,
    organizationId: string,
    redirectUri: string,
  ): Promise<string> {
    const cca = this.getMsal();
    return cca.getAuthCodeUrl({
      scopes: ['Files.Read.All', 'Sites.Read.All', 'offline_access'],
      redirectUri,
      state: Buffer.from(JSON.stringify({ batchId, organizationId })).toString('base64url'),
    });
  }

  private async tokenEndpointFetch(body: URLSearchParams): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }> {
    const tenant = this.getTenant();
    const res = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );
    const j = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !j.access_token) {
      throw new BadRequestException(
        j.error_description || j.error || 'Error al obtener token de Microsoft',
      );
    }
    return j as { access_token: string; refresh_token?: string; expires_in?: number };
  }

  async exchangeCode(
    code: string,
    redirectUri: string,
    batchId: string,
    organizationId: string,
  ): Promise<void> {
    const clientId = this.config.get<string>('MICROSOFT_CLIENT_ID')!;
    const secret = this.config.get<string>('MICROSOFT_CLIENT_SECRET')!;
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      scope: MS_SCOPE,
    });
    const tokens = await this.tokenEndpointFetch(body);
    if (!tokens.refresh_token) {
      throw new BadRequestException(
        'Microsoft no devolvió refresh_token; compruebe permisos offline_access y tipo de cuenta.',
      );
    }
    const batch = await this.em.findOne(ImportBatch, {
      id: batchId,
      organization: organizationId,
    } as any);
    if (!batch) throw new BadRequestException('Lote no encontrado');

    const expiresAt = tokens.expires_in
      ? Date.now() + tokens.expires_in * 1000
      : undefined;
    batch.config = {
      ...(batch.config || {}),
      oauth: {
        ...(batch.config as any)?.oauth,
        microsoft: {
          refreshToken: tokens.refresh_token,
          accessToken: tokens.access_token,
          expiresOn: expiresAt,
        },
      },
    };
    await this.em.flush();
  }

  async acquireAccessToken(batchId: string, organizationId: string): Promise<string> {
    const batch = await this.em.findOne(ImportBatch, {
      id: batchId,
      organization: organizationId,
    } as any);
    if (!batch) throw new BadRequestException('Lote no encontrado');
    const refresh = (batch.config as any)?.oauth?.microsoft?.refreshToken as string | undefined;
    if (!refresh) {
      throw new BadRequestException('Conecte Microsoft primero (OAuth).');
    }
    const clientId = this.config.get<string>('MICROSOFT_CLIENT_ID')!;
    const secret = this.config.get<string>('MICROSOFT_CLIENT_SECRET')!;
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      grant_type: 'refresh_token',
      refresh_token: refresh,
      scope: MS_SCOPE,
    });
    const tokens = await this.tokenEndpointFetch(body);
    if (tokens.refresh_token) {
      (batch.config as any).oauth = {
        ...(batch.config as any).oauth,
        microsoft: {
          ...(batch.config as any).oauth?.microsoft,
          refreshToken: tokens.refresh_token,
          accessToken: tokens.access_token,
          expiresOn: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
        },
      };
      await this.em.flush();
    }
    return tokens.access_token;
  }

  private async getGraphClientForBatch(
    batchId: string,
    organizationId: string,
  ): Promise<Client> {
    const access = await this.acquireAccessToken(batchId, organizationId);
    return Client.init({
      authProvider: (done) => {
        done(null, access);
      },
    });
  }

  /**
   * Lista carpetas/archivos bajo la raíz de OneDrive o de un drive de SharePoint.
   */
  async listChildren(
    batchId: string,
    organizationId: string,
    params: {
      mode: 'onedrive' | 'sharepoint';
      siteId?: string;
      parentId?: string;
    },
  ): Promise<{ id: string; name: string; folder?: boolean; size?: number }[]> {
    const batch = await this.em.findOne(ImportBatch, {
      id: batchId,
      organization: organizationId,
    } as any);
    if (!batch) throw new BadRequestException('Lote no encontrado');
    const ch = batch.channel;
    if (
      ch !== ImportChannel.OAUTH_ONEDRIVE &&
      ch !== ImportChannel.OAUTH_SHAREPOINT
    ) {
      throw new BadRequestException('El lote no es de OneDrive/SharePoint.');
    }
    const client = await this.getGraphClientForBatch(batchId, organizationId);
    const parent = params.parentId?.trim();
    let graphPath: string;
    if (params.mode === 'onedrive') {
      if (!parent || parent === 'root') {
        graphPath = '/me/drive/root/children';
      } else {
        graphPath = `/me/drive/items/${encodeURIComponent(parent)}/children`;
      }
    } else {
      const site = params.siteId?.trim();
      if (!site) {
        throw new BadRequestException('siteId requerido para SharePoint.');
      }
      const encSite = encodeURIComponent(site);
      if (!parent || parent === 'root') {
        graphPath = `/sites/${encSite}/drive/root/children`;
      } else {
        graphPath = `/sites/${encSite}/drive/items/${encodeURIComponent(parent)}/children`;
      }
    }

    const res = await client.api(graphPath).get();
    const value = (res as { value?: any[] }).value ?? [];
    const out: { id: string; name: string; folder?: boolean; size?: number }[] = [];
    for (const v of value) {
      if (!v.id || !v.name) continue;
      const folder = !!(v.folder ?? v.package);
      out.push({
        id: v.id,
        name: v.name,
        folder,
        size: typeof v.size === 'number' ? v.size : undefined,
      });
    }
    out.sort((a, b) => {
      if (a.folder !== b.folder) return a.folder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return out;
  }
}
