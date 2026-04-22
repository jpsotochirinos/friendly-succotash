import { Worker, Job } from 'bullmq';
import { MikroORM } from '@mikro-orm/postgresql';
import { ActivityLog, WorkflowItem } from '@tracker/db';
import { purgeAssistantStaging } from '../jobs/purge-assistant-staging';
import { purgeExpiredImportStaging } from '../jobs/purge-import-staging';
import { DomainEvents, WorkflowStateCategory } from '@tracker/shared';
import { getRedisConnection } from '../config/redis';
import { timeTickQueue } from '../queues/time-tick.queue';

/**
 * Hourly: find items due within 24h and log due-date-near (ActivityLog).
 * API rule engine can subscribe to DB changes or a future Redis bridge.
 */
export function createTimeTickWorker(orm: MikroORM) {
  const worker = new Worker(
    'time-tick',
    async (_job: Job) => {
      const em = orm.em.fork();
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const items = await em.find(
        WorkflowItem,
        {
          dueDate: { $gte: now, $lte: in24h },
          currentState: {
            category: {
              $nin: [WorkflowStateCategory.DONE, WorkflowStateCategory.CANCELLED],
            },
          },
        } as any,
        { populate: ['trackable', 'organization', 'currentState'] as any, limit: 500, filters: false },
      );

      let logged = 0;
      for (const item of items) {
        const org = (item as any).organization?.id ?? item.organization;
        const since = new Date(now.getTime() - 23 * 60 * 60 * 1000);
        const exists = await em.count(
          ActivityLog,
          {
            entityType: 'workflow_item',
            entityId: item.id,
            action: 'due_date_near',
            createdAt: { $gte: since },
          } as any,
          { filters: false },
        );
        if (exists) continue;

        em.create(ActivityLog, {
          organization: org,
          trackable: item.trackable,
          entityType: 'workflow_item',
          entityId: item.id,
          user: undefined,
          action: 'due_date_near',
          details: {
            dueDate: item.dueDate?.toISOString(),
            event: DomainEvents.WORKFLOW_ITEM_DUE_DATE_NEAR,
          },
        } as any);
        logged++;
      }
      if (logged) await em.flush();

      const assistantPurged = await purgeAssistantStaging(em, 24);
      const importStaging = await purgeExpiredImportStaging(em);

      return {
        itemsChecked: items.length,
        logged,
        assistantPurged,
        importStaging,
      };
    },
    { connection: getRedisConnection() },
  );

  worker.on('failed', (job, err) => {
    console.error('[time-tick] job failed', job?.id, err);
  });

  return worker;
}

export async function scheduleTimeTickCron() {
  const hourly = process.env.TIME_TICK_CRON || '15 * * * *';
  await timeTickQueue.upsertJobScheduler('time-tick-hourly', { pattern: hourly }, {
    name: 'run-hourly-tick',
    data: {},
  });
  console.log(`Time tick cron: ${hourly}`);
}
