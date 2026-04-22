import {
  Entity,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  JsonType,
  Index,
  OptionalProps,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { Trackable } from './trackable.entity';
import type { NotificationRecipient } from './notification-recipient.entity';

@Entity({ tableName: 'notification_events' })
@Index({ properties: ['organization', 'createdAt'] })
@Index({ properties: ['trackable'] })
export class NotificationEvent extends TenantBaseEntity {
  [OptionalProps]?: 'dedupeKey' | 'sourceEntityType' | 'sourceEntityId';

  @ManyToOne('Trackable', { nullable: true })
  trackable?: Trackable;

  @Property({ length: 80 })
  type!: string;

  @Property({ length: 500 })
  title!: string;

  @Property({ type: 'text', nullable: true })
  message?: string;

  @Property({ type: JsonType, nullable: true })
  data?: Record<string, unknown>;

  /** Idempotencia: deadline:uuid:2026-04-17:due_today */
  @Property({ length: 300, nullable: true })
  dedupeKey?: string;

  @Property({ length: 80, nullable: true })
  sourceEntityType?: string;

  @Property({ type: 'uuid', nullable: true })
  sourceEntityId?: string;

  @OneToMany('NotificationRecipient', 'notificationEvent')
  recipients = new Collection<NotificationRecipient>(this);
}
