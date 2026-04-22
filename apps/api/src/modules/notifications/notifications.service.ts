import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  NotificationEvent,
  NotificationRecipient,
  createNotificationEventWithRecipients,
  type CreateNotificationEventParams,
} from '@tracker/db';
import {
  NOTIFICATION_CREATED_EVENT,
  NOTIFICATION_RECIPIENT_ROLES,
  type NotificationInboxItem,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  PaginatedResponse,
  type WhatsAppNotificationEventType,
} from '@tracker/shared';
import { EmailService } from '../../common/email/email.service';

/** Query params for GET /notifications (inbox). */
export interface ListInboxParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: string;
  trackableId?: string;
  onlyDirect?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly em: EntityManager,
    private readonly email: EmailService,
    private readonly events: EventEmitter2,
  ) {}

  async createFromParams(
    params: CreateNotificationEventParams,
    options?: {
      sendEmailToDirect?: boolean;
      /** `false` desactiva el canal WhatsApp para este evento. */
      whatsapp?: false | { eventType: WhatsAppNotificationEventType };
    },
  ): Promise<{ event: NotificationEvent; created: boolean }> {
    const result = await createNotificationEventWithRecipients(this.em, params);
    if (
      result.created
      && options?.sendEmailToDirect !== false
      && params.recipients?.length
    ) {
      await this.sendEmailsForNewEvent(result.event, params.recipients);
    }
    if (result.created) {
      await this.events.emitAsync(NOTIFICATION_CREATED_EVENT, {
        params,
        whatsapp: options?.whatsapp,
      });
    }
    return result;
  }

  private async sendEmailsForNewEvent(
    event: NotificationEvent,
    recipients: { userId: string; role: string }[],
  ): Promise<void> {
    const direct = recipients.filter((r) =>
      r.role === NOTIFICATION_RECIPIENT_ROLES.ASSIGNEE
      || r.role === NOTIFICATION_RECIPIENT_ROLES.OWNER,
    );
    if (!direct.length) return;

    const users = await this.em.find('User', { id: { $in: direct.map((r) => r.userId) } } as any, {
      fields: ['id', 'email'] as any,
    });
    const base = process.env.FRONTEND_URL || 'http://localhost:5173';
    for (const u of users as { id: string; email: string }[]) {
      try {
        await this.email.sendNotificationDigest({
          to: u.email,
          title: event.title,
          message: event.message || '',
          appUrl: base,
        });
        await this.em.getConnection().execute(
          `UPDATE notification_recipients SET email_sent_at = now()
           WHERE notification_event_id = ? AND user_id = ?`,
          [event.id, u.id],
        );
      } catch {
        /* ignore */
      }
    }
  }

  hasTrackableRead(permissions: string[]): boolean {
    return permissions.includes('trackable:read');
  }

  async getUnreadCount(userId: string, organizationId: string, permissions: string[]): Promise<number> {
    const canRead = this.hasTrackableRead(permissions);
    const conn = this.em.getConnection();
    if (!canRead) {
      const r = await conn.execute(
        `SELECT COUNT(*)::int AS c FROM notification_recipients nr
         INNER JOIN notification_events e ON e.id = nr.notification_event_id
         WHERE nr.user_id = ? AND e.organization_id = ? AND nr.is_read = false`,
        [userId, organizationId],
      );
      return Number((r[0] as { c?: number })?.c ?? 0);
    }

    const r = await conn.execute(
      `
      SELECT COUNT(*)::int AS c FROM notification_events e
      LEFT JOIN notification_recipients nr
        ON nr.notification_event_id = e.id AND nr.user_id = ?
      WHERE e.organization_id = ?
        AND (e.trackable_id IS NOT NULL OR nr.id IS NOT NULL)
        AND (
          (nr.id IS NOT NULL AND nr.is_read = false)
          OR (nr.id IS NULL AND e.trackable_id IS NOT NULL)
        )
      `,
      [userId, organizationId],
    );
    return Number((r[0] as { c?: number })?.c ?? 0);
  }

  async listInbox(
    userId: string,
    organizationId: string,
    permissions: string[],
    filters: ListInboxParams = {},
  ): Promise<PaginatedResponse<NotificationInboxItem>> {
    const canRead = this.hasTrackableRead(permissions);
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit || DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * limit;

    const cond: unknown[] = [userId, organizationId];
    let whereExtra = '';

    if (canRead && !filters.onlyDirect) {
      whereExtra += ' AND (e.trackable_id IS NOT NULL OR nr.id IS NOT NULL) ';
    } else if (canRead && filters.onlyDirect) {
      whereExtra += ` AND nr.id IS NOT NULL AND nr.role IN ('assignee', 'owner') `;
    }

    if (filters.unreadOnly) {
      if (canRead) {
        whereExtra += ` AND (
          (nr.id IS NOT NULL AND nr.is_read = false)
          OR (nr.id IS NULL AND e.trackable_id IS NOT NULL)
        )`;
      } else {
        whereExtra += ' AND nr.is_read = false ';
      }
    }
    if (filters.type) {
      whereExtra += ' AND e.type = ?';
      cond.push(filters.type);
    }
    if (filters.trackableId) {
      whereExtra += ' AND e.trackable_id = ?';
      cond.push(filters.trackableId);
    }

    const joinSql = canRead
      ? `FROM notification_events e
         LEFT JOIN trackables t ON t.id = e.trackable_id
         LEFT JOIN notification_recipients nr
           ON nr.notification_event_id = e.id AND nr.user_id = ?`
      : `FROM notification_events e
         INNER JOIN notification_recipients nr
           ON nr.notification_event_id = e.id AND nr.user_id = ?
         LEFT JOIN trackables t ON t.id = e.trackable_id`;

    const countSql = `SELECT COUNT(*)::int AS c ${joinSql}
      WHERE e.organization_id = ? ${whereExtra}`;

    const countRows = await this.em.getConnection().execute(countSql, cond);
    const total = Number((countRows[0] as { c?: number })?.c ?? 0);

    const dataSql = `
      SELECT
        e.id,
        e.type,
        e.title,
        e.message,
        e.created_at AS created_at,
        e.trackable_id,
        t.title AS trackable_title,
        e.data,
        nr.id AS recipient_id,
        nr.role AS recipient_role,
        COALESCE(nr.is_read, false) AS is_read,
        nr.read_at AS read_at
      ${joinSql}
      WHERE e.organization_id = ?
      ${whereExtra}
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const listParams = [...cond, limit, offset];
    const rows = await this.em.getConnection().execute(dataSql, listParams);

    const data: NotificationInboxItem[] = (rows as any[]).map((row) => {
      const role = row.recipient_role as string | null;
      const hasDirectRow = row.recipient_id != null;
      const isDirect =
        hasDirectRow
        && (role === NOTIFICATION_RECIPIENT_ROLES.ASSIGNEE
          || role === NOTIFICATION_RECIPIENT_ROLES.OWNER);
      const isRead = !!row.is_read;
      return {
        id: row.id,
        type: row.type,
        title: row.title,
        message: row.message ?? null,
        createdAt: new Date(row.created_at).toISOString(),
        trackableId: row.trackable_id ?? null,
        trackableTitle: row.trackable_title ?? null,
        data: row.data ?? null,
        isDirect: !!isDirect,
        recipientRole: role,
        isRead,
        readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async markEventRead(
    eventId: string,
    userId: string,
    organizationId: string,
    permissions: string[],
  ): Promise<NotificationRecipient> {
    const event = await this.em.findOne(
      NotificationEvent,
      { id: eventId, organization: organizationId },
      { populate: ['trackable'] as any },
    );
    if (!event) throw new NotFoundException('Notification event not found');

    const canRead = this.hasTrackableRead(permissions);
    let recipient = await this.em.findOne(NotificationRecipient, {
      notificationEvent: eventId,
      user: userId,
    });

    if (!recipient) {
      if (!canRead || !event.trackable) {
        throw new ForbiddenException('Cannot access this notification');
      }
      recipient = this.em.create(NotificationRecipient, {
        notificationEvent: event,
        user: this.em.getReference('User', userId) as any,
        role: NOTIFICATION_RECIPIENT_ROLES.ORG_MEMBER,
        isRead: true,
        readAt: new Date(),
      } as any);
    } else {
      recipient.isRead = true;
      recipient.readAt = new Date();
    }
    await this.em.flush();
    return recipient;
  }

  async markAllRead(userId: string, organizationId: string): Promise<void> {
    await this.em.getConnection().execute(
      `UPDATE notification_recipients nr
       SET is_read = true, read_at = now()
       FROM notification_events e
       WHERE nr.notification_event_id = e.id
         AND e.organization_id = ?
         AND nr.user_id = ?
         AND nr.is_read = false`,
      [organizationId, userId],
    );
  }
}
