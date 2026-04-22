import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';

export const timeTickQueue = new Queue('time-tick', {
  connection: getRedisConnection(),
});
