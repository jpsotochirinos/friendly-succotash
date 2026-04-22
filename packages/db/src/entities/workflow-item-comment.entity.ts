import { Entity, Property, ManyToOne, Index, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { WorkflowItem } from './workflow-item.entity';
import type { User } from './user.entity';

@Entity({ tableName: 'workflow_item_comments' })
@Index({ properties: ['workflowItem'] })
export class WorkflowItemComment extends TenantBaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @ManyToOne('WorkflowItem', { nullable: false })
  workflowItem!: WorkflowItem;

  @ManyToOne('User', { nullable: false })
  user!: User;

  @Property({ type: 'text' })
  body!: string;
}
