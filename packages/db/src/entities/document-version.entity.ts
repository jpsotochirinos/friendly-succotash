import {
  Entity,
  Property,
  ManyToOne,
  JsonType,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import type { Document } from './document.entity';
import type { User } from './user.entity';

@Entity({ tableName: 'document_versions' })
export class DocumentVersion extends BaseEntity {
  @ManyToOne('Document', { nullable: false })
  document!: Document;

  @Property({ type: 'int' })
  versionNumber!: number;

  @Property()
  minioKey!: string;

  @Property({ type: JsonType, nullable: true })
  editorContent?: Record<string, unknown>;

  @Property({ type: 'bigint', nullable: true })
  fileSize?: number;

  @ManyToOne('User', { nullable: true })
  createdBy?: User;
}
