import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';

export const deadlineNotificationsQueue = new Queue('deadline-notifications', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 },
  },
});
