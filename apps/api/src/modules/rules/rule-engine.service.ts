import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Trackable, WorkflowItem } from '@tracker/db';
import { ActivityLog } from '@tracker/db';
import {
  ActionType,
  WorkflowItemStatus,
  evaluateCondition,
  type DomainEventName,
  type RuleAction,
  type WorkflowRuleDefinition,
} from '@tracker/shared';
import { WorkflowService, type WorkflowItemTransitionContext } from '../workflow/workflow.service';
import { RuleResolverService } from './rule-resolver.service';

export interface DocumentDomainPayload {
  documentId: string;
  organizationId: string;
  trackableId?: string;
  workflowItemId?: string | null;
  userId?: string;
  contentLengthDelta?: number;
  [key: string]: unknown;
}

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly workflow: WorkflowService,
    private readonly resolver: RuleResolverService,
  ) {}

  async dispatch(event: DomainEventName, payload: DocumentDomainPayload): Promise<void> {
    const workflowItemId = payload.workflowItemId;
    if (!workflowItemId) return;

    const item = await this.em.findOne(
      WorkflowItem,
      { id: workflowItemId, organization: payload.organizationId } as any,
      { populate: ['trackable', 'organization', 'workflow', 'currentState'] as any },
    );
    if (!item) return;

    const trackable = item.trackable as Trackable;
    const orgId =
      typeof (item as any).organization === 'object' && (item as any).organization?.id
        ? (item as any).organization.id
        : payload.organizationId;

    const rules = await this.resolver.resolveRules(event, orgId, item);
    const ctx = this.buildEvaluationContext(event, payload, item, trackable);

    for (const rule of rules) {
      if (rule.enabled === false) continue;
      if (rule.actionTypes?.length) {
        const at = item.actionType as ActionType | undefined;
        if (!at || !rule.actionTypes.includes(at)) continue;
      }
      try {
        if (!evaluateCondition(rule.condition as any, ctx)) continue;
      } catch (e) {
        this.logger.warn(`Rule ${rule.id} condition error: ${(e as Error).message}`);
        continue;
      }
      await this.executeRule(rule, item, orgId, event);
      break;
    }
  }

  private buildEvaluationContext(
    event: string,
    payload: DocumentDomainPayload,
    item: WorkflowItem,
    trackable: Trackable,
  ): Record<string, unknown> {
    return {
      event,
      payload,
      item: {
        id: item.id,
        /** Igual que `currentStateKey` (sin columna `status` en BD). */
        status: (item.currentState as { key?: string } | undefined)?.key,
        currentStateKey: (item.currentState as { key?: string } | undefined)?.key,
        actionType: item.actionType,
        kind: item.kind,
        requiresDocument: item.requiresDocument,
        workflowId: (item.workflow as { id?: string } | undefined)?.id ?? null,
      },
      trackable: {
        id: trackable.id,
        status: trackable.status,
      },
      org: { id: (trackable as any).organization?.id ?? payload.organizationId },
    };
  }

  private async executeRule(
    rule: WorkflowRuleDefinition,
    item: WorkflowItem,
    organizationId: string,
    event: DomainEventName,
  ): Promise<void> {
    const action = rule.action as RuleAction;
    if (action.type === 'transition') {
      const ctx: WorkflowItemTransitionContext = {
        organizationId,
        permissions: [],
        automation: {
          ruleId: rule.id,
          ruleName: rule.name,
          source: rule.id.startsWith('code:') ? 'code_rule' : 'db_rule',
          triggerEvent: event,
        },
      };
      try {
        const target = (action.toStateKey ?? action.to) as WorkflowItemStatus;
        await this.workflow.transitionWorkflowItem(item.id, target, ctx);
      } catch (e) {
        this.logger.warn(
          `Rule ${rule.id} transition failed: ${(e as Error).message}`,
        );
        await this.logRuleFailure(item, organizationId, rule, e);
      }
      return;
    }
    if (action.type === 'notify') {
      this.logger.log(`Rule ${rule.id}: notify action not wired yet`);
    }
  }

  private async logRuleFailure(
    item: WorkflowItem,
    organizationId: string,
    rule: WorkflowRuleDefinition,
    err: unknown,
  ): Promise<void> {
    try {
      this.em.create(ActivityLog, {
        organization: organizationId as any,
        trackable: item.trackable,
        entityType: 'workflow_item',
        entityId: item.id,
        user: undefined,
        action: `rule_failed:${rule.id}`,
        details: { error: (err as Error).message, ruleName: rule.name },
      } as any);
      await this.em.flush();
    } catch {
      /* ignore */
    }
  }
}
