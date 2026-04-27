import { Entity, Property, Enum, ManyToOne, Index, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import { ComputedDeadlineStatusV2 } from '@tracker/shared';
import type { ProcessTrack } from './process-track.entity';
import type { Document } from './document.entity';
import type { User } from './user.entity';

@Entity({ tableName: 'computed_deadlines' })
@Index({ properties: ['processTrack', 'status', 'effectiveDate'] })
export class ComputedDeadline extends TenantBaseEntity {
  [OptionalProps]?: 'triggeredByEvent' | 'evidenceDocument' | 'overrideReason' | 'overrideBy' | 'overrideAt' | 'isReverted';

  @ManyToOne('ProcessTrack', { fieldName: 'process_track_id' })
  processTrack!: ProcessTrack;

  @Property({ length: 120 })
  deadlineRuleCode!: string;

  @Property({ type: 'timestamptz' })
  legalDate!: Date;

  @Property({ type: 'timestamptz' })
  effectiveDate!: Date;

  @Property({ type: 'timestamptz', nullable: true })
  triggeredAt?: Date;

  @Property({ type: 'text', nullable: true })
  triggeredByEvent?: string;

  @Enum({ items: () => ComputedDeadlineStatusV2, default: ComputedDeadlineStatusV2.PENDING })
  status: ComputedDeadlineStatusV2 = ComputedDeadlineStatusV2.PENDING;

  @ManyToOne('Document', { nullable: true, fieldName: 'evidence_document_id' })
  evidenceDocument?: Document;

  @Property({ type: 'text', nullable: true })
  overrideReason?: string;

  @ManyToOne('User', { nullable: true, fieldName: 'override_by_id' })
  overrideBy?: User;

  @Property({ type: 'timestamptz', nullable: true })
  overrideAt?: Date;

  @Property({ default: false })
  isReverted: boolean = false;
}
