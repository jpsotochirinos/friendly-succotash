import { Entity, Enum, ManyToOne, Property, Index, OptionalProps } from '@mikro-orm/core';
import {
  DeadlineTriggerType,
  LegalDeadlineStatus,
  DeadlineCalendarType,
} from '@tracker/shared';
import { TenantBaseEntity } from './tenant-base.entity';
import type { Trackable } from './trackable.entity';
import type { WorkflowState } from './workflow-state.entity';
import type { WorkflowItem } from './workflow-item.entity';
import type { SinoeNotification } from './sinoe-notification.entity';

@Entity({ tableName: 'legal_deadline' })
@Index({ properties: ['organization', 'trackable', 'status'] })
@Index({ properties: ['dueDate', 'status'] })
export class LegalDeadline extends TenantBaseEntity {
  [OptionalProps]?: 'metAt' | 'waivedReason' | 'sinoeNotification' | 'processRootItem';

  @ManyToOne('Trackable', { nullable: false })
  trackable!: Trackable;

  @ManyToOne('WorkflowState', { nullable: false })
  workflowState!: WorkflowState;

  /** Ítem raíz "Proceso" al que aplica el plazo (opcional). */
  @ManyToOne('WorkflowItem', { nullable: true })
  processRootItem?: WorkflowItem;

  @Enum({ items: () => DeadlineTriggerType })
  triggerType!: DeadlineTriggerType;

  @Property({ type: 'timestamptz' })
  triggerDate!: Date;

  @ManyToOne('SinoeNotification', { nullable: true })
  sinoeNotification?: SinoeNotification;

  @Property({ type: 'int' })
  legalDays!: number;

  @Property({ type: 'timestamptz' })
  dueDate!: Date;

  @Enum({ items: () => DeadlineCalendarType })
  calendarType!: DeadlineCalendarType;

  @Property({ length: 120, nullable: true })
  lawRef?: string;

  @Enum({
    items: () => LegalDeadlineStatus,
    default: 'pending',
  })
  status!: LegalDeadlineStatus;

  @Property({ type: 'timestamptz', nullable: true })
  metAt?: Date;

  @Property({ length: 500, nullable: true })
  waivedReason?: string;

  @Property({ type: 'integer[]', default: [3, 1] })
  alertDaysBefore: number[] = [3, 1];
}
