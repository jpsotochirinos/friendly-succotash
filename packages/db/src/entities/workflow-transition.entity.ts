import { Entity, Property, ManyToOne, Index, OptionalProps, JsonType } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import type { WorkflowDefinition } from './workflow-definition.entity';
import type { WorkflowState } from './workflow-state.entity';

@Entity({ tableName: 'workflow_transitions' })
@Index({ properties: ['workflow'] })
export class WorkflowTransition extends BaseEntity {
  [OptionalProps]?: 'requiredPermission' | 'condition' | 'autoOnEvent';

  @ManyToOne('WorkflowDefinition', { nullable: false })
  workflow!: WorkflowDefinition;

  /** Null = transición válida desde cualquier estado (raro; preferir explícito). */
  @ManyToOne('WorkflowState', { nullable: true })
  fromState?: WorkflowState;

  @ManyToOne('WorkflowState', { nullable: false })
  toState!: WorkflowState;

  @Property({ length: 500 })
  name!: string;

  @Property({ length: 120, nullable: true })
  requiredPermission?: string;

  @Property({ type: JsonType, nullable: true })
  condition?: Record<string, unknown>;

  @Property({ length: 120, nullable: true })
  autoOnEvent?: string;
}
