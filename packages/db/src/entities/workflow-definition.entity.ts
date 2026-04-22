import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  Collection,
  Index,
  OptionalProps,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { ActionType, MatterType } from '@tracker/shared';
import type { Organization } from './organization.entity';
import type { WorkflowState } from './workflow-state.entity';
import type { WorkflowTransition } from './workflow-transition.entity';

/** Definición de flujo (estados + transiciones), estilo Jira. Tabla `workflows`. */
@Entity({ tableName: 'workflows' })
@Index({ properties: ['slug'] })
export class WorkflowDefinition extends BaseEntity {
  [OptionalProps]?: 'jurisdiction' | 'isSystem' | 'isDefault' | 'actionType' | 'appliesToAllTypes';

  /** Identificador estable (p. ej. standard-judicial-pe). */
  @Property({ length: 120 })
  slug!: string;

  @Property({ length: 500 })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Enum({ items: () => MatterType, nullable: true })
  matterType?: MatterType;

  /** Si está definido, workflow por defecto para actividades con este ActionType (sistema u org). */
  @Enum({ items: () => ActionType, nullable: true })
  actionType?: ActionType;

  /**
   * True = flujo genérico por materia/jurisdicción (p. ej. standard-judicial-pe), no ligado a un ActionType.
   */
  @Property({ default: false })
  appliesToAllTypes: boolean = false;

  @Property({ length: 8, default: 'PE' })
  jurisdiction: string = 'PE';

  @Property({ default: false })
  isSystem: boolean = false;

  @Property({ default: false })
  isDefault: boolean = false;

  /** Null = workflow global del sistema; si no, pertenece al despacho. */
  @ManyToOne('Organization', { nullable: true })
  organization?: Organization;

  @OneToMany('WorkflowState', 'workflow')
  states = new Collection<WorkflowState>(this);

  @OneToMany('WorkflowTransition', 'workflow')
  transitions = new Collection<WorkflowTransition>(this);
}
