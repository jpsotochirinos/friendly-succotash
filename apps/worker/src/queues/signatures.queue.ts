import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';

export const signaturesQueue = new Queue('signatures-finalize', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 },
  },
});
