import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  Collection,
  Index,
  OptionalProps,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import { DocumentReviewStatus } from '@tracker/shared';
import type { Folder } from './folder.entity';
import type { WorkflowItem } from './workflow-item.entity';
import type { User } from './user.entity';
import type { DocumentVersion } from './document-version.entity';
import type { DocumentChunk } from './document-chunk.entity';
import type { Evaluation } from './evaluation.entity';

@Entity({ tableName: 'documents' })
export class Document extends TenantBaseEntity {
  [OptionalProps]?: 'currentVersion' | 'reviewStatus' | 'isTemplate' | 'tags' | 'deletedAt' | 'createdAt' | 'updatedAt';

  @Property({ length: 500 })
  title!: string;

  @Property({ length: 255, nullable: true })
  filename?: string;

  @Property({ length: 100, nullable: true })
  mimeType?: string;

  @Property({ nullable: true })
  minioKey?: string;

  @Property({ type: 'text', nullable: true })
  contentText?: string;

  @Property({ type: 'int', default: 1 })
  currentVersion: number = 1;

  @Enum({ items: () => DocumentReviewStatus, default: DocumentReviewStatus.DRAFT })
  reviewStatus: DocumentReviewStatus = DocumentReviewStatus.DRAFT;

  @Property({ type: 'float', nullable: true })
  evaluationScore?: number;

  @Property({ default: false })
  isTemplate: boolean = false;

  @Property({ type: 'json', nullable: true })
  tags?: string[];

  @Property({ type: 'Date', nullable: true })
  deletedAt?: Date;

  @ManyToOne('Folder', { nullable: true })
  folder?: Folder;

  @ManyToOne('WorkflowItem', { nullable: true })
  workflowItem?: WorkflowItem;

  @ManyToOne('User', { nullable: true })
  uploadedBy?: User;

  @OneToMany('DocumentVersion', 'document')
  versions = new Collection<DocumentVersion>(this);

  @OneToMany('DocumentChunk', 'document')
  chunks = new Collection<DocumentChunk>(this);

  @OneToMany('Evaluation', 'document')
  evaluations = new Collection<Evaluation>(this);
}
