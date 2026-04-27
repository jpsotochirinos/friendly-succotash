import { Entity, Property, Enum, ManyToOne, Index, JsonType, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import { ProcessTrackEventType } from '@tracker/shared';
import type { ProcessTrack } from './process-track.entity';
import type { User } from './user.entity';
import type { SinoeProposal } from './sinoe-proposal.entity';

@Entity({ tableName: 'process_track_events' })
@Index({ properties: ['processTrack', 'eventAt'] })
export class ProcessTrackEvent extends TenantBaseEntity {
  [OptionalProps]?: 'actor' | 'sinoeProposal' | 'payload';

  @ManyToOne('ProcessTrack', { fieldName: 'process_track_id' })
  processTrack!: ProcessTrack;

  @Enum({ items: () => ProcessTrackEventType })
  eventType!: ProcessTrackEventType;

  @Property({ type: JsonType, nullable: true })
  payload?: Record<string, unknown>;

  @ManyToOne('User', { nullable: true, fieldName: 'actor_id' })
  actor?: User;

  @ManyToOne('SinoeProposal', { nullable: true, fieldName: 'sinoe_proposal_id' })
  sinoeProposal?: SinoeProposal;

  @Property({ type: 'timestamptz', fieldName: 'event_at' })
  eventAt: Date = new Date();
}
