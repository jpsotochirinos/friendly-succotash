import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  IWhatsAppProvider,
  InteractiveButtonsSpec,
  InteractiveListSpec,
} from '../providers/whatsapp-provider.interface';
import { WHATSAPP_PROVIDER } from '../providers/whatsapp-provider.interface';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  User,
  WhatsAppAccount,
  WhatsAppUser,
} from '@tracker/db';
import { normalizeWhatsAppPhone } from '../utils/phone.util';

@Injectable()
export class WhatsAppNotificationService {
  private readonly logger = new Logger(WhatsAppNotificationService.name);
  /** Rate: último envío por clave org+destino (ms). */
  private readonly lastSent = new Map<string, number>();
  private readonly failureCount = new Map<string, number>();

  constructor(
    @Inject(WHATSAPP_PROVIDER) private readonly provider: IWhatsAppProvider,
    private readonly em: EntityManager,
  ) {}

  private minIntervalMs(): number {
    return 1200;
  }

  async sendList(organizationId: string, to: string, spec: InteractiveListSpec): Promise<void> {
    const key = `${organizationId}:${normalizeWhatsAppPhone(to)}`;
    const now = Date.now();
    const last = this.lastSent.get(key) ?? 0;
    const gap = this.minIntervalMs();
    if (now - last < gap) {
      await new Promise((r) => setTimeout(r, gap - (now - last)));
    }
    try {
      await this.provider.sendInteractiveList(to, spec);
      this.lastSent.set(key, Date.now());
      this.failureCount.set(organizationId, 0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`sendList failed org=${organizationId}: ${msg}`);
      const n = (this.failureCount.get(organizationId) ?? 0) + 1;
      this.failureCount.set(organizationId, n);
      throw e;
    }
  }

  async sendButtons(organizationId: string, to: string, spec: InteractiveButtonsSpec): Promise<void> {
    const key = `${organizationId}:${normalizeWhatsAppPhone(to)}`;
    const now = Date.now();
    const last = this.lastSent.get(key) ?? 0;
    const gap = this.minIntervalMs();
    if (now - last < gap) {
      await new Promise((r) => setTimeout(r, gap - (now - last)));
    }
    try {
      await this.provider.sendInteractiveButtons(to, spec);
      this.lastSent.set(key, Date.now());
      this.failureCount.set(organizationId, 0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`sendButtons failed org=${organizationId}: ${msg}`);
      const n = (this.failureCount.get(organizationId) ?? 0) + 1;
      this.failureCount.set(organizationId, n);
      throw e;
    }
  }

  async sendMedia(
    organizationId: string,
    to: string,
    mediaUrl: string,
    caption?: string,
  ): Promise<void> {
    const key = `${organizationId}:${normalizeWhatsAppPhone(to)}`;
    const now = Date.now();
    const last = this.lastSent.get(key) ?? 0;
    const gap = this.minIntervalMs();
    if (now - last < gap) {
      await new Promise((r) => setTimeout(r, gap - (now - last)));
    }
    try {
      await this.provider.sendMedia(to, mediaUrl, caption);
      this.lastSent.set(key, Date.now());
      this.failureCount.set(organizationId, 0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`sendMedia failed org=${organizationId}: ${msg}`);
      const n = (this.failureCount.get(organizationId) ?? 0) + 1;
      this.failureCount.set(organizationId, n);
      throw e;
    }
  }

  async send(organizationId: string, to: string, body: string): Promise<void> {
    const key = `${organizationId}:${normalizeWhatsAppPhone(to)}`;
    const now = Date.now();
    const last = this.lastSent.get(key) ?? 0;
    const gap = this.minIntervalMs();
    if (now - last < gap) {
      await new Promise((r) => setTimeout(r, gap - (now - last)));
    }
    try {
      await this.provider.sendMessage(to, body);
      this.lastSent.set(key, Date.now());
      this.failureCount.set(organizationId, 0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`send failed org=${organizationId}: ${msg}`);
      const n = (this.failureCount.get(organizationId) ?? 0) + 1;
      this.failureCount.set(organizationId, n);
      throw e;
    }
  }

  async sendBriefingGroup(organizationId: string, text: string): Promise<void> {
    const em = this.em.fork();
    em.setFilterParams('tenant', { organizationId });
    const account = await em.findOne(WhatsAppAccount, {});
    if (!account?.briefingEnabled || !account.briefingGroupId) return;
    await this.send(organizationId, account.briefingGroupId, text);
  }

  /** Teléfono WhatsApp verificado del usuario en la org, o null. */
  async findVerifiedPhoneForUser(organizationId: string, userId: string): Promise<string | null> {
    const wa = await this.em.fork().findOne(
      WhatsAppUser,
      {
        organization: organizationId,
        user: userId,
        verifiedAt: { $ne: null },
        isActive: true,
      } as any,
      { filters: false },
    );
    return wa?.phoneNumber ?? null;
  }

  async sendBriefingDM(organizationId: string, userId: string, text: string): Promise<void> {
    const em = this.em.fork();
    em.setFilterParams('tenant', { organizationId });
    const wa = await em.findOne(WhatsAppUser, {
      user: userId,
      receiveBriefing: true,
      verifiedAt: { $ne: null },
      isActive: true,
    });
    if (!wa) return;
    await this.send(organizationId, wa.phoneNumber, text);
  }

  /** Resuelve permisos JWT-like para un WhatsAppUser. */
  async resolveJwtShapeForWhatsAppUser(waUser: WhatsAppUser): Promise<{
    id: string;
    organizationId: string;
    permissions: string[];
    roleName?: string;
  } | null> {
    const em = this.em.fork();
    const user = await em.findOne(
      User,
      { id: typeof waUser.user === 'string' ? waUser.user : waUser.user.id },
      { populate: ['role', 'role.permissions'] as any, filters: false },
    );
    if (!user) return null;
    const perms = user.role?.permissions?.getItems?.().map((p) => p.code) ?? [];
    const orgId =
      typeof user.organization === 'string'
        ? user.organization
        : (user.organization as { id: string }).id;
    return {
      id: user.id,
      organizationId: orgId,
      permissions: perms,
      roleName: user.role?.name,
    };
  }
}
