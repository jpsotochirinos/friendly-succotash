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
import type { Notification } from './notification.entity';

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

  @Property({ nullable: true })
  lastLoginAt?: Date;

  @Property({ nullable: true, hidden: true })
  refreshToken?: string;

  @OneToMany('Notification', 'user')
  notifications = new Collection<Notification>(this);

  getFullName(): string {
    return [this.firstName, this.lastName].filter(Boolean).join(' ') || this.email;
  }
}
