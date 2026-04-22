import { Worker, Job } from 'bullmq';
import { MikroORM } from '@mikro-orm/postgresql';
import { getRedisConnection } from '../config/redis';
import {
  buildGroupBriefingText,
  buildPersonalBriefingText,
  shouldRunBriefingForCron,
} from '../utils/whatsapp-briefing-text';
import { sendTwilioWhatsAppMessage } from '../utils/twilio-whatsapp-send';

export function createWhatsAppBriefingWorker(orm: MikroORM) {
  const worker = new Worker(
    'whatsapp-briefing',
    async (job: Job<{ force?: boolean }>) => {
      const em = orm.em.fork();
      const conn = em.getConnection();
      const now = new Date();
      const force = Boolean(job.data?.force);

      /** Orgs con briefing de firma activado o con al menos un usuario que pidió DM (receive_briefing). */
      const orgRows = (await conn.execute(
        `SELECT DISTINCT organization_id AS organization_id FROM (
           SELECT organization_id FROM whatsapp_accounts WHERE briefing_enabled = true
           UNION
           SELECT organization_id FROM whatsapp_users
           WHERE receive_briefing = true AND verified_at IS NOT NULL AND is_active = true
         ) u`,
      )) as { organization_id: string }[];

      type AccRow = {
        id: string;
        organization_id: string;
        briefing_cron: string;
        briefing_enabled: boolean;
        briefing_group_id: string | null;
      };

      let sent = 0;
      for (const { organization_id: orgId } of orgRows) {
        const accRows = (await conn.execute(
          `SELECT id, organization_id, briefing_cron, briefing_enabled, briefing_group_id
           FROM whatsapp_accounts WHERE organization_id = ? LIMIT 1`,
          [orgId],
        )) as AccRow[];
        const acc = accRows[0];
        const cron = acc?.briefing_cron || '0 8 * * *';
        if (!force && !shouldRunBriefingForCron(cron, now)) continue;

        const groupText = await buildGroupBriefingText(conn, orgId);
        if (acc?.briefing_enabled && acc.briefing_group_id) {
          try {
            await sendTwilioWhatsAppMessage(acc.briefing_group_id, groupText);
            sent += 1;
          } catch (e) {
            console.error('[whatsapp-briefing] group send failed', orgId, e);
          }
        }

        const users = (await conn.execute(
          `SELECT wu.user_id, wu.phone_number
           FROM whatsapp_users wu
           WHERE wu.organization_id = ?
             AND wu.receive_briefing = true
             AND wu.verified_at IS NOT NULL
             AND wu.is_active = true`,
          [orgId],
        )) as { user_id: string; phone_number: string }[];

        for (const u of users) {
          try {
            const personal = await buildPersonalBriefingText(conn, orgId, u.user_id);
            await sendTwilioWhatsAppMessage(u.phone_number, personal);
            sent += 1;
          } catch (e) {
            console.error('[whatsapp-briefing] dm send failed', orgId, u.user_id, e);
          }
        }
      }

      await job.updateProgress(100);
      return { tenants: orgRows.length, sent };
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job, r) => console.log('[whatsapp-briefing]', job.id, r));
  worker.on('failed', (job, err) => console.error('[whatsapp-briefing] failed', job?.id, err));

  return worker;
}
