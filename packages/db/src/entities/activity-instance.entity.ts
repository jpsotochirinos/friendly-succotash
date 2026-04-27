import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  ManyToMany,
  Collection,
  Index,
  JsonType,
  OptionalProps,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import { ActionType, WorkflowStateCategory } from '@tracker/shared';
import { User } from './user.entity';
import type { Document } from './document.entity';
import type { Trackable } from './trackable.entity';
import type { WorkflowDefinition } from './workflow-definition.entity';
import type { WorkflowState } from './workflow-state.entity';
import type { StageInstance } from './stage-instance.entity';
import type { SinoeProposal } from './sinoe-proposal.entity';

@Entity({ tableName: 'activity_instances' })
@Index({ properties: ['stageInstance'] })
@Index({ properties: ['trackable'] })
@Index({ properties: ['parent'] })
export class ActivityInstance extends TenantBaseEntity {
  [OptionalProps]?:
    | 'description'
    | 'kind'
    | 'activityTemplateCode'
    | 'assignedTo'
    | 'reviewedBy'
    | 'startDate'
    | 'dueDate'
    | 'location'
    | 'reminderMinutesBefore'
    | 'calendarColor'
    | 'rrule'
    | 'completedAt'
    | 'accentColor'
    | 'metadata'
    | 'workflow'
    | 'currentState'
    | 'documentTemplate'
    | 'isReverted'
    | 'createdBySinoeProposal'
    | 'trackable'
    | 'parent'
    | 'secondaryAssignees';

  @ManyToOne('StageInstance', { fieldName: 'stage_instance_id' })
  stageInstance!: StageInstance;

  /** Denormalized expediente (same as `stageInstance.processTrack.trackable`); for dashboard/calendar joins. */
  @ManyToOne('Trackable', { nullable: true, fieldName: 'trackable_id' })
  trackable?: Trackable;

  @ManyToOne('ActivityInstance', { nullable: true, fieldName: 'parent_id' })
  parent?: ActivityInstance;

  @OneToMany('ActivityInstance', 'parent')
  children = new Collection<ActivityInstance>(this);

  @Property({ length: 80, nullable: true })
  activityTemplateCode?: string;

  @Property({ length: 500 })
  title!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ length: 120, nullable: true })
  kind?: string;

  @Enum({ items: () => ActionType, nullable: true })
  actionType?: ActionType;

  @ManyToMany({
    entity: () => User,
    owner: true,
    pivotTable: 'activity_instance_secondary_assignees',
  })
  secondaryAssignees = new Collection<User>(this);

  @ManyToOne('User', { nullable: true, fieldName: 'assigned_to_id' })
  assignedTo?: User;

  @ManyToOne('User', { nullable: true, fieldName: 'reviewed_by_id' })
  reviewedBy?: User;

  @Property({ type: 'int' })
  itemNumber!: number;

  @Property({ type: 'timestamptz', nullable: true })
  startDate?: Date;

  @Property({ type: 'timestamptz', nullable: true })
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

  @Property({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Property({ default: false })
  requiresDocument: boolean = false;

  @Property({ default: false })
  isLegalDeadline: boolean = false;

  @Property({ length: 7, nullable: true })
  accentColor?: string;

  @Property({ default: false })
  isCustom: boolean = false;

  @Property({ default: true })
  isMandatory: boolean = true;

  @Property({ default: false })
  isReverted: boolean = false;

  @Enum({
    items: () => WorkflowStateCategory,
    default: WorkflowStateCategory.TODO,
  })
  workflowStateCategory: WorkflowStateCategory = WorkflowStateCategory.TODO;

  @ManyToOne('WorkflowDefinition', { nullable: true, fieldName: 'workflow_id' })
  workflow?: WorkflowDefinition;

  @ManyToOne('WorkflowState', { nullable: true, fieldName: 'current_state_id' })
  currentState?: WorkflowState;

  @ManyToOne('Document', { nullable: true, fieldName: 'document_template_id' })
  documentTemplate?: Document;

  @Property({ type: JsonType, nullable: true })
  metadata?: Record<string, unknown>;

  @ManyToOne('SinoeProposal', { nullable: true, fieldName: 'created_by_sinoe_proposal_id' })
  createdBySinoeProposal?: SinoeProposal;
}
