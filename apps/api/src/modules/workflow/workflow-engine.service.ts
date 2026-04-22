import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  ActivityLog,
  Organization,
  WorkflowItem,
  WorkflowState,
  WorkflowTransition,
} from '@tracker/db';
import { WorkflowItemStatus, WorkflowStateCategory } from '@tracker/shared';
import type { WorkflowItemTransitionContext } from './workflow.types';

@Injectable()
export class WorkflowEngineService {
  constructor(private readonly em: EntityManager) {}

  async orgUsesConfigurableWorkflows(organizationId: string): Promise<boolean> {
    const org = await this.em.findOne(Organization, organizationId, {
      fields: ['id', 'featureFlags'],
      filters: false,
    });
    return !!(org as Organization | null)?.featureFlags?.useConfigurableWorkflows;
  }

  async shouldUseConfigurableEngine(item: WorkflowItem): Promise<boolean> {
    const orgId = (item.organization as { id: string }).id;
    const flag = await this.orgUsesConfigurableWorkflows(orgId);
    if (!flag) return false;
    if (!item.workflow || !item.currentState) return false;
    return true;
  }

  async getAvailableTransitions(
    item: WorkflowItem,
    permissions: string[],
  ): Promise<Array<{ to: string; label: string; category: WorkflowStateCategory }>> {
    const wf = item.workflow;
    const from = item.currentState;
    if (!wf || !from) return [];

    const transitions = await this.em.find(
      WorkflowTransition,
      { workflow: wf, fromState: from },
      { populate: ['toState'] as any, orderBy: { name: 'ASC' } as any },
    );

    return transitions
      .filter((t) => !t.requiredPermission || permissions.includes(t.requiredPermission))
      .map((t) => {
        const toSt = t.toState as WorkflowState;
        return {
          to: toSt.key,
          label: t.name,
          category: toSt.category,
        };
      });
  }

  /** Transiciones permitidas cuyo estado destino cae en la categoría indicada (orden por sort_order del destino). */
  async getTransitionsToCategory(
    item: WorkflowItem,
    category: WorkflowStateCategory,
    permissions: string[],
  ): Promise<Array<{ to: string; label: string }>> {
    const wf = item.workflow;
    const from = item.currentState;
    if (!wf || !from) return [];

    const transitions = await this.em.find(
      WorkflowTransition,
      { workflow: wf, fromState: from },
      { populate: ['toState'] as any, orderBy: { name: 'ASC' } as any },
    );

    const filtered = transitions.filter((t) => {
      if (t.requiredPermission && !permissions.includes(t.requiredPermission)) return false;
      const toSt = t.toState as WorkflowState;
      return toSt.category === category;
    });

    filtered.sort((a, b) => {
      const sa = (a.toState as WorkflowState).sortOrder;
      const sb = (b.toState as WorkflowState).sortOrder;
      return sa - sb || a.name.localeCompare(b.name);
    });

    return filtered.map((t) => ({
      to: (t.toState as WorkflowState).key,
      label: t.name,
    }));
  }

  /**
   * Aplica transición vía definición en BD. Actualiza `status` (legacy) y `currentState`.
   */
  async applyTransition(
    itemId: string,
    targetStatus: WorkflowItemStatus,
    ctx: WorkflowItemTransitionContext | { userId: string; organizationId: string; permissions: string[] },
  ): Promise<{
    item: WorkflowItem;
    previousStatus: WorkflowItemStatus;
    transitionLabel: string;
    automation?: WorkflowItemTransitionContext['automation'];
  }> {
    const item = await this.em.findOneOrFail(
      WorkflowItem,
      { id: itemId },
      { populate: ['trackable', 'parent', 'children', 'assignedTo', 'organization', 'workflow', 'currentState'] as any },
    );

    const automation = 'automation' in ctx ? ctx.automation : undefined;
    const isAutomation = !!automation;

    if (!isAutomation && !('userId' in ctx && ctx.userId)) {
      throw new BadRequestException('userId required when not an automated transition');
    }

    if (!(await this.shouldUseConfigurableEngine(item))) {
      throw new BadRequestException('Item is not on configurable workflow engine');
    }

    const wf = item.workflow!;
    const fromState = item.currentState!;

    const toState = await this.em.findOne(WorkflowState, {
      workflow: wf,
      key: targetStatus,
    });
    if (!toState) {
      throw new BadRequestException(`Unknown state key '${targetStatus}' for this workflow`);
    }

    const transition = await this.em.findOne(WorkflowTransition, {
      workflow: wf,
      fromState,
      toState,
    });

    if (!transition) {
      throw new BadRequestException(
        `Cannot transition from '${fromState.key}' to '${targetStatus}'`,
      );
    }

    if (
      !isAutomation &&
      transition.requiredPermission &&
      !ctx.permissions.includes(transition.requiredPermission)
    ) {
      throw new ForbiddenException(
        `Permission '${transition.requiredPermission}' required for this transition`,
      );
    }

    const previousStatus = fromState.key as WorkflowItemStatus;
    item.currentState = toState;

    if (targetStatus === WorkflowItemStatus.CLOSED || targetStatus === WorkflowItemStatus.VALIDATED) {
      item.completedAt = new Date();
    }

    if (targetStatus === WorkflowItemStatus.REJECTED) {
      item.completedAt = undefined;
    }

    const userRef =
      isAutomation || !('userId' in ctx) || !ctx.userId
        ? undefined
        : (this.em.getReference('User', ctx.userId) as any);

    const logAction = automation
      ? `status_change_rule:${automation.ruleId}:${previousStatus}:${targetStatus}`
      : `status_change:${previousStatus}:${targetStatus}`;

    this.em.create(ActivityLog, {
      organization: item.organization,
      trackable: item.trackable,
      entityType: 'workflow_item',
      entityId: item.id,
      user: userRef,
      action: logAction,
      details: {
        transition: transition.name,
        engine: 'configurable',
        ...(automation
          ? {
              automation: true,
              ruleId: automation.ruleId,
              ruleName: automation.ruleName,
              source: automation.source,
              triggerEvent: automation.triggerEvent,
            }
          : {}),
      },
      previousValues: { stateKey: previousStatus, currentStateId: fromState.id },
      newValues: { stateKey: targetStatus, currentStateId: toState.id },
    });

    await this.em.flush();

    return {
      item,
      previousStatus,
      transitionLabel: transition.name,
      automation,
    };
  }
}
