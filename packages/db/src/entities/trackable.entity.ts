import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  Collection,
  JsonType,
  OptionalProps,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import { TrackableStatus, MatterType, TrackableListingUrgency } from '@tracker/shared';
import type { User } from './user.entity';
import type { WorkflowItem } from './workflow-item.entity';
import type { Folder } from './folder.entity';
import type { ExternalSource } from './external-source.entity';
import type { Client } from './client.entity';
import type { TrackableParty } from './trackable-party.entity';
import type { ProcessTrack } from './process-track.entity';

@Entity({ tableName: 'trackables' })
export class Trackable extends TenantBaseEntity {
  [OptionalProps]?:
    | 'status'
    | 'createdAt'
    | 'updatedAt'
    | 'matterType'
    | 'jurisdiction'
    | 'listingUrgency'
    | 'listingUrgencyRank'
    | 'listingNextDueAt'
    | 'listingLastActivityAt'
    | 'listingActivityTotal'
    | 'listingActivityDone'
    | 'listingDocCount'
    | 'listingCommentCount';

  @Property({ length: 500 })
  title!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ length: 100 })
  type!: string;

  @Enum({ items: () => MatterType, default: MatterType.OTHER })
  matterType: MatterType = MatterType.OTHER;

  @Property({ length: 120, nullable: true })
  expedientNumber?: string;

  @Property({ length: 500, nullable: true })
  court?: string;

  @Property({ length: 500, nullable: true })
  counterpartyName?: string;

  @Property({ length: 8, default: 'PE' })
  jurisdiction: string = 'PE';

  @Enum({ items: () => TrackableStatus, default: TrackableStatus.CREATED })
  status: TrackableStatus = TrackableStatus.CREATED;

  @ManyToOne('User', { nullable: true })
  createdBy?: User;

  @ManyToOne('User', { nullable: true })
  assignedTo?: User;

  @ManyToOne('Client', { nullable: true })
  client?: Client;

  @Property({ type: JsonType, nullable: true })
  metadata?: Record<string, unknown>;

  @Property({ type: 'date', nullable: true })
  startDate?: Date;

  @Property({ type: 'date', nullable: true })
  dueDate?: Date;

  @Property({ nullable: true })
  completedAt?: Date;

  @OneToMany('WorkflowItem', 'trackable')
  workflowItems = new Collection<WorkflowItem>(this);

  @OneToMany('Folder', 'trackable')
  folders = new Collection<Folder>(this);

  @OneToMany('ExternalSource', 'trackable')
  externalSources = new Collection<ExternalSource>(this);

  @OneToMany('TrackableParty', 'trackable')
  parties = new Collection<TrackableParty>(this);

  @OneToMany('ProcessTrack', 'trackable')
  processTracks = new Collection<ProcessTrack>(this);

  /** Denormalized for scalable expedientes list (see Migration_45 + snapshot refresh). */
  @Enum({ items: () => TrackableListingUrgency, default: TrackableListingUrgency.NO_DEADLINE })
  listingUrgency: TrackableListingUrgency = TrackableListingUrgency.NO_DEADLINE;

  @Property({ type: 'smallint', default: 5 })
  listingUrgencyRank: number = 5;

  @Property({ type: 'timestamptz', nullable: true })
  listingNextDueAt?: Date;

  @Property({ type: 'timestamptz', nullable: true })
  listingLastActivityAt?: Date;

  @Property({ default: 0 })
  listingActivityTotal: number = 0;

  @Property({ default: 0 })
  listingActivityDone: number = 0;

  @Property({ default: 0 })
  listingDocCount: number = 0;

  @Property({ default: 0 })
  listingCommentCount: number = 0;
}
