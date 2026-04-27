import { Entity, Property, Enum, ManyToOne, Index, OptionalProps } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { BlueprintDocumentType } from '@tracker/shared';
import type { StageTemplate } from './stage-template.entity';

@Entity({ tableName: 'document_suggestions' })
@Index({ properties: ['stageTemplate', 'order'] })
export class DocumentSuggestion extends BaseEntity {
  [OptionalProps]?: 'description';

  @ManyToOne('StageTemplate', { fieldName: 'stage_template_id' })
  stageTemplate!: StageTemplate;

  @Property({ length: 80, default: 'suggestion' })
  code: string = 'suggestion';

  @Enum({ items: () => BlueprintDocumentType, default: BlueprintDocumentType.OTRO })
  documentType: BlueprintDocumentType = BlueprintDocumentType.OTRO;

  @Property({ length: 500 })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ default: false })
  isRequired: boolean = false;

  @Property({ type: 'int', fieldName: 'order' })
  order!: number;
}
