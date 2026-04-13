import {
  Entity,
  Property,
  ManyToOne,
  JsonType,
  Index,
  OptionalProps,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { User } from './user.entity';
import type { Trackable } from './trackable.entity';

@Entity({ tableName: 'notifications' })
@Index({ properties: ['user', 'isRead'] })
export class Notification extends TenantBaseEntity {
  [OptionalProps]?: 'isRead' | 'createdAt' | 'updatedAt';

  @ManyToOne('User', { nullable: false })
  user!: User;

  @ManyToOne('Trackable', { nullable: true })
  trackable?: Trackable;

  @Property({ length: 50 })
  type!: string;

  @Property({ length: 500 })
  title!: string;

  @Property({ type: 'text', nullable: true })
  message?: string;

  @Property({ default: false })
  isRead: boolean = false;

  @Property({ nullable: true })
  readAt?: Date;

  @Property({ type: JsonType, nullable: true })
  data?: Record<string, unknown>;
}
