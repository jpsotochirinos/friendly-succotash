import { Entity, Property, OneToOne, Unique, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { User } from './user.entity';

@Entity({ tableName: 'signature_profiles' })
@Unique({ properties: ['organization', 'user'] })
export class SignatureProfile extends TenantBaseEntity {
  [OptionalProps]?: 'isActive' | 'createdAt' | 'updatedAt';

  @OneToOne('User', { owner: true })
  user!: User;

  @Property()
  storageKey!: string;

  @Property({ length: 100 })
  mimeType!: string;

  @Property({ nullable: true })
  initialsStorageKey?: string;

  @Property({ default: true })
  isActive: boolean = true;

  @Property({ type: 'timestamptz', nullable: true })
  verifiedAt?: Date;
}
