import { Entity, Property, Enum, ManyToOne, Index, OptionalProps } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import {
  BlueprintDeadlineTrigger,
  DeadlineCriticality,
  DeadlineDurationUnit,
  DeadlineOnExpiry,
} from '@tracker/shared';
import type { BlueprintVersion } from './blueprint-version.entity';

@Entity({ tableName: 'deadline_rules' })
@Index({ properties: ['blueprintVersion', 'code'] })
export class DeadlineRule extends BaseEntity {
  [OptionalProps]?: 'legalReference' | 'triggerTargetCode' | 'name';

  @ManyToOne('BlueprintVersion', { fieldName: 'blueprint_version_id' })
  blueprintVersion!: BlueprintVersion;

  @Property({ length: 120 })
  code!: string;

  @Property({ length: 500 })
  name!: string;

  @Enum({ items: () => BlueprintDeadlineTrigger })
  trigger!: BlueprintDeadlineTrigger;

  @Property({ length: 120, nullable: true })
  triggerTargetCode?: string;

  @Property({ type: 'int' })
  durationDays!: number;

  @Enum({ items: () => DeadlineDurationUnit, default: DeadlineDurationUnit.JUDICIAL_BUSINESS_DAYS })
  durationUnit: DeadlineDurationUnit = DeadlineDurationUnit.JUDICIAL_BUSINESS_DAYS;

  @Property({ length: 200, nullable: true })
  legalReference?: string;

  @Enum({ items: () => DeadlineOnExpiry, default: DeadlineOnExpiry.ALERT_ONLY })
  onExpiry: DeadlineOnExpiry = DeadlineOnExpiry.ALERT_ONLY;

  @Enum({ items: () => DeadlineCriticality, default: DeadlineCriticality.ADVISORY })
  criticality: DeadlineCriticality = DeadlineCriticality.ADVISORY;
}
