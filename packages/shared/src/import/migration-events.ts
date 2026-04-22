/** Canal Redis por lote para eventos SSE del wizard de migración (API ↔ worker). */
export const ALEGA_MIGRATION_REDIS_PREFIX = 'alega:migration:';

export function alegaMigrationRedisChannel(batchId: string): string {
  return `${ALEGA_MIGRATION_REDIS_PREFIX}${batchId}`;
}

export type MigrationSseEventType =
  | 'batch.status'
  | 'item.classified'
  | 'item.failed'
  | 'batch.ready'
  | 'ping';

export interface MigrationSseEvent {
  type: MigrationSseEventType;
  batchId: string;
  at: string;
  payload?: Record<string, unknown>;
}
