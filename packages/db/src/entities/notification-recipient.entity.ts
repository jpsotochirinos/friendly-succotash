import {
  Entity,
  Property,
  ManyToOne,
  Index,
  Unique,
  OptionalProps,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import type { User } from './user.entity';
import type { NotificationEvent } from './notification-event.entity';

@Entity({ tableName: 'notification_recipients' })
@Unique({ properties: ['notificationEvent', 'user'] })
@Index({ properties: ['user', 'isRead'] })
export class NotificationRecipient extends BaseEntity {
  [OptionalProps]?: 'readAt' | 'emailSentAt';

  @ManyToOne('NotificationEvent', { nullable: false })
  notificationEvent!: NotificationEvent;

  @ManyToOne('User', { nullable: false })
  user!: User;

  /** assignee | owner | org_member */
  @Property({ length: 32 })
  role!: string;

  @Property({ default: false })
  isRead: boolean = false;

  @Property({ nullable: true })
  readAt?: Date;

  @Property({ nullable: true })
  emailSentAt?: Date;
}
