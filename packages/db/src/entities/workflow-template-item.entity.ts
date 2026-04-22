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
import { BaseEntity } from './base.entity';
import { ActionType } from '@tracker/shared';
import type { WorkflowTemplate } from './workflow-template.entity';
import type { Document } from './document.entity';
import type { WorkflowDefinition } from './workflow-definition.entity';
import type { WorkflowState } from './workflow-state.entity';

@Entity({ tableName: 'workflow_template_items' })
@Index({ properties: ['template'] })
@Index({ properties: ['parent'] })
export class WorkflowTemplateItem extends BaseEntity {
  [OptionalProps]?: 'requiresDocument' | 'sortOrder' | 'offsetDays' | 'triggers';

  @ManyToOne('WorkflowTemplate', { nullable: false })
  template!: WorkflowTemplate;

  @ManyToOne('WorkflowTemplateItem', { nullable: true })
  parent?: WorkflowTemplateItem;

  @OneToMany('WorkflowTemplateItem', 'parent')
  children = new Collection<WorkflowTemplateItem>(this);

  @Property({ length: 500 })
  title!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ length: 120, nullable: true })
  kind?: string;

  @Enum({ items: () => ActionType, nullable: true })
  actionType?: ActionType;

  @Property({ type: 'int', default: 0 })
  sortOrder: number = 0;

  /** Días desde startDate del expediente al instanciar (dueDate). */
  @Property({ type: 'int', nullable: true })
  offsetDays?: number;

  @Property({ default: false })
  requiresDocument: boolean = false;

  @ManyToOne('Document', { nullable: true })
  documentTemplate?: Document;

  /** ECA rule snapshots copied to WorkflowItem.metadata.triggers on instantiate. */
  @Property({ type: JsonType, nullable: true })
  triggers?: Record<string, unknown>[];

  @ManyToOne('WorkflowDefinition', { nullable: true })
  workflow?: WorkflowDefinition;

  @ManyToOne('WorkflowState', { nullable: true })
  currentState?: WorkflowState;
}
