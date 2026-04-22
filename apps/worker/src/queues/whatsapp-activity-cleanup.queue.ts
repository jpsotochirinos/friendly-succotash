import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';

export const whatsappActivityCleanupQueue = new Queue('whatsapp-activity-cleanup', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 5 },
  },
});
