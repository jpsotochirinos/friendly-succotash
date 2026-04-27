import { Worker, Job } from 'bullmq';
import { MikroORM } from '@mikro-orm/postgresql';
import { getRedisConnection } from '../config/redis';
import {
  createNotificationEventWithRecipients,
} from '@tracker/db';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_RECIPIENT_ROLES,
  NOTIFICATION_SEVERITY,
  NOTIFICATION_SOURCE,
} from '@tracker/shared';
import { sendPlainEmail } from '../utils/mailer';
import { dispatchWorkerWhatsAppNotifications } from '../utils/whatsapp-notification-dispatch';

const UPCOMING_DAYS = Math.max(1, Number(process.env.DEADLINE_UPCOMING_DAYS || 7));

type Bucket = 'overdue' | 'due_today' | 'upcoming';

interface DeadlineRow {
  id: string;
  title: string;
  due_date: string | Date;
  assigned_to_id: string | null;
  trackable_id: string;
  trackable_owner_id: string | null;
  organization_id: string;
  trackable_title: string | null;
  /** v2 blueprint `ActivityInstance` vs legacy `WorkflowItem` */
  source: 'workflow_item' | 'activity_instance';
}

function bucketForRow(due: Date, today: Date): Bucket | null {
  const d = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = d.getTime() - t.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'due_today';
  if (diffDays > 0 && diffDays <= UPCOMING_DAYS) return 'upcoming';
  return null;
}

function buildRecipients(row: DeadlineRow): { userId: string; role: string }[] {
  const out: { userId: string; role: string }[] = [];
  if (row.assigned_to_id) {
    out.push({ userId: row.assigned_to_id, role: NOTIFICATION_RECIPIENT_ROLES.ASSIGNEE });
  }
  if (
    row.trackable_owner_id
    && row.trackable_owner_id !== row.assigned_to_id
  ) {
    out.push({ userId: row.trackable_owner_id, role: NOTIFICATION_RECIPIENT_ROLES.OWNER });
  }
  return out;
}

async function emailDirectUsers(
  em: any,
  orgId: string,
  recipients: { userId: string; role: string }[],
  title: string,
  message: string,
  eventId: string,
): Promise<void> {
  const direct = recipients.filter((r) =>
    r.role === NOTIFICATION_RECIPIENT_ROLES.ASSIGNEE
    || r.role === NOTIFICATION_RECIPIENT_ROLES.OWNER,
  );
  if (!direct.length) return;
  const ids = direct.map((r) => r.userId);
  const users = await em.find('User', { id: { $in: ids }, organization: orgId } as any, {
    fields: ['id', 'email'] as any,
    filters: false,
  });
  for (const u of users as { id: string; email: string }[]) {
    try {
      await sendPlainEmail({
        to: u.email,
        subject: title,
        html: `<p>${message.replace(/</g, '&lt;')}</p><p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">Abrir</a></p>`,
      });
      await em.getConnection().execute(
        `UPDATE notification_recipients SET email_sent_at = now()
         WHERE notification_event_id = ? AND user_id = ?`,
        [eventId, u.id],
      );
    } catch (e) {
      console.error('[deadline-notifications] email failed', e);
    }
  }
}

export function createDeadlineNotificationsWorker(orm: MikroORM) {
  const worker = new Worker(
    'deadline-notifications',
    async (job: Job) => {
      const em = orm.em.fork();
      const conn = em.getConnection();
      const today = new Date();

      const wiRows = (await conn.execute(
        `
        SELECT
          wi.id,
          wi.title,
          wi.due_date,
          wi.assigned_to_id,
          wi.trackable_id,
          t.assigned_to_id AS trackable_owner_id,
          wi.organization_id,
          t.title AS trackable_title
        FROM workflow_items wi
        INNER JOIN trackables t ON t.id = wi.trackable_id
        WHERE wi.due_date IS NOT NULL
          AND wi.current_state_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM workflow_states ws
            WHERE ws.id = wi.current_state_id
              AND ws.category NOT IN ('done', 'cancelled')
          )
          AND (
            wi.due_date < CURRENT_DATE
            OR wi.due_date = CURRENT_DATE
            OR (wi.due_date > CURRENT_DATE AND wi.due_date <= CURRENT_DATE + (?::int) * INTERVAL '1 day')
          )
        `,
        [UPCOMING_DAYS],
      )) as Omit<DeadlineRow, 'source'>[];

      const actRows = (await conn.execute(
        `
        SELECT
          ai.id,
          ai.title,
          ai.due_date,
          ai.assigned_to_id,
          pt.trackable_id,
          t.assigned_to_id AS trackable_owner_id,
          ai.organization_id,
          t.title AS trackable_title
        FROM activity_instances ai
        INNER JOIN stage_instances si ON si.id = ai.stage_instance_id
        INNER JOIN process_tracks pt ON pt.id = si.process_track_id
        INNER JOIN trackables t ON t.id = pt.trackable_id
        WHERE ai.due_date IS NOT NULL
          AND ai.is_reverted = false
          AND ai.workflow_state_category NOT IN ('done', 'cancelled')
          AND (
            ai.due_date < CURRENT_DATE
            OR ai.due_date = CURRENT_DATE
            OR (ai.due_date > CURRENT_DATE AND ai.due_date <= CURRENT_DATE + (?::int) * INTERVAL '1 day')
          )
        `,
        [UPCOMING_DAYS],
      )) as Omit<DeadlineRow, 'source'>[];

      const rows: DeadlineRow[] = [
        ...wiRows.map((r) => ({ ...r, source: 'workflow_item' as const })),
        ...actRows.map((r) => ({ ...r, source: 'activity_instance' as const })),
      ];

      let created = 0;
      const runDate = today.toISOString().slice(0, 10);

      for (const row of rows) {
        const due = new Date(row.due_date);
        const bucket = bucketForRow(due, today);
        if (!bucket) continue;

        const recipients = buildRecipients(row);
        if (!recipients.length) continue;

        const sev =
          bucket === 'overdue'
            ? NOTIFICATION_SEVERITY.OVERDUE
            : bucket === 'due_today'
              ? NOTIFICATION_SEVERITY.DUE_TODAY
              : NOTIFICATION_SEVERITY.UPCOMING;

        const dedupeKey =
          row.source === 'activity_instance'
            ? `deadline:act:${row.id}:${bucket}:${runDate}`
            : `deadline:${row.id}:${bucket}:${runDate}`;
        const dueStr = due.toISOString().slice(0, 10);
        const title =
          bucket === 'overdue'
            ? `Atrasado: ${row.title}`
            : bucket === 'due_today'
              ? `Vence hoy: ${row.title}`
              : `Próximo plazo: ${row.title}`;
        const message = row.trackable_title
          ? `${title} — expediente «${row.trackable_title}».`
          : title;

        const dataPayload: Record<string, unknown> = {
          severity: sev,
          source: NOTIFICATION_SOURCE.SCHEDULER,
          dueDate: dueStr,
        };
        if (row.source === 'activity_instance') {
          dataPayload.activityInstanceId = row.id;
        } else {
          dataPayload.workflowItemId = row.id;
        }

        const result = await createNotificationEventWithRecipients(em, {
          organizationId: row.organization_id,
          trackableId: row.trackable_id,
          type: NOTIFICATION_TYPES.DEADLINE_REMINDER,
          title,
          message,
          data: dataPayload,
          dedupeKey,
          sourceEntityType: row.source === 'activity_instance' ? 'activity_instance' : 'workflow_item',
          sourceEntityId: row.id,
          recipients,
        });

        if (result.created) {
          created += 1;
          await emailDirectUsers(
            em,
            row.organization_id,
            recipients,
            title,
            message,
            result.event.id,
          );
          const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
          const link = `${base}/trackables/${row.trackable_id}`;
          const directIds = recipients
            .filter(
              (r) =>
                r.role === NOTIFICATION_RECIPIENT_ROLES.ASSIGNEE
                || r.role === NOTIFICATION_RECIPIENT_ROLES.OWNER,
            )
            .map((r) => r.userId);
          try {
            await dispatchWorkerWhatsAppNotifications(conn, {
              organizationId: row.organization_id,
              userIds: directIds,
              eventType: 'deadlines',
              title,
              message,
              link,
            });
          } catch (e) {
            console.warn('[deadline-notifications] WhatsApp dispatch skipped', e);
          }
        }
      }

      await job.updateProgress(100);
      return { processed: rows.length, created };
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job, r) => {
    console.log('[deadline-notifications]', job.id, r);
  });
  worker.on('failed', (job, err) => {
    console.error('[deadline-notifications] failed', job?.id, err);
  });

  return worker;
}
