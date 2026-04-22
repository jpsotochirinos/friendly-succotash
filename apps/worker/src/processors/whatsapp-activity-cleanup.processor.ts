import { Worker, Job } from 'bullmq';
import { MikroORM } from '@mikro-orm/postgresql';
import { getRedisConnection } from '../config/redis';

export function createWhatsAppActivityCleanupWorker(orm: MikroORM) {
  const worker = new Worker(
    'whatsapp-activity-cleanup',
    async (job: Job) => {
      const conn = orm.em.fork().getConnection();
      await conn.execute(
        `UPDATE whatsapp_activity_suggestions
         SET status = 'ignored', updated_at = now()
         WHERE status = 'pending' AND created_at < now() - interval '24 hours'`,
      );
      await job.updateProgress(100);
      return { ok: true };
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job, r) => console.log('[whatsapp-activity-cleanup]', job.id, r));
  worker.on('failed', (job, err) =>
    console.error('[whatsapp-activity-cleanup] failed', job?.id, err),
  );

  return worker;
}
