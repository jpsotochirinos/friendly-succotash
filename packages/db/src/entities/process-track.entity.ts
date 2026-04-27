import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  Collection,
  Index,
  OptionalProps,
  JsonType,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import { ProcessTrackOutcome, ProcessTrackRole } from '@tracker/shared';
import type { Trackable } from './trackable.entity';
import type { Blueprint } from './blueprint.entity';
import type { StageInstance } from './stage-instance.entity';
import type { ProcessTrackEvent } from './process-track-event.entity';
import type { ComputedDeadline } from './computed-deadline.entity';

/** One judicial / structured process within a trackable. */
@Entity({ tableName: 'process_tracks' })
@Index({ properties: ['trackable', 'role'] })
export class ProcessTrack extends TenantBaseEntity {
  [OptionalProps]?:
    | 'parentProcessTrack'
    | 'currentStageInstance'
    | 'expedientNumber'
    | 'court'
    | 'judge'
    | 'closedAt'
    | 'outcome'
    | 'prefix'
    | 'metadata';

  @ManyToOne('Trackable', { fieldName: 'trackable_id' })
  trackable!: Trackable;

  @ManyToOne('Blueprint', { fieldName: 'blueprint_id' })
  blueprint!: Blueprint;

  @Enum({ items: () => ProcessTrackRole, default: ProcessTrackRole.PRIMARY })
  role: ProcessTrackRole = ProcessTrackRole.PRIMARY;

  @ManyToOne('ProcessTrack', { nullable: true, fieldName: 'parent_process_track_id' })
  parentProcessTrack?: ProcessTrack;

  @Property({ length: 16, nullable: true })
  prefix?: string;

  @Property({ length: 120, nullable: true })
  expedientNumber?: string;

  @Property({ length: 500, nullable: true })
  court?: string;

  @Property({ length: 500, nullable: true })
  judge?: string;

  @ManyToOne('StageInstance', { nullable: true, fieldName: 'current_stage_instance_id' })
  currentStageInstance?: StageInstance;

  @Property({ type: 'timestamptz' })
  startedAt: Date = new Date();

  @Property({ type: 'timestamptz', nullable: true })
  closedAt?: Date;

  @Enum({ items: () => ProcessTrackOutcome, nullable: true })
  outcome?: ProcessTrackOutcome;

  @OneToMany('StageInstance', 'processTrack')
  stageInstances = new Collection<StageInstance>(this);

  @OneToMany('ProcessTrackEvent', 'processTrack')
  events = new Collection<ProcessTrackEvent>(this);

  @OneToMany('ComputedDeadline', 'processTrack')
  computedDeadlines = new Collection<ComputedDeadline>(this);

  @Property({ type: JsonType, nullable: true })
  metadata?: Record<string, unknown>;
}
