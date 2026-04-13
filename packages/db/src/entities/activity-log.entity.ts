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

@Entity({ tableName: 'activity_logs' })
@Index({ properties: ['trackable'] })
export class ActivityLog extends TenantBaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @ManyToOne('Trackable', { nullable: true })
  trackable?: Trackable;

  @Property({ length: 100 })
  entityType!: string;

  @Property({ type: 'uuid' })
  entityId!: string;

  @ManyToOne('User', { nullable: true })
  user?: User;

  @Property({ length: 100 })
  action!: string;

  @Property({ type: JsonType, nullable: true })
  details?: Record<string, unknown>;

  @Property({ type: JsonType, nullable: true })
  previousValues?: Record<string, unknown>;

  @Property({ type: JsonType, nullable: true })
  newValues?: Record<string, unknown>;
}
