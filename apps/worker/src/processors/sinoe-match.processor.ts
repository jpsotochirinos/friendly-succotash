import { resolve } from 'path';
import { Worker } from 'bullmq';
import { existsSync } from 'fs';
import { MikroORM } from '@mikro-orm/core';

type JobData = { organizationId: string; notificationId: string };

/**
 * Consumer for `sinoe-match` queue (jobs enqueued from SINOE scraper).
 * Uses built API bundle so `LegalProcessSinoeMatcherService` and legal advance logic stay in one place.
 * The API does not register the legacy inline consumer unless `ENABLE_LEGACY_SINOE_CONSUMER=true`.
 * The handler also forces `DISABLE_SINOE_MATCH_WORKER` so the API context does not attach a second consumer.
 */
export function createSinoeMatchWorker(_orm: MikroORM): Worker | undefined {
  const root = resolve(__dirname, '../../../..');
  const distHandler = resolve(root, 'apps/api/dist/sinoe-match-job.handler.js');
  const srcHandler = resolve(root, 'apps/api/src/sinoe-match-job.handler.ts');
  if (!existsSync(distHandler) && !existsSync(srcHandler)) {
    console.warn(
      '[worker] sinoe-match: API handler not found (build @tracker/api). Queue consumer not registered.',
    );
    return undefined;
  }
  if (!existsSync(distHandler)) {
    console.warn(
      '[worker] sinoe-match: run `pnpm --filter @tracker/api build` so the worker can load runSinoeMatchFromWorker.',
    );
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { runSinoeMatchFromWorker } = require(distHandler) as {
    runSinoeMatchFromWorker: (d: JobData) => Promise<boolean>;
  };

  const w = new Worker(
    'sinoe-match',
    async (job) => {
      const data = job.data as JobData;
      await runSinoeMatchFromWorker(data);
    },
    {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    },
  );
  return w;
}
