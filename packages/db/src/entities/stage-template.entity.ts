import {
  Entity,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  Index,
  OptionalProps,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import type { BlueprintVersion } from './blueprint-version.entity';
import type { ActivityTemplate } from './activity-template.entity';
import type { DocumentSuggestion } from './document-suggestion.entity';

@Entity({ tableName: 'stage_templates' })
@Index({ properties: ['blueprintVersion', 'code'] })
export class StageTemplate extends BaseEntity {
  [OptionalProps]?: 'entryConditions' | 'exitConditions' | 'estimatedDurationDays' | 'sinoeKeywords' | 'description';

  @ManyToOne('BlueprintVersion', { fieldName: 'blueprint_version_id' })
  blueprintVersion!: BlueprintVersion;

  @Property({ length: 80 })
  code!: string;

  @Property({ length: 500 })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  /** DB column "order" (SQL reserved). */
  @Property({ type: 'int', fieldName: 'order' })
  order!: number;

  @Property({ type: 'json', nullable: true })
  entryConditions?: Record<string, unknown>;

  @Property({ type: 'json', nullable: true })
  exitConditions?: Record<string, unknown>;

  @Property({ type: 'int', nullable: true })
  estimatedDurationDays?: number;

  @Property({ type: 'array', nullable: true })
  sinoeKeywords?: string[];

  @Property({ default: false })
  isOptional: boolean = false;

  @Property({ default: false })
  isParallelizable: boolean = false;

  @OneToMany('ActivityTemplate', 'stageTemplate')
  activities = new Collection<ActivityTemplate>(this);

  @OneToMany('DocumentSuggestion', 'stageTemplate')
  documentSuggestions = new Collection<DocumentSuggestion>(this);
}
