import { Entity, Property, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';

@Entity({ tableName: 'payment_methods' })
export class PaymentMethod extends TenantBaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @Property({ length: 32 })
  brand!: string;

  @Property({ length: 4 })
  last4!: string;

  @Property({ type: 'int' })
  expMonth!: number;

  @Property({ type: 'int' })
  expYear!: number;

  @Property({ length: 255 })
  holderName!: string;

  @Property({ default: false })
  isDefault: boolean = false;

  @Property({ length: 32, default: 'mock' })
  gateway: string = 'mock';

  @Property({ length: 255 })
  gatewayRef!: string;
}
