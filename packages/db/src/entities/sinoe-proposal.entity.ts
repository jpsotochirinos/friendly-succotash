import { Entity, Property, Enum, ManyToOne, Index, JsonType, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import { SinoeProposedAction, SinoeProposalStatus } from '@tracker/shared';
import type { SinoeNotification } from './sinoe-notification.entity';
import type { ProcessTrack } from './process-track.entity';
import type { User } from './user.entity';

@Entity({ tableName: 'sinoe_proposals' })
@Index({ properties: ['organization', 'status', 'createdAt'] })
export class SinoeProposal extends TenantBaseEntity {
  [OptionalProps]?:
    | 'processTrack'
    | 'proposedAction'
    | 'proposedPayload'
    | 'confidenceScore'
    | 'autoAppliedReason'
    | 'approvedBy'
    | 'approvedAt'
    | 'rejectionReason'
    | 'revertedAt'
    | 'revertedBy';

  @ManyToOne('SinoeNotification', { fieldName: 'sinoe_notification_id' })
  sinoeNotification!: SinoeNotification;

  @ManyToOne('ProcessTrack', { nullable: true, fieldName: 'process_track_id' })
  processTrack?: ProcessTrack;

  @Enum({ items: () => SinoeProposedAction, nullable: true })
  proposedAction?: SinoeProposedAction;

  @Property({ type: JsonType, nullable: true })
  proposedPayload?: Record<string, unknown>;

  @Property({ type: 'float', nullable: true })
  confidenceScore?: number;

  @Enum({ items: () => SinoeProposalStatus, default: SinoeProposalStatus.PENDING })
  status: SinoeProposalStatus = SinoeProposalStatus.PENDING;

  @Property({ type: 'text', nullable: true })
  autoAppliedReason?: string;

  @ManyToOne('User', { nullable: true, fieldName: 'approved_by_id' })
  approvedBy?: User;

  @Property({ type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @Property({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Property({ type: 'timestamptz', nullable: true })
  revertedAt?: Date;

  @ManyToOne('User', { nullable: true, fieldName: 'reverted_by_id' })
  revertedBy?: User;
}
