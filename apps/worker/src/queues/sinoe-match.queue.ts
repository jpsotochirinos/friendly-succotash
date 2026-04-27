import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';

let queue: Queue | null = null;

export function getSinoeMatchQueue(): Queue {
  if (!queue) {
    queue = new Queue('sinoe-match', {
      connection: getRedisConnection(),
    });
  }
  return queue;
}
