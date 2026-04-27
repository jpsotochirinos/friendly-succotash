import {
  Entity,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  Unique,
  OptionalProps,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { Role } from './role.entity';
import type { NotificationRecipient } from './notification-recipient.entity';

@Entity({ tableName: 'users' })
@Unique({ properties: ['email'] })
export class User extends TenantBaseEntity {
  [OptionalProps]?: 'isActive' | 'createdAt' | 'updatedAt';

  @Property({ length: 255 })
  email!: string;

  @Property({ length: 255, nullable: true })
  firstName?: string;

  @Property({ length: 255, nullable: true })
  lastName?: string;

  @Property({ nullable: true, hidden: true })
  passwordHash?: string;

  @Property({ nullable: true })
  googleId?: string;

  @Property({ nullable: true })
  avatarUrl?: string;

  @ManyToOne('Role', { nullable: true })
  role?: Role;

  @Property({ default: true })
  isActive: boolean = true;

  /** When set and in the future, user cannot access the app until this instant (or admin re-enables). */
  @Property({ nullable: true })
  disabledUntil?: Date | null;

  @Property({ nullable: true })
  lastLoginAt?: Date;

  @Property({ nullable: true, hidden: true })
  refreshToken?: string;

  @Property({ type: 'date', nullable: true })
  birthDate?: Date;

  @Property({ length: 64, nullable: true, hidden: true })
  calendarIcsToken?: string;

  @OneToMany('NotificationRecipient', 'user')
  notificationRecipients = new Collection<NotificationRecipient>(this);

  getFullName(): string {
    return [this.firstName, this.lastName].filter(Boolean).join(' ') || this.email;
  }
}
