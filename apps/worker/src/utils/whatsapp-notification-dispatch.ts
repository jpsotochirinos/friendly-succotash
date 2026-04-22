import type { WhatsAppNotificationEventType } from '@tracker/shared';
import { sendTwilioWhatsAppMessage } from './twilio-whatsapp-send';

function orgWhatsAppEnabled(settings: unknown): boolean {
  if (!settings || typeof settings !== 'object') return true;
  const n = (settings as Record<string, unknown>).notifications;
  if (n && typeof n === 'object' && typeof (n as Record<string, unknown>).whatsappEnabled === 'boolean') {
    return Boolean((n as Record<string, unknown>).whatsappEnabled);
  }
  return true;
}

type Conn = { execute: (sql: string, params?: unknown[]) => Promise<unknown[]> };

/** Misma lógica que API WhatsAppNotificationDispatcher (sin Nest). */
export async function dispatchWorkerWhatsAppNotifications(
  conn: Conn,
  args: {
    organizationId: string;
    userIds: string[];
    eventType: WhatsAppNotificationEventType;
    title: string;
    message: string;
    link: string;
  },
): Promise<void> {
  const orgRows = (await conn.execute(
    `SELECT settings FROM organizations WHERE id = ? LIMIT 1`,
    [args.organizationId],
  )) as { settings: unknown }[];
  if (!orgRows.length || !orgWhatsAppEnabled(orgRows[0].settings)) return;

  const ids = [...new Set(args.userIds)].filter(Boolean);
  if (!ids.length) return;

  const placeholders = ids.map(() => '?').join(',');
  const permRows = (await conn.execute(
    `SELECT DISTINCT u.id AS id
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     INNER JOIN role_permissions rp ON rp.role_id = r.id
     INNER JOIN permissions p ON p.id = rp.permission_id AND p.code = 'whatsapp:receive_notifications'
     WHERE u.organization_id = ? AND u.id IN (${placeholders})`,
    [args.organizationId, ...ids],
  )) as { id: string }[];
  const allowed = new Set(permRows.map((r) => r.id));

  for (const userId of ids) {
    if (!allowed.has(userId)) continue;

    const optRows = (await conn.execute(
      `SELECT enabled FROM whatsapp_event_opt_in
       WHERE organization_id = ? AND user_id = ? AND event_type = ? LIMIT 1`,
      [args.organizationId, userId, args.eventType],
    )) as { enabled: boolean }[];

    let optedIn = true;
    if (optRows.length) {
      optedIn = Boolean(optRows[0].enabled);
    } else if (args.eventType === 'briefing') {
      const br = (await conn.execute(
        `SELECT receive_briefing FROM whatsapp_users
         WHERE organization_id = ? AND user_id = ? AND verified_at IS NOT NULL AND is_active = true
         LIMIT 1`,
        [args.organizationId, userId],
      )) as { receive_briefing: boolean }[];
      optedIn = br.length ? Boolean(br[0].receive_briefing) : false;
    }

    if (!optedIn) continue;

    const phones = (await conn.execute(
      `SELECT phone_number FROM whatsapp_users
       WHERE organization_id = ? AND user_id = ? AND verified_at IS NOT NULL AND is_active = true
       LIMIT 1`,
      [args.organizationId, userId],
    )) as { phone_number: string }[];
    const phone = phones[0]?.phone_number;
    if (!phone) continue;

    const body = `🔔 ${args.title}\n\n${args.message}\n\n${args.link}`;
    try {
      await sendTwilioWhatsAppMessage(phone, body);
    } catch (e) {
      console.warn('[whatsapp-notify] send failed', userId, e);
    }
  }
}
