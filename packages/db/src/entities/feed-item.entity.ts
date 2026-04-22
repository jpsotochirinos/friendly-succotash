import { Entity, Property, ManyToOne, Enum, Unique, Index } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import type { FeedSource } from './feed-source.entity';

export enum FeedItemKind {
  ALEGA_UPDATE = 'ALEGA_UPDATE',
  LEGAL_NEWS = 'LEGAL_NEWS',
  LEGISLATION = 'LEGISLATION',
}

@Entity({ tableName: 'feed_items' })
@Unique({ properties: ['url'] })
@Index({ properties: ['kind', 'publishedAt'] })
export class FeedItem extends BaseEntity {
  @Enum(() => FeedItemKind)
  kind!: FeedItemKind;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text', nullable: true })
  summary?: string;

  /** HTML or markdown body for detail view */
  @Property({ type: 'text', nullable: true })
  content?: string;

  /** Canonical link; null only before persist for Alega items (set in service) */
  @Property({ length: 2048, nullable: true })
  url?: string | null;

  @Property({ length: 255, nullable: true })
  sourceLabel?: string;

  @Property({ length: 2048, nullable: true })
  imageUrl?: string;

  @Property({ type: 'timestamptz' })
  publishedAt!: Date;

  @Property({ default: false })
  pinned: boolean = false;

  @ManyToOne('FeedSource', { nullable: true })
  feedSource?: FeedSource | null;
}
