import { Entity, Property, Enum, ManyToOne, OptionalProps, JsonType } from '@mikro-orm/core';
import { CreditTransactionReason } from '@tracker/shared';
import { TenantBaseEntity } from './tenant-base.entity';
import type { User } from './user.entity';

@Entity({ tableName: 'credit_transactions' })
export class CreditTransaction extends TenantBaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @ManyToOne('User', { nullable: true })
  user?: User | null;

  /** Positive = credit in, negative = spend. */
  @Property({ type: 'int' })
  delta!: number;

  @Enum({ items: () => CreditTransactionReason })
  reason!: CreditTransactionReason;

  @Property({ type: JsonType, nullable: true })
  ref?: Record<string, unknown> | null;
}
