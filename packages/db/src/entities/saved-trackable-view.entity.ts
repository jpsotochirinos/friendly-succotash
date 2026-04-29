import { Entity, Property, ManyToOne, JsonType, Unique, Index } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { User } from './user.entity';

/** User-saved filter/sort/density config for the expedientes list. */
@Entity({ tableName: 'saved_trackable_views' })
@Unique({ properties: ['organization', 'user', 'slug'] })
@Index({ properties: ['organization', 'user', 'lastUsedAt'] })
export class SavedTrackableView extends TenantBaseEntity {
  @ManyToOne('User', { fieldName: 'user_id' })
  user!: User;

  @Property({ length: 200 })
  name!: string;

  @Property({ length: 80 })
  slug!: string;

  @Property({ default: false })
  isShared: boolean = false;

  @Property({ default: false })
  isFavorite: boolean = false;

  @Property({ type: 'timestamptz', nullable: true })
  lastUsedAt?: Date;

  @Property({ type: JsonType })
  config: Record<string, unknown> = {};
}
