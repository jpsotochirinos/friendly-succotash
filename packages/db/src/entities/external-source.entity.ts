import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  JsonType,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import { ExternalSourceType } from '@tracker/shared';
import type { Trackable } from './trackable.entity';

@Entity({ tableName: 'external_sources' })
export class ExternalSource extends TenantBaseEntity {
  @ManyToOne('Trackable', { nullable: false })
  trackable!: Trackable;

  @Enum({ items: () => ExternalSourceType })
  sourceType!: ExternalSourceType;

  @Property({ length: 500, nullable: true })
  externalRef?: string;

  @Property({ type: JsonType, nullable: true })
  cachedData?: Record<string, unknown>;

  @Property({ type: JsonType, nullable: true })
  lastError?: Record<string, unknown>;

  @Property({ nullable: true })
  lastCheckedAt?: Date;
}
