import { Entity, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import { TrackablePartyRole } from '@tracker/shared';
import type { Trackable } from './trackable.entity';

@Entity({ tableName: 'trackable_parties' })
export class TrackableParty extends TenantBaseEntity {
  @ManyToOne('Trackable')
  trackable!: Trackable;

  @Enum({ items: () => TrackablePartyRole, default: TrackablePartyRole.OTHER })
  role: TrackablePartyRole = TrackablePartyRole.OTHER;

  @Property({ length: 500 })
  partyName!: string;

  @Property({ length: 120, nullable: true })
  documentId?: string;

  @Property({ length: 255, nullable: true })
  email?: string;

  @Property({ length: 64, nullable: true })
  phone?: string;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ default: 0 })
  sortOrder: number = 0;
}
