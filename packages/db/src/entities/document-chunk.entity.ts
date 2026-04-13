import {
  Entity,
  Property,
  ManyToOne,
  Index,
  Unique,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import type { Document } from './document.entity';

@Entity({ tableName: 'document_chunks' })
@Unique({ properties: ['document', 'chunkIndex'] })
export class DocumentChunk extends BaseEntity {
  @ManyToOne('Document', { nullable: false })
  document!: Document;

  @Property({ type: 'int' })
  chunkIndex!: number;

  @Property({ type: 'text' })
  content!: string;
}
