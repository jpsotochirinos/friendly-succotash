import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  Collection,
  JsonType,
  Index,
} from '@mikro-orm/core';
import { ImportBatchStatus, ImportChannel } from '@tracker/shared';
import { TenantBaseEntity } from './tenant-base.entity';
import type { User } from './user.entity';
import type { ImportItem } from './import-item.entity';

/** Config JSON por lote (regex de expediente, flags de OCR, adapter id, etc.). */
export type ImportBatchConfig = Record<string, unknown>;

@Entity({ tableName: 'import_batches' })
@Index({ properties: ['organization', 'status'] })
export class ImportBatch extends TenantBaseEntity {
  @Property({ length: 500 })
  name!: string;

  @Enum({ items: () => ImportChannel })
  channel!: ImportChannel;

  @Enum({ items: () => ImportBatchStatus, default: ImportBatchStatus.CREATED })
  status: ImportBatchStatus = ImportBatchStatus.CREATED;

  @Property({ type: JsonType, nullable: true })
  config?: ImportBatchConfig;

  @Property({ type: 'int', default: 0 })
  totalItems: number = 0;

  @Property({ type: 'int', default: 0 })
  processedItems: number = 0;

  @Property({ type: 'int', default: 0 })
  committedItems: number = 0;

  @Property({ type: 'text', nullable: true })
  errorMessage?: string;

  @Property({ type: 'timestamptz', nullable: true })
  stagingExpiresAt?: Date;

  @ManyToOne('User', { nullable: true })
  createdBy?: User;

  @OneToMany('ImportItem', 'batch')
  items = new Collection<ImportItem>(this);
}
