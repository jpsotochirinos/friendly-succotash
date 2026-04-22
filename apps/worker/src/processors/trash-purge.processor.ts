import { Worker, Job } from 'bullmq';
import { MikroORM } from '@mikro-orm/postgresql';
import { Document, Organization } from '@tracker/db';
import { normalizeDocumentTrashRetentionDays } from '@tracker/shared';
import { getRedisConnection } from '../config/redis';

export function createTrashPurgeWorker(orm: MikroORM) {
  const worker = new Worker(
    'trash-purge',
    async (job: Job) => {
      const em = orm.em.fork();
      const orgs = await em.find(
        Organization,
        {},
        { fields: ['id', 'settings'] as any, filters: false },
      );

      let removed = 0;
      for (const org of orgs) {
        const days = normalizeDocumentTrashRetentionDays(org.settings?.documentTrashRetentionDays);
        const cutoff = new Date();
        cutoff.setTime(cutoff.getTime() - days * 24 * 60 * 60 * 1000);
        const docs = await em.find(
          Document,
          { organization: org.id, deletedAt: { $lt: cutoff } } as any,
        );
        for (const doc of docs) {
          em.remove(doc);
        }
        removed += docs.length;
      }
      if (removed) {
        await em.flush();
      }

      await job.updateProgress(100);
      return { organizations: orgs.length, removed };
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job, r) => {
    console.log('[trash-purge]', job.id, r);
  });
  worker.on('failed', (job, err) => {
    console.error('[trash-purge] failed', job?.id, err);
  });

  return worker;
}
