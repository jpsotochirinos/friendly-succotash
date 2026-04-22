import { Entity, Property, ManyToOne, Unique, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { User } from './user.entity';

@Entity({ tableName: 'credit_allocations' })
@Unique({ properties: ['organization', 'user'] })
export class CreditAllocation extends TenantBaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @ManyToOne('User')
  user!: User;

  /** null = no per-user cap (still bounded by org wallet). */
  @Property({ type: 'int', nullable: true })
  monthlyLimit?: number | null;

  @Property({ type: 'int', default: 0 })
  monthConsumed: number = 0;

  @Property({ type: 'timestamptz', nullable: true })
  periodResetAt?: Date | null;
}
