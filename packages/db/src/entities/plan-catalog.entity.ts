import { Entity, Property, Enum, Unique, OptionalProps, JsonType } from '@mikro-orm/core';
import { PlanTier } from '@tracker/shared';
import { BaseEntity } from './base.entity';

@Entity({ tableName: 'plan_catalog' })
@Unique({ properties: ['tier'] })
export class PlanCatalog extends BaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @Enum({ items: () => PlanTier })
  tier!: PlanTier;

  @Property({ length: 120 })
  name!: string;

  @Property({ type: 'int' })
  priceCents!: number;

  @Property({ length: 8, default: 'PEN' })
  currency: string = 'PEN';

  @Property({ type: 'int' })
  creditsPerMonth!: number;

  @Property({ type: 'int' })
  maxUsers!: number;

  @Property({ type: JsonType, nullable: true })
  features?: string[];

  @Property({ default: true })
  active: boolean = true;
}
