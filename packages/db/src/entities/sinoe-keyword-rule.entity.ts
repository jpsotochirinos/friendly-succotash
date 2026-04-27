import { Entity, Property, Enum, ManyToOne, Index, OptionalProps } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { DeadlineCriticality, SinoeMatchMode, SinoeRuleAction } from '@tracker/shared';
import type { BlueprintVersion } from './blueprint-version.entity';

@Entity({ tableName: 'sinoe_keyword_rules' })
@Index({ properties: ['blueprintVersion'] })
export class SinoeKeywordRule extends BaseEntity {
  [OptionalProps]?: 'actionTargetCode' | 'criticality';

  @ManyToOne('BlueprintVersion', { fieldName: 'blueprint_version_id' })
  blueprintVersion!: BlueprintVersion;

  @Property({ length: 120, default: 'rule' })
  code: string = 'rule';

  @Property({ type: 'text' })
  pattern!: string;

  @Enum({ items: () => SinoeMatchMode, default: SinoeMatchMode.CONTAINS })
  matchMode: SinoeMatchMode = SinoeMatchMode.CONTAINS;

  @Enum({ items: () => SinoeRuleAction })
  action!: SinoeRuleAction;

  @Property({ length: 120, nullable: true })
  actionTargetCode?: string;

  @Property({ type: 'float', default: 0.8 })
  confidenceScore: number = 0.8;

  @Property({ default: false })
  requiresApproval: boolean = false;

  @Enum({ items: () => DeadlineCriticality, nullable: true })
  criticality?: DeadlineCriticality;
}
