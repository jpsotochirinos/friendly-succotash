import { Entity, Enum, ManyToOne, Property, Index, OptionalProps } from '@mikro-orm/core';
import { AdvancedByType } from '@tracker/shared';
import { TenantBaseEntity } from './tenant-base.entity';
import type { Trackable } from './trackable.entity';
import type { WorkflowState } from './workflow-state.entity';
import type { WorkflowItem } from './workflow-item.entity';
import type { User } from './user.entity';
import type { SinoeNotification } from './sinoe-notification.entity';

@Entity({ tableName: 'legal_process_stage_log' })
@Index({ properties: ['trackable', 'advancedAt'] })
export class LegalProcessStageLog extends TenantBaseEntity {
  [OptionalProps]?:
    | 'fromState'
    | 'advancedByUser'
    | 'sinoeNotification'
    | 'notes';

  @ManyToOne('Trackable', { nullable: false })
  trackable!: Trackable;

  /** Ítem raíz "Proceso" cuyo currentState se movió. */
  @ManyToOne('WorkflowItem', { nullable: false })
  processRootItem!: WorkflowItem;

  @ManyToOne('WorkflowState', { nullable: true })
  fromState?: WorkflowState;

  @ManyToOne('WorkflowState', { nullable: false })
  toState!: WorkflowState;

  @Enum({ items: () => AdvancedByType })
  advancedBy!: AdvancedByType;

  @ManyToOne('SinoeNotification', { nullable: true })
  sinoeNotification?: SinoeNotification;

  @ManyToOne('User', { nullable: true })
  advancedByUser?: User;

  @Property({ type: 'timestamptz' })
  advancedAt!: Date;

  @Property({ type: 'text', nullable: true })
  notes?: string;
}
