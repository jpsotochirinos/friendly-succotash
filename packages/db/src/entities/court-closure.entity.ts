import { Entity, Property, Index, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';

/**
 * Juzgado- or org-specific non-working days; consumed by the deadline calculator.
 * Global rows: `isGlobal` true (optional future use; org still set for tenant filter off in queries).
 */
@Entity({ tableName: 'court_closures' })
@Index({ properties: ['organization', 'courtName', 'dateFrom', 'dateTo'] })
export class CourtClosure extends TenantBaseEntity {
  [OptionalProps]?: 'reason' | 'isGlobal';

  @Property({ length: 500 })
  courtName!: string;

  @Property({ type: 'date', fieldName: 'date_from' })
  dateFrom!: string;

  @Property({ type: 'date', fieldName: 'date_to' })
  dateTo!: string;

  @Property({ type: 'text', nullable: true })
  reason?: string;

  @Property({ default: false })
  isGlobal: boolean = false;
}
