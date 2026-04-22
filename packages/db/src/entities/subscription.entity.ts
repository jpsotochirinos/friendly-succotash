import { Entity, Property, Enum, ManyToOne, Unique, OptionalProps } from '@mikro-orm/core';
import { SubscriptionStatus } from '@tracker/shared';
import { TenantBaseEntity } from './tenant-base.entity';
import type { PlanCatalog } from './plan-catalog.entity';

@Entity({ tableName: 'subscriptions' })
@Unique({ properties: ['organization'] })
export class Subscription extends TenantBaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @ManyToOne('PlanCatalog')
  planCatalog!: PlanCatalog;

  @Enum({ items: () => SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus = SubscriptionStatus.ACTIVE;

  @Property({ type: 'timestamptz' })
  periodStart!: Date;

  @Property({ type: 'timestamptz' })
  periodEnd!: Date;

  @Property({ default: false })
  cancelAtPeriodEnd: boolean = false;

  @Property({ length: 32, default: 'mock' })
  gateway: string = 'mock';

  @Property({ length: 255, nullable: true })
  gatewayRef?: string | null;
}
