import { Entity, Property, OneToMany, Collection, OptionalProps, Enum } from '@mikro-orm/core';
import { ClientKind } from '@tracker/shared';
import { TenantBaseEntity } from './tenant-base.entity';
import type { Trackable } from './trackable.entity';

@Entity({ tableName: 'clients' })
export class Client extends TenantBaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @Enum({ items: () => ClientKind, default: ClientKind.UNKNOWN })
  clientKind!: ClientKind;

  @Property({ length: 500 })
  name!: string;

  @Property({ length: 255, nullable: true })
  email?: string;

  @Property({ length: 64, nullable: true })
  phone?: string;

  @Property({ length: 120, nullable: true })
  documentId?: string;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany('Trackable', 'client')
  trackables = new Collection<Trackable>(this);
}
