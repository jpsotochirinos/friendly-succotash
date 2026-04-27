import { Entity, Property, ManyToOne, OptionalProps, JsonType, Unique } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { ProcessTrack } from './process-track.entity';

/**
 * Materialized resolved blueprint tree for a `ProcessTrack` (provenance per field in JSON).
 */
@Entity({ tableName: 'blueprint_resolved_snapshots' })
@Unique({ properties: ['processTrack'] })
export class BlueprintResolvedSnapshot extends TenantBaseEntity {
  [OptionalProps]?: 'sourceVersionIds';

  @ManyToOne('ProcessTrack', { fieldName: 'process_track_id' })
  processTrack!: ProcessTrack;

  @Property({ type: JsonType })
  resolvedTreeJson!: Record<string, unknown>;

  @Property({ type: 'array', nullable: true })
  sourceVersionIds?: string[];

  @Property({ type: 'timestamptz' })
  resolvedAt: Date = new Date();
}
