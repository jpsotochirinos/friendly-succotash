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
import { StageInstanceStatus } from '@tracker/shared';
import type { ProcessTrack } from './process-track.entity';
import type { ActivityInstance } from './activity-instance.entity';
import type { Document } from './document.entity';

@Entity({ tableName: 'stage_instances' })
@Index({ properties: ['processTrack', 'order'] })
export class StageInstance extends TenantBaseEntity {
  [OptionalProps]?: 'exitedAt' | 'isReverted' | 'metadata';

  @ManyToOne('ProcessTrack', { fieldName: 'process_track_id' })
  processTrack!: ProcessTrack;

  @Property({ length: 80 })
  stageTemplateCode!: string;

  @Property({ type: 'int', fieldName: 'order' })
  order!: number;

  @Enum({ items: () => StageInstanceStatus, default: StageInstanceStatus.PENDING })
  status: StageInstanceStatus = StageInstanceStatus.PENDING;

  @Property({ type: 'timestamptz', nullable: true })
  enteredAt?: Date;

  @Property({ type: 'timestamptz', nullable: true })
  exitedAt?: Date;

  @Property({ default: false })
  isReverted: boolean = false;

  @Property({ type: JsonType, nullable: true })
  metadata?: Record<string, unknown>;

  @OneToMany('ActivityInstance', 'stageInstance')
  activities = new Collection<ActivityInstance>(this);

  @OneToMany('Document', 'classifiedStageInstance')
  classifiedDocuments = new Collection<Document>(this);
}
