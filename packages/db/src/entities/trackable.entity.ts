import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  Collection,
  JsonType,
  OptionalProps,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import { TrackableStatus } from '@tracker/shared';
import type { User } from './user.entity';
import type { WorkflowItem } from './workflow-item.entity';
import type { Folder } from './folder.entity';
import type { ExternalSource } from './external-source.entity';

@Entity({ tableName: 'trackables' })
export class Trackable extends TenantBaseEntity {
  [OptionalProps]?: 'status' | 'createdAt' | 'updatedAt';

  @Property({ length: 500 })
  title!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ length: 100 })
  type!: string;

  @Enum({ items: () => TrackableStatus, default: TrackableStatus.CREATED })
  status: TrackableStatus = TrackableStatus.CREATED;

  @ManyToOne('User', { nullable: true })
  createdBy?: User;

  @ManyToOne('User', { nullable: true })
  assignedTo?: User;

  @Property({ type: JsonType, nullable: true })
  metadata?: Record<string, unknown>;

  @Property({ type: 'date', nullable: true })
  startDate?: Date;

  @Property({ type: 'date', nullable: true })
  dueDate?: Date;

  @Property({ nullable: true })
  completedAt?: Date;

  @OneToMany('WorkflowItem', 'trackable')
  workflowItems = new Collection<WorkflowItem>(this);

  @OneToMany('Folder', 'trackable')
  folders = new Collection<Folder>(this);

  @OneToMany('ExternalSource', 'trackable')
  externalSources = new Collection<ExternalSource>(this);
}
