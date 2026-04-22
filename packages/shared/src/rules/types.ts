import type { ActionType, WorkflowItemStatus } from '../enums/index';
import type { DomainEventName } from '../events/domain-events';

/** JSON-safe condition DSL (evaluated by `evaluateCondition`). */
export type Cond =
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond }
  | { eq: [string, unknown] }
  | { neq: [string, unknown] }
  | { in: [string, unknown[]] }
  | { gt: [string, number] }
  | { lt: [string, number] }
  | { gte: [string, number] }
  | { lte: [string, number] }
  | { has: [string] }
  | { matches: [string, string] };

export type RuleAction =
  /** `to` is the target state key (aligned with `WorkflowState.key` / legacy `WorkflowItemStatus`). */
  | { type: 'transition'; to: WorkflowItemStatus; toStateKey?: string }
  | { type: 'notify'; title: string; message: string }
  | { type: 'noop' };

/** Rule as stored in DB or defined in code defaults. */
export interface WorkflowRuleDefinition {
  id: string;
  name: string;
  description?: string;
  event: DomainEventName;
  /** Optional: only apply when item.actionType is one of these (omit = any). */
  actionTypes?: ActionType[];
  condition: Cond;
  action: RuleAction;
  /** Higher runs first; first matching rule wins. */
  priority: number;
  enabled?: boolean;
}

/** Scope for persisted rules (phase 2+). */
export type WorkflowRuleScope = 'org' | 'matterType' | 'template' | 'trackable';
