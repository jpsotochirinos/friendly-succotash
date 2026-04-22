import { Entity, Property, Enum, JsonType, Index, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';

export const WORKFLOW_RULE_SCOPE_ITEMS = ['org', 'matterType', 'template', 'trackable'] as const;
export type WorkflowRuleScopeDb = (typeof WORKFLOW_RULE_SCOPE_ITEMS)[number];

@Entity({ tableName: 'workflow_rules' })
@Index({ properties: ['organization', 'event', 'enabled'] })
export class WorkflowRule extends TenantBaseEntity {
  [OptionalProps]?: 'description' | 'scopeId' | 'actionTypes';

  @Property({ length: 500 })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  /** Domain event name (e.g. document.created). */
  @Property({ length: 120 })
  event!: string;

  @Property({ type: JsonType })
  condition!: Record<string, unknown>;

  @Property({ type: JsonType })
  action!: Record<string, unknown>;

  @Property({ type: 'int', default: 0 })
  priority: number = 0;

  @Property({ default: true })
  enabled: boolean = true;

  @Enum({ items: () => [...WORKFLOW_RULE_SCOPE_ITEMS] })
  scope: WorkflowRuleScopeDb = 'org';

  @Property({ type: 'uuid', nullable: true })
  scopeId?: string;

  /** Optional filter: only these ActionType values (stored as strings). */
  @Property({ type: JsonType, nullable: true })
  actionTypes?: string[];
}
