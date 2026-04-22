import { Entity, ManyToOne, Property, Unique, OptionalProps } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import type { WorkflowItem } from './workflow-item.entity';

@Entity({ tableName: 'workflow_item_calendar_mappings' })
@Unique({ properties: ['workflowItem', 'provider'] })
export class WorkflowItemCalendarMapping extends BaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @ManyToOne('WorkflowItem', { nullable: false })
  workflowItem!: WorkflowItem;

  @Property({ length: 20 })
  provider!: 'google' | 'outlook';

  @Property({ length: 512 })
  externalEventId!: string;

  @Property({ length: 512, nullable: true })
  etag?: string;
}
