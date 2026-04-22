import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  Collection,
  Index,
  OptionalProps,
  Unique,
} from '@mikro-orm/core';
import { WorkflowStateCategory } from '@tracker/shared';
import { BaseEntity } from './base.entity';
import type { WorkflowDefinition } from './workflow-definition.entity';
import type { WorkflowTransition } from './workflow-transition.entity';

@Entity({ tableName: 'workflow_states' })
@Unique({ properties: ['workflow', 'key'] })
@Index({ properties: ['workflow'] })
export class WorkflowState extends BaseEntity {
  [OptionalProps]?: 'sortOrder' | 'isInitial' | 'color';

  @ManyToOne('WorkflowDefinition', { nullable: false })
  workflow!: WorkflowDefinition;

  /** Clave estable dentro del workflow (coincide con WorkflowItemStatus legacy cuando aplica). */
  @Property({ length: 80 })
  key!: string;

  @Property({ length: 500 })
  name!: string;

  @Enum({ items: () => WorkflowStateCategory })
  category!: WorkflowStateCategory;

  @Property({ length: 32, nullable: true })
  color?: string;

  @Property({ type: 'int', default: 0 })
  sortOrder: number = 0;

  @Property({ default: false })
  isInitial: boolean = false;

  @OneToMany('WorkflowTransition', 'fromState')
  outgoingTransitions = new Collection<WorkflowTransition>(this);

  @OneToMany('WorkflowTransition', 'toState')
  incomingTransitions = new Collection<WorkflowTransition>(this);
}
