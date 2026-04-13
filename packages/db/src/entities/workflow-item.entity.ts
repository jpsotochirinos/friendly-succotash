import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  Collection,
  JsonType,
  Index,
  OptionalProps,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import { WorkflowItemStatus, WorkflowItemType, ActionType } from '@tracker/shared';
import type { Trackable } from './trackable.entity';
import type { User } from './user.entity';
import type { Document } from './document.entity';

@Entity({ tableName: 'workflow_items' })
@Index({ properties: ['trackable'] })
@Index({ properties: ['parent'] })
export class WorkflowItem extends TenantBaseEntity {
  [OptionalProps]?: 'status' | 'sortOrder' | 'depth' | 'requiresDocument' | 'createdAt' | 'updatedAt';

  @ManyToOne('Trackable', { nullable: false })
  trackable!: Trackable;

  @ManyToOne('WorkflowItem', { nullable: true })
  parent?: WorkflowItem;

  @OneToMany('WorkflowItem', 'parent')
  children = new Collection<WorkflowItem>(this);

  @Property({ length: 500 })
  title!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Enum({ items: () => WorkflowItemType })
  itemType!: WorkflowItemType;

  @Enum({ items: () => ActionType, nullable: true })
  actionType?: ActionType;

  @Enum({ items: () => WorkflowItemStatus, default: WorkflowItemStatus.PENDING })
  status: WorkflowItemStatus = WorkflowItemStatus.PENDING;

  @ManyToOne('User', { nullable: true })
  assignedTo?: User;

  @ManyToOne('User', { nullable: true })
  reviewedBy?: User;

  @Property({ type: 'int', default: 0 })
  sortOrder: number = 0;

  @Property({ type: 'int', default: 0 })
  depth: number = 0;

  @Property({ type: 'date', nullable: true })
  startDate?: Date;

  @Property({ type: 'date', nullable: true })
  dueDate?: Date;

  @Property({ nullable: true })
  completedAt?: Date;

  @Property({ default: false })
  requiresDocument: boolean = false;

  @ManyToOne('Document', { nullable: true })
  documentTemplate?: Document;

  @Property({ type: JsonType, nullable: true })
  metadata?: Record<string, unknown>;
}
