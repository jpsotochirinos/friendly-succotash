import {
  Entity,
  Property,
  Enum,
  OneToMany,
  Collection,
  JsonType,
  OptionalProps,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { PlanTier } from '@tracker/shared';
import type { User } from './user.entity';
import type { Role } from './role.entity';
import type { Trackable } from './trackable.entity';

@Entity({ tableName: 'organizations' })
export class Organization extends BaseEntity {
  [OptionalProps]?: 'planTier' | 'isActive' | 'createdAt' | 'updatedAt';

  @Property({ length: 255 })
  name!: string;

  @Enum({ items: () => PlanTier, default: PlanTier.FREE })
  planTier: PlanTier = PlanTier.FREE;

  @Property({ type: JsonType, nullable: true })
  settings?: Record<string, unknown>;

  @Property({ type: JsonType, nullable: true })
  onboardingState?: Record<string, unknown>;

  @Property({ default: true })
  isActive: boolean = true;

  @Property({ nullable: true })
  logoUrl?: string;

  @OneToMany('User', 'organization')
  users = new Collection<User>(this);

  @OneToMany('Role', 'organization')
  roles = new Collection<Role>(this);

  @OneToMany('Trackable', 'organization')
  trackables = new Collection<Trackable>(this);
}
