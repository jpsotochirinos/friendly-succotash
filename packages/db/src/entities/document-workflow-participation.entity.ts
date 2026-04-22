import {
  Entity,
  Property,
  ManyToOne,
  Index,
  OptionalProps,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { Document } from './document.entity';
import type { WorkflowItem } from './workflow-item.entity';

@Entity({ tableName: 'document_workflow_participations' })
@Index({ properties: ['document'] })
@Index({ properties: ['workflowItem'] })
export class DocumentWorkflowParticipation extends TenantBaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt' | 'endedAt';

  @ManyToOne('Document', { nullable: false })
  document!: Document;

  @ManyToOne('WorkflowItem', { nullable: false })
  workflowItem!: WorkflowItem;

  /** When this link interval started (assignment to this activity). */
  @Property({ type: 'timestamptz' })
  startedAt!: Date;

  /** When the document was linked to another activity; null means still active. */
  @Property({ type: 'timestamptz', nullable: true })
  endedAt?: Date | null;

  /** Document `currentVersion` snapshot when this participation started. */
  @Property({ type: 'int', nullable: true })
  versionAtStart?: number | null;
}
