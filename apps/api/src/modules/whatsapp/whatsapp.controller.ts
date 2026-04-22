import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Post,
  Put,
  Query,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RawBodyRequest } from '@nestjs/common/interfaces';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  Organization,
  User,
  WhatsAppAccount,
  WhatsAppActivitySuggestion,
  WhatsAppEventOptIn,
  WhatsAppMessage,
  WhatsAppUser,
} from '@tracker/db';
import { WhatsAppProviderEnum, WHATSAPP_NOTIFICATION_EVENT_TYPES } from '@tracker/shared';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ConfirmPhoneDto } from './dto/confirm-phone.dto';
import { ConfirmSuggestionDto } from './dto/confirm-suggestion.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { WhatsAppAccountUpdateDto } from './dto/whatsapp-account.dto';
import { WhatsAppEventOptInBatchDto } from './dto/event-opt-in.dto';
import { WhatsAppMePreferencesDto } from './dto/whatsapp-me-preferences.dto';
import type { IWhatsAppProvider } from './providers/whatsapp-provider.interface';
import { WHATSAPP_PROVIDER } from './providers/whatsapp-provider.interface';
import { WhatsAppActivityDetectorService } from './services/whatsapp-activity-detector.service';
import { WhatsAppInboundService } from './services/whatsapp-inbound.service';
import { normalizeWhatsAppPhone } from './utils/phone.util';
import type { Request } from 'express';

@Controller('whatsapp')
export class WhatsAppController {
  private readonly log = new Logger(WhatsAppController.name);

  constructor(
    @Inject(WHATSAPP_PROVIDER) private readonly provider: IWhatsAppProvider,
    private readonly config: ConfigService,
    private readonly em: EntityManager,
    private readonly inbound: WhatsAppInboundService,
    private readonly activityDetector: WhatsAppActivityDetectorService,
  ) {}

  @Public()
  @Get('webhook')
  metaWebhookVerify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const expected = this.config.get<string>('META_WEBHOOK_VERIFY_TOKEN');
    if (mode === 'subscribe' && token && expected && token === expected) {
      return challenge || '';
    }
    throw new BadRequestException('Webhook verification failed');
  }

  @Public()
  @Post('webhook')
  async webhook(@Req() req: RawBodyRequest<Request>): Promise<{ ok: boolean }> {
    const raw: Buffer =
      req.rawBody ??
      (typeof req.body === 'object' && req.body
        ? Buffer.from(JSON.stringify(req.body))
        : Buffer.alloc(0));
    const sig =
      (req.headers['x-twilio-signature'] as string) ||
      (req.headers['x-hub-signature-256'] as string) ||
      '';
    if (!this.provider.verifyWebhookSignature(raw, sig, req.headers as Record<string, string>)) {
      this.log.warn(
        'Twilio POST /webhook: firma inválida. Twilio firma con la URL exacta del túnel. Define TWILIO_WEBHOOK_BASE_URL=https://tu-ngrok (sin barra final) o APP_URL con esa misma base.',
      );
      throw new BadRequestException('Invalid signature');
    }

    const body =
      typeof req.body === 'object' && req.body && !Buffer.isBuffer(req.body)
        ? (req.body as Record<string, unknown>)
        : Object.fromEntries(new URLSearchParams(raw.toString('utf8')));

    const parsed = this.provider.parseIncomingMessage(body);
    if (!parsed) {
      this.log.warn(
        `Twilio webhook: no se pudo parsear (falta MessageSid). Primeras claves: ${Object.keys(body).slice(0, 15).join(', ')}`,
      );
      return { ok: true };
    }

    const fork = this.em.fork();
    const to = normalizeWhatsAppPhone(parsed.toPhone);
    const account = await fork.findOne(
      WhatsAppAccount,
      {
        $or: [{ phoneNumberId: parsed.toPhone }, { phoneNumberId: to }, { displayPhone: to }],
      } as any,
      { filters: false, populate: ['organization'] },
    );
    let organizationId: string | undefined = account
      ? (account.organization as { id: string }).id
      : undefined;
    if (!organizationId) {
      const waUser = await fork.findOne(
        WhatsAppUser,
        { phoneNumber: normalizeWhatsAppPhone(parsed.fromPhone), verifiedAt: { $ne: null } } as any,
        { filters: false, populate: ['organization'] },
      );
      organizationId = waUser ? (waUser.organization as { id: string }).id : undefined;
    }
    if (!organizationId) {
      const from = normalizeWhatsAppPhone(parsed.fromPhone);
      this.log.warn(
        `WhatsApp webhook: sin organización (to=${to} from=${from}). Revisa: 1) Ajustes→WhatsApp línea displayPhone = ${to}. 2) Tu WhatsApp personal verificado en app = ${from}. 3) Webhook "al llegar mensaje" en Twilio → ${this.config.get('TWILIO_WEBHOOK_BASE_URL') || this.config.get('APP_URL')}/api/whatsapp/webhook`,
      );
      return { ok: true };
    }

    this.log.log(`WhatsApp inbound org=${organizationId} sid=${parsed.externalId}`);
    await this.inbound.handleParsedMessage(organizationId, parsed);
    return { ok: true };
  }

  /** Twilio message status (entregado, leído, fallido). Misma firma que el webhook entrante pero otra URL. */
  @Public()
  @Post('webhook/status')
  async webhookStatus(@Req() req: RawBodyRequest<Request>): Promise<{ ok: boolean }> {
    const raw: Buffer =
      req.rawBody ??
      (typeof req.body === 'object' && req.body
        ? Buffer.from(JSON.stringify(req.body))
        : Buffer.alloc(0));
    const sig = (req.headers['x-twilio-signature'] as string) || '';
    if (
      !this.provider.verifyWebhookSignature(
        raw,
        sig,
        req.headers as Record<string, string>,
        '/api/whatsapp/webhook/status',
      )
    ) {
      throw new BadRequestException('Invalid signature');
    }
    return { ok: true };
  }

  @Get('me')
  async getMe(@CurrentUser() user: { id: string; organizationId: string }) {
    const em = this.em.fork();
    em.setFilterParams('tenant', { organizationId: user.organizationId });
    const waList = await em.find(
      WhatsAppUser,
      { user: user.id },
      { orderBy: { updatedAt: 'DESC' }, limit: 1 },
    );
    const wa = waList[0];
    return {
      receiveBriefing: wa?.receiveBriefing ?? false,
      phoneVerified: Boolean(wa?.verifiedAt),
      phoneNumber: wa?.phoneNumber ?? null,
    };
  }

  @Put('me')
  async updateMePreferences(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: WhatsAppMePreferencesDto,
  ) {
    const em = this.em.fork();
    em.setFilterParams('tenant', { organizationId: user.organizationId });
    const wa = await em.findOne(WhatsAppUser, {
      user: user.id,
      verifiedAt: { $ne: null },
    });
    if (!wa) throw new BadRequestException('Vincula y verifica tu número primero');
    if (dto.receiveBriefing !== undefined) wa.receiveBriefing = dto.receiveBriefing;
    await em.persistAndFlush(wa);
    return { receiveBriefing: wa.receiveBriefing };
  }

  @Post('verify-phone')
  async verifyPhone(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: VerifyPhoneDto,
  ): Promise<{ sent: boolean }> {
    const norm = normalizeWhatsAppPhone(dto.phoneNumber);
    const provider = this.config.get<string>('WHATSAPP_PROVIDER') ?? 'twilio';
    if (provider === 'twilio') {
      const fromRaw =
        this.config.get<string>('TWILIO_WHATSAPP_FROM') || 'whatsapp:+14155238886';
      const fromNorm = normalizeWhatsAppPhone(fromRaw);
      if (norm === fromNorm) {
        throw new BadRequestException(
          'Ese número es la línea de envío de Twilio (sandbox o número de negocio), no tu WhatsApp personal. Usa tu celular en formato internacional, p. ej. +519…',
        );
      }
    }
    const em = this.em.fork();
    em.setFilterParams('tenant', { organizationId: user.organizationId });
    let wa = await em.findOne(WhatsAppUser, { user: user.id, phoneNumber: norm });
    if (wa?.lastVerificationSentAt) {
      const deltaMs = Date.now() - wa.lastVerificationSentAt.getTime();
      if (deltaMs < 60_000) {
        throw new HttpException(
          'Espera al menos 1 minuto entre envíos de código',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    if (!wa) {
      wa = em.create(WhatsAppUser, {
        user: em.getReference(User, user.id),
        phoneNumber: norm,
        verificationCode: code,
        verificationExpiresAt: expires,
        verificationAttempts: 0,
        lastVerificationSentAt: new Date(),
        organization: em.getReference(Organization, user.organizationId),
      });
    } else {
      wa.verificationCode = code;
      wa.verificationExpiresAt = expires;
      wa.lastVerificationSentAt = new Date();
      wa.verificationAttempts = (wa.verificationAttempts ?? 0) + 1;
      if (wa.verificationAttempts > 5) {
        throw new HttpException('Too many attempts for this number', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
    await em.persistAndFlush(wa);
    await this.provider.sendMessage(norm, `Tu código de verificación Alega: ${code}`);
    return { sent: true };
  }

  @Post('confirm-code')
  async confirmCode(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: ConfirmPhoneDto,
  ): Promise<{ verified: boolean }> {
    const em = this.em.fork();
    em.setFilterParams('tenant', { organizationId: user.organizationId });
    /** Varias filas por usuario (cambios de número / reintentos): hay que resolver por el código del SMS, no por findOne arbitrario. */
    const wa = await em.findOne(WhatsAppUser, {
      user: user.id,
      verificationCode: dto.code,
    });
    if (!wa) {
      throw new BadRequestException('Código inválido');
    }
    if (!wa.verificationExpiresAt || wa.verificationExpiresAt < new Date()) {
      throw new BadRequestException('Código expirado');
    }
    wa.verifiedAt = new Date();
    wa.verificationCode = undefined;
    wa.verificationExpiresAt = undefined;
    await em.persistAndFlush(wa);
    return { verified: true };
  }

  @Post('suggestion-reply')
  async suggestionReply(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: ConfirmSuggestionDto,
  ): Promise<{ ok: boolean }> {
    const em = this.em.fork();
    em.setFilterParams('tenant', { organizationId: user.organizationId });
    const s = await em.findOne(
      WhatsAppActivitySuggestion,
      { id: dto.suggestionId },
      { populate: ['suggestedTo', 'suggestedTo.user', 'relatedTrackable', 'sourceMessage'] },
    );
    if (!s) throw new BadRequestException('Suggestion not found');
    await this.activityDetector.handleSuggestionReply(s, dto.reply);
    return { ok: true };
  }

  @Get('members')
  @RequirePermissions('org:manage')
  async listMembers(@CurrentUser() user: { organizationId: string }) {
    const em = this.em.fork();
    em.setFilterParams('tenant', { organizationId: user.organizationId });
    const rows = await em.find(
      WhatsAppUser,
      { verifiedAt: { $ne: null } },
      { populate: ['user'] },
    );
    return rows.map((w) => ({
      id: w.id,
      phoneNumber: w.phoneNumber,
      receiveBriefing: w.receiveBriefing,
      userId: typeof w.user === 'string' ? w.user : w.user.id,
      email: typeof w.user === 'object' && w.user ? (w.user as User).email : null,
    }));
  }

  @Get('messages/recent')
  @RequirePermissions('org:manage')
  async recentMessages(@CurrentUser() user: { organizationId: string }) {
    const em = this.em.fork();
    em.setFilterParams('tenant', { organizationId: user.organizationId });
    const since = new Date(Date.now() - 24 * 3600000);
    return em.find(
      WhatsAppMessage,
      { timestamp: { $gte: since } },
      { orderBy: { timestamp: 'DESC' }, limit: 50 },
    );
  }

  @Get('event-opt-in')
  async getEventOptIn(@CurrentUser() user: { id: string; organizationId: string }) {
    const em = this.em.fork();
    const rows = await em.find(
      WhatsAppEventOptIn,
      { user: user.id, organization: user.organizationId } as any,
      { filters: false },
    );
    const wa = await em.findOne(
      WhatsAppUser,
      { user: user.id, organization: user.organizationId } as any,
      { filters: false },
    );
    const map = new Map(rows.map((r) => [r.eventType, r.enabled]));
    return WHATSAPP_NOTIFICATION_EVENT_TYPES.map((eventType) => {
      let enabled = true;
      if (map.has(eventType)) {
        enabled = map.get(eventType)!;
      } else if (eventType === 'briefing') {
        enabled = Boolean(wa?.receiveBriefing);
      }
      return { eventType, enabled };
    });
  }

  @Put('event-opt-in')
  async putEventOptIn(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: WhatsAppEventOptInBatchDto,
  ) {
    const em = this.em.fork();
    for (const item of dto.items) {
      let row = await em.findOne(
        WhatsAppEventOptIn,
        {
          user: user.id,
          organization: user.organizationId,
          eventType: item.eventType,
        } as any,
        { filters: false },
      );
      if (!row) {
        row = em.create(WhatsAppEventOptIn, {
          organization: em.getReference(Organization, user.organizationId),
          user: em.getReference(User, user.id),
          eventType: item.eventType,
          enabled: item.enabled,
        } as any);
        em.persist(row);
      } else {
        row.enabled = item.enabled;
      }
      if (item.eventType === 'briefing') {
        const waUser = await em.findOne(
          WhatsAppUser,
          { user: user.id, organization: user.organizationId } as any,
          { filters: false },
        );
        if (waUser) {
          waUser.receiveBriefing = item.enabled;
        }
      }
    }
    await em.flush();
    return { ok: true };
  }

  @Get('account')
  async getAccount(@CurrentUser() user: { organizationId: string }) {
    const em = this.em.fork();
    em.setFilterParams('tenant', { organizationId: user.organizationId });
    const org = await em.findOne(Organization, { id: user.organizationId }, { filters: false });
    const notif = (org?.settings as Record<string, unknown> | undefined)?.notifications as
      | Record<string, unknown>
      | undefined;
    const notificationsEnabled =
      notif && typeof notif.whatsappEnabled === 'boolean' ? notif.whatsappEnabled : true;

    const acc = await em.findOne(WhatsAppAccount, {});
    if (!acc) {
      return {
        phoneNumberId: '',
        displayPhone: '',
        provider: WhatsAppProviderEnum.TWILIO,
        groupIds: [],
        briefingCron: '0 8 * * *',
        briefingEnabled: false,
        briefingGroupId: null,
        notificationsEnabled,
      };
    }
    return {
      phoneNumberId: acc.phoneNumberId,
      displayPhone: acc.displayPhone,
      provider: acc.provider,
      groupIds: acc.groupIds ?? [],
      briefingCron: acc.briefingCron,
      briefingEnabled: acc.briefingEnabled,
      briefingGroupId: acc.briefingGroupId ?? null,
      notificationsEnabled,
    };
  }

  @Put('account')
  @RequirePermissions('org:manage')
  async putAccount(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: WhatsAppAccountUpdateDto,
  ) {
    const em = this.em.fork();
    em.setFilterParams('tenant', { organizationId: user.organizationId });
    const displayNorm = normalizeWhatsAppPhone(dto.displayPhone);
    let phoneNumberId = dto.phoneNumberId?.trim();
    if (!phoneNumberId) {
      if (dto.provider === WhatsAppProviderEnum.META) {
        throw new BadRequestException(
          'phoneNumberId es obligatorio con el proveedor Meta (ID del número en Graph API)',
        );
      }
      phoneNumberId = displayNorm;
    }
    let acc = await em.findOne(WhatsAppAccount, {});
    if (!acc) {
      acc = em.create(WhatsAppAccount, {
        phoneNumberId,
        displayPhone: displayNorm,
        provider: dto.provider,
        groupIds: dto.groupIds,
        briefingCron: dto.briefingCron ?? '0 8 * * *',
        briefingEnabled: dto.briefingEnabled ?? false,
        briefingGroupId: dto.briefingGroupId,
        organization: em.getReference(Organization, user.organizationId),
      });
    } else {
      acc.phoneNumberId = phoneNumberId;
      acc.displayPhone = displayNorm;
      acc.provider = dto.provider;
      if (dto.groupIds !== undefined) acc.groupIds = dto.groupIds;
      if (dto.briefingCron !== undefined) acc.briefingCron = dto.briefingCron;
      if (dto.briefingEnabled !== undefined) acc.briefingEnabled = dto.briefingEnabled;
      if (dto.briefingGroupId !== undefined) acc.briefingGroupId = dto.briefingGroupId;
    }
    if (dto.notificationsEnabled !== undefined) {
      const org = await em.findOne(Organization, { id: user.organizationId }, { filters: false });
      if (org) {
        const s = { ...(org.settings || {}) } as Record<string, unknown>;
        const n = { ...((s.notifications as Record<string, unknown>) || {}) };
        n.whatsappEnabled = dto.notificationsEnabled;
        s.notifications = n;
        org.settings = s;
        em.persist(org);
      }
    }
    await em.persistAndFlush(acc);
    return this.getAccount(user);
  }
}
