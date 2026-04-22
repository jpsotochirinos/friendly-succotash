import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import type { CreateNotificationEventParams } from '@tracker/db';
import {
  Organization,
  User,
  WhatsAppEventOptIn,
  WhatsAppUser,
} from '@tracker/db';
import {
  type WhatsAppNotificationEventType,
  notificationTypeToWhatsAppEventType,
} from '@tracker/shared';
import { WhatsAppNotificationService } from './whatsapp-notification.service';

function orgWhatsAppNotificationsEnabled(settings: Record<string, unknown> | undefined): boolean {
  const n = settings?.notifications as Record<string, unknown> | undefined;
  if (n && typeof n.whatsappEnabled === 'boolean') return n.whatsappEnabled;
  return true;
}

export type NotificationCreatedWhatsAppPayload = {
  params: CreateNotificationEventParams;
  whatsapp?: false | { eventType: WhatsAppNotificationEventType };
};

@Injectable()
export class WhatsAppNotificationDispatcher {
  private readonly log = new Logger(WhatsAppNotificationDispatcher.name);

  constructor(
    private readonly em: EntityManager,
    private readonly notify: WhatsAppNotificationService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Llamado desde el listener de `notification.created`.
   * No envía si la org deshabilitó el canal, el usuario no tiene permiso, opt-in off o sin WhatsApp verificado.
   */
  async dispatchFromNotification(payload: NotificationCreatedWhatsAppPayload): Promise<void> {
    const { params, whatsapp } = payload;
    if (whatsapp === false) return;

    const eventType: WhatsAppNotificationEventType | null =
      whatsapp?.eventType ?? notificationTypeToWhatsAppEventType(params.type);

    if (!eventType) return;

    const org = await this.em.findOne(Organization, { id: params.organizationId }, { filters: false });
    if (!org || !orgWhatsAppNotificationsEnabled(org.settings as Record<string, unknown>)) return;

    const baseUrl = (this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173').replace(
      /\/?$/,
      '',
    );
    const link =
      params.trackableId != null
        ? `${baseUrl}/trackables/${params.trackableId}`
        : baseUrl;

    const uniqueUserIds = [...new Set(params.recipients.map((r) => r.userId))];

    for (const userId of uniqueUserIds) {
      try {
        await this.sendOneUser({
          organizationId: params.organizationId,
          userId,
          eventType,
          title: params.title,
          message: params.message || '',
          link,
        });
      } catch (e) {
        this.log.warn(
          `WhatsApp notify skip/fail user=${userId} org=${params.organizationId}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }
  }

  private async sendOneUser(args: {
    organizationId: string;
    userId: string;
    eventType: WhatsAppNotificationEventType;
    title: string;
    message: string;
    link: string;
  }): Promise<void> {
    const { organizationId, userId, eventType, title, message, link } = args;
    const em = this.em.fork();

    const user = await em.findOne(
      User,
      { id: userId, organization: organizationId },
      { populate: ['role', 'role.permissions'] as any, filters: false },
    );
    if (!user) return;
    const perms = user.role?.permissions?.getItems?.().map((p) => p.code) ?? [];
    if (!perms.includes('whatsapp:receive_notifications')) return;

    const enabled = await this.resolveOptIn(em, organizationId, userId, eventType);
    if (!enabled) return;

    const wa = await em.findOne(
      WhatsAppUser,
      {
        user: userId,
        organization: organizationId,
        verifiedAt: { $ne: null },
        isActive: true,
      } as any,
      { filters: false },
    );
    if (!wa) return;

    const body = `🔔 ${title}\n\n${message}\n\n${link}`;
    await this.notify.send(organizationId, wa.phoneNumber, body);
  }

  private async resolveOptIn(
    em: EntityManager,
    organizationId: string,
    userId: string,
    eventType: WhatsAppNotificationEventType,
  ): Promise<boolean> {
    const row = await em.findOne(
      WhatsAppEventOptIn,
      { user: userId, organization: organizationId, eventType } as any,
      { filters: false },
    );
    if (row) return row.enabled;

    if (eventType === 'briefing') {
      const wa = await em.findOne(
        WhatsAppUser,
        {
          user: userId,
          organization: organizationId,
          verifiedAt: { $ne: null },
          isActive: true,
        } as any,
        { filters: false },
      );
      return Boolean(wa?.receiveBriefing);
    }

    return true;
  }
}
