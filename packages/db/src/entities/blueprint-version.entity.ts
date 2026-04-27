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
import type { Blueprint } from './blueprint.entity';
import type { User } from './user.entity';
import type { StageTemplate } from './stage-template.entity';
import type { DeadlineRule } from './deadline-rule.entity';
import type { SinoeKeywordRule } from './sinoe-keyword-rule.entity';

@Entity({ tableName: 'blueprint_versions' })
@Index({ properties: ['blueprint'] })
export class BlueprintVersion extends BaseEntity {
  [OptionalProps]?: 'publishedAt' | 'publishedBy' | 'migrationNotes' | 'isDraft' | 'changelog';

  @ManyToOne('Blueprint', { fieldName: 'blueprint_id' })
  blueprint!: Blueprint;

  @Property({ type: 'int' })
  versionNumber!: number;

  @Property({ type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @ManyToOne('User', { nullable: true, fieldName: 'published_by_id' })
  publishedBy?: User;

  @Property({ type: 'text', default: '' })
  changelog: string = '';

  @Property({ type: 'text', nullable: true })
  migrationNotes?: string;

  @Property({ default: false })
  isDraft: boolean = false;

  @OneToMany('StageTemplate', 'blueprintVersion')
  stageTemplates = new Collection<StageTemplate>(this);

  @OneToMany('DeadlineRule', 'blueprintVersion')
  deadlineRules = new Collection<DeadlineRule>(this);

  @OneToMany('SinoeKeywordRule', 'blueprintVersion')
  sinoeKeywordRules = new Collection<SinoeKeywordRule>(this);
}
