import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  WorkflowItem, Trackable, ActivityLog, Notification,
} from '@tracker/db';
import {
  WorkflowItemStatus, TrackableStatus, WorkflowItemStateMachine,
  TrackableStateMachine,
} from '@tracker/shared';
import { WorkflowGateway } from './workflow.gateway';

interface TransitionContext {
  userId: string;
  organizationId: string;
  permissions: string[];
}

@Injectable()
export class WorkflowService {
  constructor(
    private readonly em: EntityManager,
    private readonly gateway: WorkflowGateway,
  ) {}

  async transitionWorkflowItem(
    itemId: string,
    targetStatus: WorkflowItemStatus,
    ctx: TransitionContext,
  ): Promise<WorkflowItem> {
    const item = await this.em.findOneOrFail(WorkflowItem, itemId, {
      populate: ['trackable', 'parent', 'children', 'assignedTo'] as any,
    });

    const transition = WorkflowItemStateMachine.transitions.find(
      (t) => t.from === item.status && t.to === targetStatus,
    );

    if (!transition) {
      throw new BadRequestException(
        `Cannot transition from '${item.status}' to '${targetStatus}'`,
      );
    }

    if (transition.requiredPermission && !ctx.permissions.includes(transition.requiredPermission)) {
      throw new ForbiddenException(
        `Permission '${transition.requiredPermission}' required for this transition`,
      );
    }

    const previousStatus = item.status;
    item.status = targetStatus;

    if (targetStatus === WorkflowItemStatus.CLOSED || targetStatus === WorkflowItemStatus.VALIDATED) {
      item.completedAt = new Date();
    }

    if (targetStatus === WorkflowItemStatus.REJECTED) {
      item.completedAt = undefined;
    }

    this.em.create(ActivityLog, {
      organization: item.organization,
      trackable: item.trackable,
      entityType: 'workflow_item',
      entityId: item.id,
      user: this.em.getReference('User', ctx.userId) as any,
      action: `status_change:${previousStatus}:${targetStatus}`,
      details: { transition: transition.label },
      previousValues: { status: previousStatus },
      newValues: { status: targetStatus },
    });

    await this.em.flush();

    await this.checkCascade(item, ctx);

    this.gateway.emitWorkflowItemUpdate(item.organization.id, {
      itemId: item.id,
      trackableId: item.trackable.id,
      previousStatus,
      newStatus: targetStatus,
      updatedBy: ctx.userId,
    });

    return item;
  }

  async transitionTrackable(
    trackableId: string,
    targetStatus: TrackableStatus,
    ctx: TransitionContext,
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

  private async checkCascade(item: WorkflowItem, ctx: TransitionContext): Promise<void> {
    if (!item.parent) {
      await this.checkTrackableCascade(item.trackable, ctx);
      return;
    }

    const siblings = await this.em.find(WorkflowItem, {
      parent: item.parent,
    });

    const allCompleted = siblings.every(
      (s) =>
        s.status === WorkflowItemStatus.CLOSED ||
        s.status === WorkflowItemStatus.VALIDATED ||
        s.status === WorkflowItemStatus.SKIPPED,
    );

    if (allCompleted && ![WorkflowItemStatus.CLOSED, WorkflowItemStatus.SKIPPED].includes(item.parent.status)) {
      const previousParentStatus = item.parent.status;
      item.parent.status = WorkflowItemStatus.CLOSED;
      item.parent.completedAt = new Date();

      this.em.create(ActivityLog, {
        organization: item.organization,
        trackable: item.trackable,
        entityType: 'workflow_item',
        entityId: item.parent.id,
        user: this.em.getReference('User', ctx.userId) as any,
        action: `auto_cascade:closed`,
        details: { reason: 'All children completed' },
      });

      await this.em.flush();

      this.gateway.emitWorkflowItemUpdate(item.organization.id, {
        itemId: item.parent.id,
        trackableId: item.trackable.id,
        previousStatus: previousParentStatus,
        newStatus: WorkflowItemStatus.CLOSED,
        updatedBy: 'system',
        isCascade: true,
      });

      await this.checkCascade(item.parent, ctx);
    }
  }

  private async checkTrackableCascade(
    trackable: Trackable,
    ctx: TransitionContext,
  ): Promise<void> {
    const topLevelItems = await this.em.find(WorkflowItem, {
      trackable,
      parent: null,
    });

    const allCompleted = topLevelItems.every(
      (item) =>
        item.status === WorkflowItemStatus.CLOSED ||
        item.status === WorkflowItemStatus.VALIDATED ||
        item.status === WorkflowItemStatus.SKIPPED,
    );

    if (allCompleted && trackable.status === TrackableStatus.ACTIVE) {
      trackable.status = TrackableStatus.UNDER_REVIEW;

      this.em.create(ActivityLog, {
        organization: trackable.organization,
        trackable,
        entityType: 'trackable',
        entityId: trackable.id,
        user: this.em.getReference('User', ctx.userId) as any,
        action: 'auto_cascade:under_review',
        details: { reason: 'All top-level workflow items completed' },
      });

      const owner = await this.em.findOne('User', { organization: trackable.organization }, {
        filters: false,
      });

      if (owner) {
        this.em.create(Notification, {
          organization: trackable.organization,
          user: owner as any,
          trackable,
          type: 'trackable_review',
          title: `"${trackable.title}" is ready for review`,
          message: 'All workflow items have been completed.',
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

  async getWorkflowTree(trackableId: string): Promise<WorkflowItem[]> {
    const items = await this.em.find(
      WorkflowItem,
      { trackable: trackableId },
      { orderBy: { depth: 'ASC', sortOrder: 'ASC' } as any, populate: ['assignedTo', 'children'] as any },
    );
    return items;
  }

  async getAvailableTransitions(
    itemId: string,
    permissions: string[],
  ): Promise<Array<{ to: string; label: string }>> {
    const item = await this.em.findOneOrFail(WorkflowItem, itemId);
    return WorkflowItemStateMachine.getAvailableTransitions(item.status)
      .filter((t) => !t.requiredPermission || permissions.includes(t.requiredPermission))
      .map((t) => ({ to: t.to, label: t.label }));
  }
}
