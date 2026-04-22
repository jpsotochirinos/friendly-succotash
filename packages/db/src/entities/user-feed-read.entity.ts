import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'user_feed_reads' })
export class UserFeedRead {
  @PrimaryKey({ type: 'uuid' })
  userId!: string;

  @Property({ type: 'timestamptz' })
  lastSeenAt!: Date;
}
