import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { NotificationsService } from '../notifications/notifications.service';
import { NOTIFICATION_RECIPIENT_ROLES } from '@tracker/shared';

@Injectable()
export class CalendarRemindersScheduler {
  constructor(
    private readonly em: EntityManager,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchDueReminders(): Promise<void> {
    const conn = this.em.getConnection();
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60_000);
    const windowEnd = new Date(now.getTime() + 60_000);

    const rows = (await conn.execute(`
      SELECT id, organization_id, trackable_id, title, start_date, due_date,
             reminder_minutes_before, assigned_to_id
      FROM workflow_items
      WHERE reminder_minutes_before IS NOT NULL
        AND cardinality(reminder_minutes_before) > 0
        AND (start_date IS NOT NULL OR due_date IS NOT NULL)
      LIMIT 500
    `)) as Array<{
      id: string;
      organization_id: string;
      trackable_id: string;
      title: string;
      start_date: Date | string | null;
      due_date: Date | string | null;
      reminder_minutes_before: number[] | null;
      assigned_to_id: string | null;
    }>;

    for (const wi of rows) {
      const offsets = wi.reminder_minutes_before;
      if (!offsets?.length) continue;
      const start = wi.start_date ? new Date(wi.start_date as string) : null;
      const due = wi.due_date ? new Date(wi.due_date as string) : null;
      const anchor = start ?? due;
      if (!anchor) continue;

      for (const minutes of offsets) {
        const fireAt = new Date(anchor.getTime() - minutes * 60_000);
        if (fireAt < windowStart || fireAt >= windowEnd) continue;

        const exists = await conn.execute(
          `SELECT 1 FROM workflow_item_reminder_dispatches
           WHERE workflow_item_id = ? AND minute_offset = ? AND scheduled_fire_at = ? LIMIT 1`,
          [wi.id, minutes, fireAt],
        );
        if (Array.isArray(exists) && exists.length > 0) continue;

        if (!wi.assigned_to_id) continue;

        const dedupeKey = `cal_rem:${wi.id}:${minutes}:${fireAt.toISOString()}`;

        await this.notifications.createFromParams(
          {
            organizationId: wi.organization_id,
            type: 'calendar_reminder',
            title: `Recordatorio: ${wi.title}`,
            message: `La actividad "${wi.title}" tiene un recordatorio (${minutes} min antes).`,
            trackableId: wi.trackable_id,
            dedupeKey,
            sourceEntityType: 'workflow_item',
            sourceEntityId: wi.id,
            recipients: [
              { userId: wi.assigned_to_id, role: NOTIFICATION_RECIPIENT_ROLES.ASSIGNEE },
            ],
          },
          { sendEmailToDirect: true },
        );

        await conn.execute(
          `INSERT INTO workflow_item_reminder_dispatches (id, workflow_item_id, minute_offset, scheduled_fire_at)
           VALUES (uuid_generate_v4(), ?, ?, ?)`,
          [wi.id, minutes, fireAt],
        );
      }
    }
  }
}
