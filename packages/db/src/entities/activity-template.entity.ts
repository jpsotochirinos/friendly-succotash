import { Entity, Property, Enum, ManyToOne, Index, OptionalProps } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { BlueprintDocumentType } from '@tracker/shared';
import type { StageTemplate } from './stage-template.entity';
import type { Document } from './document.entity';

@Entity({ tableName: 'activity_templates' })
@Index({ properties: ['stageTemplate', 'code'] })
export class ActivityTemplate extends BaseEntity {
  [OptionalProps]?: 'description' | 'suggestedDocumentType' | 'triggersDeadlineCode' | 'documentTemplate';

  @ManyToOne('StageTemplate', { fieldName: 'stage_template_id' })
  stageTemplate!: StageTemplate;

  @Property({ length: 80 })
  code!: string;

  @Property({ length: 500 })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'int', fieldName: 'order' })
  order!: number;

  @Property({ type: 'int', nullable: true })
  estimatedDurationMinutes?: number;

  @Property({ default: false })
  isMandatory: boolean = false;

  @Property({ default: false })
  requiresDocument: boolean = false;

  @Enum({ items: () => BlueprintDocumentType, nullable: true })
  suggestedDocumentType?: BlueprintDocumentType;

  @Property({ length: 120, nullable: true })
  triggersDeadlineCode?: string;

  @ManyToOne('Document', { nullable: true, fieldName: 'document_template_id' })
  documentTemplate?: Document;
}
