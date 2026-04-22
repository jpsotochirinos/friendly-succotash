import { Entity, ManyToOne, Property, Unique, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { User } from './user.entity';

@Entity({ tableName: 'calendar_integrations' })
@Unique({ properties: ['user', 'provider'] })
export class CalendarIntegration extends TenantBaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @ManyToOne('User', { nullable: false })
  user!: User;

  @Property({ length: 20 })
  provider!: 'google' | 'outlook';

  @Property({ type: 'text', nullable: true })
  accessToken?: string;

  @Property({ type: 'text', nullable: true })
  refreshToken?: string;

  @Property({ nullable: true })
  expiresAt?: Date;

  @Property({ length: 255, nullable: true })
  externalCalendarId?: string;

  @Property({ type: 'text', nullable: true })
  syncToken?: string;

  @Property({ length: 255, nullable: true })
  watchChannelId?: string;

  @Property({ type: 'text', nullable: true })
  watchResourceId?: string;

  @Property({ nullable: true })
  watchExpiration?: Date;

  @Property({ nullable: true })
  lastSyncAt?: Date;

  @Property({ default: true })
  exportEnabled: boolean = true;

  @Property({ default: true })
  importEnabled: boolean = true;
}
