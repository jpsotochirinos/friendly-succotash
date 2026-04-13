import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';

export const scrapingQueue = new Queue('scraping', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
});

export async function scheduleScraping(
  sourceType: 'source_a' | 'source_c',
  config?: {
    url?: string;
    trackableId?: string;
    organizationId?: string;
  },
) {
  await scrapingQueue.add(`scrape-${sourceType}`, {
    sourceType,
    config: config || {},
  });
}
