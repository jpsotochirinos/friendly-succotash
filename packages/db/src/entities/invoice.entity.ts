import { Entity, Property, Enum, ManyToOne, OptionalProps, JsonType } from '@mikro-orm/core';
import { InvoiceStatus } from '@tracker/shared';
import { TenantBaseEntity } from './tenant-base.entity';
import type { PaymentMethod } from './payment-method.entity';

@Entity({ tableName: 'invoices' })
export class Invoice extends TenantBaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @Property({ length: 64 })
  number!: string;

  @Enum({ items: () => InvoiceStatus, default: InvoiceStatus.PAID })
  status: InvoiceStatus = InvoiceStatus.PAID;

  @Property({ type: 'timestamptz' })
  issuedAt!: Date;

  @Property({ type: 'timestamptz', nullable: true })
  periodStart?: Date | null;

  @Property({ type: 'timestamptz', nullable: true })
  periodEnd?: Date | null;

  @Property({ type: 'int' })
  amountCents!: number;

  @Property({ length: 8, default: 'PEN' })
  currency: string = 'PEN';

  @ManyToOne('PaymentMethod', { nullable: true })
  paymentMethod?: PaymentMethod | null;

  @Property({ type: JsonType, nullable: true })
  itemsJson?: Record<string, unknown> | null;
}
