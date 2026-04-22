import type { MigrationSseEvent, MigrationSseEventType } from '@tracker/shared';
import { alegaMigrationRedisChannel } from '@tracker/shared';
import { getRedisConnection } from '../config/redis';

export function publishMigrationEvent(
  batchId: string,
  type: MigrationSseEventType,
  payload?: Record<string, unknown>,
): void {
  const ev: MigrationSseEvent = {
    type,
    batchId,
    at: new Date().toISOString(),
    payload,
  };
  void getRedisConnection()
    .publish(alegaMigrationRedisChannel(batchId), JSON.stringify(ev))
    .catch(() => {
      /* ignore */
    });
}
