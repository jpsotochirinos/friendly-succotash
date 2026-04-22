import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';

export const feedIngestQueue = new Queue('feed-ingest', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 8000 },
    removeOnComplete: { count: 30 },
    removeOnFail: { count: 15 },
  },
});
