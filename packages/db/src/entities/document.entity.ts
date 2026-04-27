import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  Collection,
  OptionalProps,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import { DocumentReviewStatus } from '@tracker/shared';
import type { Folder } from './folder.entity';
import type { WorkflowItem } from './workflow-item.entity';
import type { User } from './user.entity';
import type { DocumentWorkflowParticipation } from './document-workflow-participation.entity';
import type { DocumentVersion } from './document-version.entity';
import type { DocumentChunk } from './document-chunk.entity';
import type { Evaluation } from './evaluation.entity';
import type { SignatureRequest } from './signature-request.entity';
import type { StageInstance } from './stage-instance.entity';
import type { ActivityInstance } from './activity-instance.entity';

@Entity({ tableName: 'documents' })
export class Document extends TenantBaseEntity {
  [OptionalProps]?:
    | 'currentVersion'
    | 'reviewStatus'
    | 'isTemplate'
    | 'tags'
    | 'deletedAt'
    | 'createdAt'
    | 'updatedAt'
    | 'pdfMinioKey'
    | 'lockedForSigning'
    | 'classifiedStageInstance';

  @Property({ length: 500 })
  title!: string;

  @Property({ length: 255, nullable: true })
  filename?: string;

  @Property({ length: 100, nullable: true })
  mimeType?: string;

  @Property({ nullable: true })
  minioKey?: string;

  /** PDF generated for digital signing (DOCX → PDF). Working copy is overwritten until completion. */
  @Property({ nullable: true })
  pdfMinioKey?: string;

  @Property({ default: false })
  lockedForSigning: boolean = false;

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

  @ManyToOne('ActivityInstance', { nullable: true, fieldName: 'activity_instance_id' })
  activityInstance?: ActivityInstance;

  @ManyToOne('StageInstance', { nullable: true, fieldName: 'classified_stage_instance_id' })
  classifiedStageInstance?: StageInstance;

  @ManyToOne('User', { nullable: true })
  uploadedBy?: User;

  @OneToMany('DocumentWorkflowParticipation', 'document')
  workflowParticipations = new Collection<DocumentWorkflowParticipation>(this);

  @OneToMany('DocumentVersion', 'document')
  versions = new Collection<DocumentVersion>(this);

  @OneToMany('DocumentChunk', 'document')
  chunks = new Collection<DocumentChunk>(this);

  @OneToMany('Evaluation', 'document')
  evaluations = new Collection<Evaluation>(this);

  @OneToMany('SignatureRequest', 'document')
  signatureRequests = new Collection<SignatureRequest>(this);
}
