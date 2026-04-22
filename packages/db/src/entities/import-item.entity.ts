import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  Index,
  JsonType,
} from '@mikro-orm/core';
import { ActionType, ImportItemStatus } from '@tracker/shared';
import { TenantBaseEntity } from './tenant-base.entity';
import type { ImportBatch } from './import-batch.entity';
import type { Trackable } from './trackable.entity';
import type { Document } from './document.entity';

export type ImportClassificationMethod = 'rules' | 'embeddings' | 'llm';

export interface ImportClassification {
  actionType?: ActionType;
  kind?: string;
  confidence?: number;
  method?: ImportClassificationMethod;
  reasoning?: string;
  suggestedWorkflowItemTitle?: string;
}

@Entity({ tableName: 'import_items' })
@Index({ properties: ['organization', 'sha256'] })
@Index({ properties: ['batch', 'sha256'] })
@Index({ properties: ['batch', 'status'] })
export class ImportItem extends TenantBaseEntity {
  @ManyToOne('ImportBatch', { nullable: false })
  batch!: ImportBatch;

  /** Ruta relativa dentro del origen (ZIP, Drive, etc.). */
  @Property({ type: 'text' })
  sourcePath!: string;

  @Property({ length: 64 })
  sha256!: string;

  @Property({ type: 'bigint' })
  sizeBytes!: string;

  @Property({ length: 200, nullable: true })
  mimeDetected?: string;

  /** Clave en MinIO staging: staging/org-.../batch-.../... */
  @Property({ type: 'text', nullable: true })
  stagingKey?: string;

  @Property({ type: 'timestamptz', nullable: true })
  createdAtSource?: Date;

  /** Texto extraído truncado para clasificación (el completo puede ir a staging). */
  @Property({ type: 'text', nullable: true })
  extractedTextPreview?: string;

  @Property({ type: 'text', nullable: true })
  textStorageKey?: string;

  @Property({ type: JsonType, nullable: true })
  classification?: ImportClassification;

  @Property({ length: 500, nullable: true })
  suggestedTrackableKey?: string;

  @Property({ type: 'float', nullable: true })
  trackableConfidence?: number;

  @ManyToOne('Trackable', { nullable: true })
  mappedTrackable?: Trackable;

  @ManyToOne('Document', { nullable: true })
  mappedDocument?: Document;

  @ManyToOne('ImportItem', { nullable: true })
  parent?: ImportItem;

  @Enum({ items: () => ImportItemStatus, default: ImportItemStatus.QUEUED })
  status: ImportItemStatus = ImportItemStatus.QUEUED;

  @Property({ type: 'text', nullable: true })
  errorMessage?: string;
}
