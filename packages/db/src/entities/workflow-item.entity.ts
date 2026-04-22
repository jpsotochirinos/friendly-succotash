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
import { ActionType } from '@tracker/shared';
import type { Trackable } from './trackable.entity';
import type { User } from './user.entity';
import type { Document } from './document.entity';
import type { WorkflowDefinition } from './workflow-definition.entity';
import type { WorkflowState } from './workflow-state.entity';

@Entity({ tableName: 'workflow_items' })
@Index({ properties: ['trackable'] })
@Index({ properties: ['parent'] })
export class WorkflowItem extends TenantBaseEntity {
  [OptionalProps]?:
    | 'sortOrder'
    | 'depth'
    | 'requiresDocument'
    | 'createdAt'
    | 'updatedAt'
    | 'isLegalDeadline';

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

  /** Etiqueta libre: Hito, Escrito, Audiencia, Plazo, Fase, etc. */
  @Property({ length: 120, nullable: true })
  kind?: string;

  @Enum({ items: () => ActionType, nullable: true })
  actionType?: ActionType;

  @ManyToOne('User', { nullable: true })
  assignedTo?: User;

  @ManyToOne('User', { nullable: true })
  reviewedBy?: User;

  @Property({ type: 'int', default: 0 })
  sortOrder: number = 0;

  @Property({ type: 'int', default: 0 })
  depth: number = 0;

  /** Número secuencial por expediente para clave tipo Jira (prefijo-N). */
  @Property({ type: 'int' })
  itemNumber!: number;

  /** Start instant (date-only stored at 00:00 local when allDay). */
  @Property({ type: 'datetime', nullable: true, columnType: 'timestamptz' })
  startDate?: Date;

  /** End/due instant. */
  @Property({ type: 'datetime', nullable: true, columnType: 'timestamptz' })
  dueDate?: Date;

  @Property({ length: 255, nullable: true })
  location?: string;

  @Enum({ items: () => ['low', 'normal', 'high', 'urgent'], default: 'normal' })
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';

  @Property({ default: true })
  allDay: boolean = true;

  @Property({ type: 'integer[]', nullable: true })
  reminderMinutesBefore?: number[];

  @Property({ length: 32, nullable: true })
  calendarColor?: string;

  @Property({ type: 'text', nullable: true })
  rrule?: string;

  @Property({ nullable: true })
  completedAt?: Date;

  @Property({ default: false })
  requiresDocument: boolean = false;

  /** Plazo procesal legal (UI distinta). */
  @Property({ default: false })
  isLegalDeadline: boolean = false;

  /** Color de acento UI (#RRGGBB), p. ej. borde en Kanban. */
  @Property({ length: 7, nullable: true })
  accentColor?: string;

  /** Trazabilidad: id del ítem de plantilla del que se instanció (workflow_template_items.id). */
  @Property({ type: 'uuid', nullable: true })
  instantiatedFromTemplateItemId?: string;

  @ManyToOne('Document', { nullable: true })
  documentTemplate?: Document;

  /** Flujo configurable (Jira-style); null = solo motor legacy por enum `status`. */
  @ManyToOne('WorkflowDefinition', { nullable: true })
  workflow?: WorkflowDefinition;

  /** Estado actual dentro de `workflow`; debe alinearse con `status` durante la migración. */
  @ManyToOne('WorkflowState', { nullable: true })
  currentState?: WorkflowState;

  @Property({ type: JsonType, nullable: true })
  metadata?: Record<string, unknown>;
}
