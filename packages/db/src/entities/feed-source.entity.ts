import { Entity, Property, Enum } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { FeedItemKind } from './feed-item.entity';

@Entity({ tableName: 'feed_sources' })
export class FeedSource extends BaseEntity {
  @Property({ length: 255 })
  name!: string;

  /** RSS / Atom feed URL */
  @Property({ length: 2048 })
  url!: string;

  @Enum(() => FeedItemKind)
  kind!: FeedItemKind;

  @Property({ default: true })
  active: boolean = true;

  @Property({ type: 'timestamptz', nullable: true })
  lastFetchedAt?: Date;

  @Property({ type: 'text', nullable: true })
  lastError?: string;
}
