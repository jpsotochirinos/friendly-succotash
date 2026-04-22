import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';

export const whatsappBriefingQueue = new Queue('whatsapp-briefing', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 20 },
    removeOnFail: { count: 10 },
  },
});
