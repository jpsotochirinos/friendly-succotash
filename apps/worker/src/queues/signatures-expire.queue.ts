import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';

export const signaturesExpireQueue = new Queue('signatures-expire', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 20 },
  },
});
