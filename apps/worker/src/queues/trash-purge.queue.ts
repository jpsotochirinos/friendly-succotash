import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';

export const trashPurgeQueue = new Queue('trash-purge', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 30 },
    removeOnFail: { count: 10 },
  },
});
