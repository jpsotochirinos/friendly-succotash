import { Entity, ManyToOne, Property, Unique, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { CalendarIntegration } from './calendar-integration.entity';

@Entity({ tableName: 'calendar_imported_events' })
@Unique({ properties: ['integration', 'externalId'] })
export class CalendarImportedEvent extends TenantBaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @ManyToOne('CalendarIntegration', { nullable: false })
  integration!: CalendarIntegration;

  @Property({ length: 512 })
  externalId!: string;

  @Property({ length: 500 })
  title!: string;

  @Property({ type: 'text', nullable: true })
  body?: string;

  @Property()
  startsAt!: Date;

  @Property()
  endsAt!: Date;

  @Property({ default: false })
  allDay: boolean = false;

  @Property({ length: 512, nullable: true })
  etag?: string;
}
