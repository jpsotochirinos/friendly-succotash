import { Entity, Property, OneToOne, Unique, JsonType } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { User } from './user.entity';

@Entity({ tableName: 'user_sinoe_credentials' })
@Unique({ properties: ['user'] })
export class UserSinoeCredentials extends TenantBaseEntity {
  @OneToOne('User', { owner: true, unique: true })
  user!: User;

  /** AES-256-GCM ciphertext (username/password JSON). */
  @Property({ type: 'bytea' })
  ciphertext!: Buffer;

  @Property({ type: 'bytea' })
  iv!: Buffer;

  @Property({ type: 'bytea' })
  authTag!: Buffer;

  @Property({ type: 'smallint', default: 1 })
  keyVersion: number = 1;

  @Property({ type: JsonType, nullable: true })
  lastScrapeSnapshot?: Record<string, unknown> | unknown[] | null;

  @Property({ nullable: true })
  lastScrapeAt?: Date;

  @Property({ type: 'text', nullable: true })
  lastScrapeError?: string | null;
}
