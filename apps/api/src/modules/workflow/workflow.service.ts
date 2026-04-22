import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  WorkflowItem,
  Trackable,
  ActivityLog,
  WorkflowState,
} from '@tracker/db';
import {
  WorkflowItemStatus,
  TrackableStatus,
  TrackableStateMachine,
  NOTIFICATION_TYPES,
  NOTIFICATION_RECIPIENT_ROLES,
  DomainEvents,
  legacyWorkflowCategoryForStatus,
  WorkflowStateCategory,
} from '@tracker/shared';
import { WorkflowGateway } from './workflow.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkflowEngineService } from './workflow-engine.service';
import type { WorkflowItemTransitionContext, WorkflowTransitionContext } from './workflow.types';
import { ticketKeyForItem } from './ticket-key.util';

export type { WorkflowItemTransitionContext } from './workflow.types';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly em: EntityManager,
    private readonly gateway: WorkflowGateway,
    private readonly notifications: NotificationsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  async transitionWorkflowItem(
    itemId: string,
    targetStatus: WorkflowItemStatus,
    ctx: WorkflowItemTransitionContext | WorkflowTransitionContext,
  ): Promise<WorkflowItem> {
    const item = await this.em.findOneOrFail(WorkflowItem, itemId, {
      populate: ['trackable', 'parent', 'children', 'assignedTo', 'organization', 'workflow', 'currentState'] as any,
    });

    if (!(await this.workflowEngine.shouldUseConfigurableEngine(item))) {
      throw new BadRequestException(
        'Workflow item requires configurable workflow: enable useConfigurableWorkflows for the organization and ensure workflow_id and current_state_id are set (run migrate:data:workflows).',
      );
    }

    const result = await this.workflowEngine.applyTransition(itemId, targetStatus, ctx);
    const { previousStatus } = result;
    const isAutomation = !!result.automation;
    const cascadeCtx: WorkflowTransitionContext = isAutomation
      ? {
          userId: 'system',
          organizationId: ctx.organizationId,
          permissions: [],
        }
      : (ctx as WorkflowTransitionContext);

    await this.checkCascade(result.item, cascadeCtx);

    this.gateway.emitWorkflowItemUpdate(result.item.organization.id, {
      itemId: result.item.id,
      trackableId: result.item.trackable.id,
      previousStatus,
      newStatus: targetStatus,
      updatedBy: isAutomation ? 'system' : (ctx as WorkflowTransitionContext).userId,
    });

    this.eventEmitter.emit(DomainEvents.WORKFLOW_ITEM_STATUS_CHANGED, {
      itemId: result.item.id,
      trackableId: result.item.trackable.id,
      organizationId: result.item.organization.id,
      previousStatus,
      newStatus: targetStatus,
      userId: isAutomation ? undefined : (ctx as WorkflowTransitionContext).userId,
      automation: isAutomation,
    });

    return result.item;
  }

  async transitionTrackable(
    trackableId: string,
    targetStatus: TrackableStatus,
    ctx: WorkflowTransitionContext,
  ): Promise<Trackable> {
    const trackable = await this.em.findOneOrFail(Trackable, trackableId);

    const transition = TrackableStateMachine.transitions.find(
      (t) => t.from === trackable.status && t.to === targetStatus,
    );

    if (!transition) {
      throw new BadRequestException(
        `Cannot transition trackable from '${trackable.status}' to '${targetStatus}'`,
      );
    }

    if (transition.requiredPermission && !ctx.permissions.includes(transition.requiredPermission)) {
      throw new ForbiddenException(
        `Permission '${transition.requiredPermission}' required`,
      );
    }

    const previousStatus = trackable.status;
    trackable.status = targetStatus;

    if (targetStatus === TrackableStatus.COMPLETED) {
      trackable.completedAt = new Date();
    }

    this.em.create(ActivityLog, {
      organization: trackable.organization,
      trackable,
      entityType: 'trackable',
      entityId: trackable.id,
      user: this.em.getReference('User', ctx.userId) as any,
      action: `status_change:${previousStatus}:${targetStatus}`,
      details: { transition: transition.label },
      previousValues: { status: previousStatus },
      newValues: { status: targetStatus },
    });

    await this.em.flush();

    this.gateway.emitTrackableUpdate(trackable.organization.id, {
      trackableId: trackable.id,
      previousStatus,
      newStatus: targetStatus,
      updatedBy: ctx.userId,
    });

    return trackable;
  }

  private cascadeUserRef(ctx: WorkflowTransitionContext) {
    if (!ctx.userId || ctx.userId === 'system') return undefined;
    return this.em.getReference('User', ctx.userId) as any;
  }

  private wiStateKey(wi: WorkflowItem): WorkflowItemStatus | undefined {
    return (wi.currentState as WorkflowState | undefined)?.key as WorkflowItemStatus | undefined;
  }

  private isWiCompleted(s: WorkflowItem): boolean {
    const k = this.wiStateKey(s);
    return (
      k === WorkflowItemStatus.CLOSED ||
      k === WorkflowItemStatus.VALIDATED ||
      k === WorkflowItemStatus.SKIPPED
    );
  }

  private async checkCascade(item: WorkflowItem, ctx: WorkflowTransitionContext): Promise<void> {
    if (!item.parent) {
      await this.checkTrackableCascade(item.trackable, ctx);
      return;
    }

    const siblings = await this.em.find(
      WorkflowItem,
      { parent: item.parent },
      { populate: ['currentState'] as any },
    );

    const allCompleted = siblings.every((s) => this.isWiCompleted(s));

    const parent = item.parent as WorkflowItem;
    await this.em.populate(parent, ['workflow', 'currentState'] as any);
    const parentKey = this.wiStateKey(parent);

    if (
      allCompleted &&
      parentKey !== WorkflowItemStatus.CLOSED &&
      parentKey !== WorkflowItemStatus.SKIPPED
    ) {
      const previousParentStatus = parentKey ?? WorkflowItemStatus.PENDING;
      const wf = parent.workflow as { id: string } | undefined;
      if (wf) {
        const closedSt = await this.em.findOne(WorkflowState, {
          workflow: wf,
          key: WorkflowItemStatus.CLOSED,
        });
        if (closedSt) {
          parent.currentState = closedSt;
        }
      }
      parent.completedAt = new Date();

      this.em.create(ActivityLog, {
        organization: item.organization,
        trackable: item.trackable,
        entityType: 'workflow_item',
        entityId: parent.id,
        user: this.cascadeUserRef(ctx),
        action: `auto_cascade:closed`,
        details: { reason: 'All children completed' },
      });

      await this.em.flush();

      this.gateway.emitWorkflowItemUpdate(item.organization.id, {
        itemId: parent.id,
        trackableId: item.trackable.id,
        previousStatus: previousParentStatus,
        newStatus: WorkflowItemStatus.CLOSED,
        updatedBy: 'system',
        isCascade: true,
      });

      await this.checkCascade(parent, ctx);
    }
  }

  private async checkTrackableCascade(
    trackable: Trackable,
    ctx: WorkflowTransitionContext,
  ): Promise<void> {
    const topLevelItems = await this.em.find(
      WorkflowItem,
      { trackable, parent: null },
      { populate: ['currentState'] as any },
    );

    const allCompleted = topLevelItems.every((wi) => this.isWiCompleted(wi));

    if (allCompleted && trackable.status === TrackableStatus.ACTIVE) {
      trackable.status = TrackableStatus.UNDER_REVIEW;

      this.em.create(ActivityLog, {
        organization: trackable.organization,
        trackable,
        entityType: 'trackable',
        entityId: trackable.id,
        user: this.cascadeUserRef(ctx),
        action: 'auto_cascade:under_review',
        details: { reason: 'All top-level workflow items completed' },
      });

      await this.em.populate(trackable, ['assignedTo'] as any);
      const ownerUser = trackable.assignedTo as { id: string } | undefined;
      if (ownerUser?.id) {
        await this.notifications.createFromParams({
          organizationId: ctx.organizationId,
          trackableId: trackable.id,
          type: NOTIFICATION_TYPES.TRACKABLE_REVIEW,
          title: `"${trackable.title}" is ready for review`,
          message: 'All workflow items have been completed.',
          data: { severity: 'info', source: 'workflow' },
          recipients: [{ userId: ownerUser.id, role: NOTIFICATION_RECIPIENT_ROLES.OWNER }],
        });
      }

      await this.em.flush();

      this.gateway.emitTrackableUpdate(trackable.organization.id, {
        trackableId: trackable.id,
        previousStatus: TrackableStatus.ACTIVE,
        newStatus: TrackableStatus.UNDER_REVIEW,
        updatedBy: 'system',
        isCascade: true,
      });
    }
  }

  /** Árbol anidado (solo raíces con `children` recursivos). */
  async getWorkflowTree(trackableId: string): Promise<Record<string, unknown>[]> {
    const items = await this.em.find(
      WorkflowItem,
      { trackable: trackableId },
      {
        orderBy: { depth: 'ASC', sortOrder: 'ASC' } as any,
        populate: ['assignedTo', 'parent', 'workflow', 'currentState', 'trackable'] as any,
      },
    );
    return this.buildNestedWorkflowTree(items);
  }

  private serializeWorkflowItemNode(item: WorkflowItem): Record<string, unknown> {
    const assigned = item.assignedTo as {
      id: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string | null;
    } | undefined;
    const createdAt = item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt;
    const updatedAt = item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt;
    const cur = item.currentState as WorkflowState | undefined;
    const wf = item.workflow as { id: string; slug?: string } | undefined;
    const tr = item.trackable as Trackable | undefined;
    const ticketKey = ticketKeyForItem(tr, item.itemNumber);
    const stateKey = (cur?.key as WorkflowItemStatus | undefined) ?? undefined;
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      kind: item.kind,
      actionType: item.actionType,
      /** @deprecated Prefer stateKey; kept for API compatibility (same as stateKey). */
      status: stateKey ?? null,
      workflowId: wf?.id ?? null,
      workflowSlug: wf?.slug ?? null,
      currentStateId: cur?.id ?? null,
      stateKey: stateKey ?? null,
      stateCategory:
        cur?.category ?? (stateKey ? legacyWorkflowCategoryForStatus(stateKey) : WorkflowStateCategory.TODO),
      sortOrder: item.sortOrder,
      depth: item.depth,
      itemNumber: item.itemNumber,
      ticketKey,
      priority: item.priority,
      location: item.location ?? null,
      allDay: item.allDay,
      calendarColor: item.calendarColor ?? null,
      startDate: item.startDate,
      dueDate: item.dueDate,
      completedAt: item.completedAt,
      createdAt,
      updatedAt,
      requiresDocument: item.requiresDocument,
      isLegalDeadline: item.isLegalDeadline,
      accentColor: item.accentColor ?? null,
      instantiatedFromTemplateItemId: item.instantiatedFromTemplateItemId,
      metadata: item.metadata,
      parentId: item.parent ? (item.parent as { id: string }).id : null,
      assignedTo: assigned
        ? {
            id: assigned.id,
            email: assigned.email,
            firstName: assigned.firstName,
            lastName: assigned.lastName,
            avatarUrl: assigned.avatarUrl ?? null,
          }
        : null,
      children: [] as Record<string, unknown>[],
    };
  }

  private buildNestedWorkflowTree(items: WorkflowItem[]): Record<string, unknown>[] {
    const nodes = new Map<string, Record<string, unknown>>();
    for (const it of items) {
      nodes.set(it.id, this.serializeWorkflowItemNode(it));
    }
    const roots: Record<string, unknown>[] = [];
    for (const it of items) {
      const node = nodes.get(it.id)!;
      const pid = it.parent ? (it.parent as { id: string }).id : null;
      if (pid && nodes.has(pid)) {
        (nodes.get(pid)!.children as Record<string, unknown>[]).push(node);
      } else {
        roots.push(node);
      }
    }
    const sortRec = (arr: Record<string, unknown>[]) => {
      arr.sort((a, b) => (a.sortOrder as number) - (b.sortOrder as number));
      for (const n of arr) {
        const ch = n.children as Record<string, unknown>[] | undefined;
        if (ch?.length) sortRec(ch);
      }
    };
    sortRec(roots);
    return roots;
  }

  async getAvailableTransitions(
    itemId: string,
    permissions: string[],
  ): Promise<Array<{ to: string; label: string; category: WorkflowStateCategory }>> {
    const item = await this.em.findOneOrFail(WorkflowItem, itemId, {
      populate: ['workflow', 'currentState', 'organization'] as any,
    });
    if (!(await this.workflowEngine.shouldUseConfigurableEngine(item))) {
      throw new BadRequestException(
        'Configurable workflow required to list transitions.',
      );
    }
    return this.workflowEngine.getAvailableTransitions(item, permissions);
  }

  async getTransitionsToCategory(
    itemId: string,
    category: WorkflowStateCategory,
    permissions: string[],
  ): Promise<Array<{ to: string; label: string }>> {
    const item = await this.em.findOneOrFail(WorkflowItem, itemId, {
      populate: ['workflow', 'currentState', 'organization'] as any,
    });
    if (!(await this.workflowEngine.shouldUseConfigurableEngine(item))) {
      throw new BadRequestException(
        'Configurable workflow required to list transitions.',
      );
    }
    return this.workflowEngine.getTransitionsToCategory(item, category, permissions);
  }
}
