import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EntityManager } from '@mikro-orm/postgresql';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { CalendarIntegration, CalendarImportedEvent } from '@tracker/db';

type OAuthStatePayload = { sub: string; org: string; typ: 'gcal' | 'outlook' };

@Injectable()
export class CalendarIntegrationService {
  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  getGoogleOAuthUrl(userId: string, organizationId: string): string {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth not configured');
    }
    const base = this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const apiBase = this.config.get<string>('API_PUBLIC_URL') || 'http://localhost:3000';
    const redirectUri = `${apiBase.replace(/\/$/, '')}/api/calendar/integrations/google/callback`;

    const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
    const state = this.jwt.sign(
      { sub: userId, org: organizationId, typ: 'gcal' } satisfies OAuthStatePayload,
      { secret: this.config.getOrThrow<string>('JWT_SECRET'), expiresIn: '15m' },
    );

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state,
    });
  }

  async handleGoogleCallback(code: string, state: string): Promise<{ ok: boolean }> {
    let payload: OAuthStatePayload;
    try {
      payload = this.jwt.verify(state, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      }) as OAuthStatePayload;
    } catch {
      throw new BadRequestException('Invalid state');
    }
    if (payload.typ !== 'gcal') throw new BadRequestException('Invalid state type');

    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const apiBase = this.config.get<string>('API_PUBLIC_URL') || 'http://localhost:3000';
    const redirectUri = `${apiBase.replace(/\/$/, '')}/api/calendar/integrations/google/callback`;
    const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token) throw new BadRequestException('No access token');

    let row = await this.em.findOne(CalendarIntegration, {
      user: payload.sub,
      provider: 'google',
    } as any);
    if (!row) {
      row = this.em.create(CalendarIntegration, {
        user: payload.sub,
        organization: payload.org,
        provider: 'google',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        exportEnabled: true,
        importEnabled: true,
      } as any);
    } else {
      row.accessToken = tokens.access_token;
      if (tokens.refresh_token) row.refreshToken = tokens.refresh_token;
      row.expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;
    }
    await this.em.flush();
    return { ok: true };
  }

  async syncGoogleCalendar(userId: string, organizationId: string, from: string, to: string) {
    const integ = await this.em.findOne(CalendarIntegration, {
      user: userId,
      provider: 'google',
      organization: organizationId,
    } as any);
    if (!integ) throw new NotFoundException('Google calendar not connected');

    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const apiBase = this.config.get<string>('API_PUBLIC_URL') || 'http://localhost:3000';
    const redirectUri = `${apiBase.replace(/\/$/, '')}/api/calendar/integrations/google/callback`;
    const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({
      access_token: integ.accessToken,
      refresh_token: integ.refreshToken,
      expiry_date: integ.expiresAt?.getTime(),
    });

    if (integ.expiresAt && integ.expiresAt.getTime() < Date.now() + 60000 && integ.refreshToken) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      integ.accessToken = credentials.access_token!;
      integ.expiresAt = credentials.expiry_date ? new Date(credentials.expiry_date) : undefined;
      await this.em.flush();
      oauth2Client.setCredentials(credentials);
    }

    const cal = google.calendar({ version: 'v3', auth: oauth2Client });
    const res = await cal.events.list({
      calendarId: 'primary',
      timeMin: new Date(`${from}T00:00:00.000Z`).toISOString(),
      timeMax: new Date(`${to}T23:59:59.999Z`).toISOString(),
      singleEvents: true,
      maxResults: 500,
    });

    const items = res.data.items ?? [];
    for (const ev of items) {
      if (!ev.id || !ev.start || !ev.end) continue;
      const start = ev.start.dateTime
        ? new Date(ev.start.dateTime)
        : new Date(`${ev.start.date}T00:00:00.000Z`);
      const end = ev.end.dateTime
        ? new Date(ev.end.dateTime)
        : new Date(`${ev.end.date}T00:00:00.000Z`);
      const allDay = !!ev.start.date;

      let row = await this.em.findOne(CalendarImportedEvent, {
        integration: integ.id,
        externalId: ev.id,
      } as any);
      if (!row) {
        row = this.em.create(CalendarImportedEvent, {
          organization: organizationId,
          integration: integ,
          externalId: ev.id,
          title: ev.summary || '(Sin título)',
          body: ev.description ?? undefined,
          startsAt: start,
          endsAt: end,
          allDay,
          etag: ev.etag ?? undefined,
        } as any);
      } else {
        row.title = ev.summary || '(Sin título)';
        row.body = ev.description ?? undefined;
        row.startsAt = start;
        row.endsAt = end;
        row.allDay = allDay;
        row.etag = ev.etag ?? undefined;
      }
    }
    integ.lastSyncAt = new Date();
    await this.em.flush();
    return { imported: items.length };
  }

  /** Outlook / Microsoft Graph: placeholder URL (full MSAL flow in production). */
  getOutlookOAuthUrl(_userId: string, _organizationId: string): string {
    const tenant = this.config.get<string>('MICROSOFT_TENANT_ID') || 'common';
    const clientId = this.config.get<string>('MICROSOFT_CLIENT_ID');
    if (!clientId) {
      throw new BadRequestException('Microsoft OAuth not configured');
    }
    const apiBase = this.config.get<string>('API_PUBLIC_URL') || 'http://localhost:3000';
    const redirectUri = encodeURIComponent(
      `${apiBase.replace(/\/$/, '')}/api/calendar/integrations/outlook/callback`,
    );
    const scopes = encodeURIComponent('offline_access Calendars.ReadWrite User.Read');
    return (
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`
      + `?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}`
      + `&scope=${scopes}&response_mode=query`
    );
  }

  async handleOutlookCallback(_code: string, _state: string): Promise<{ ok: boolean }> {
    throw new BadRequestException('Outlook callback: configure MICROSOFT_CLIENT_ID and implement token exchange');
  }
}
