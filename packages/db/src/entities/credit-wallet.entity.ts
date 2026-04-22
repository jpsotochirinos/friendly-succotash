import { Entity, Property, Unique, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';

@Entity({ tableName: 'credit_wallets' })
@Unique({ properties: ['organization'] })
export class CreditWallet extends TenantBaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  /** Rolled balance (includes top-ups). */
  @Property({ type: 'int', default: 0 })
  balance: number = 0;

  /** Credits granted for the current billing period (from plan). */
  @Property({ type: 'int', default: 0 })
  periodCredits: number = 0;

  @Property({ type: 'int', default: 0 })
  periodConsumed: number = 0;

  @Property({ type: 'timestamptz', nullable: true })
  periodResetAt?: Date | null;
}
