import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  Organization,
  WorkflowDefinition,
  WorkflowItem,
  WorkflowState,
} from '@tracker/db';
import {
  ActionType,
  MatterType,
  WorkflowItemStatus,
  matterFallbackWorkflowSlug,
  systemWorkflowSlugForActionType,
} from '@tracker/shared';

export type ResolveLeafWorkflowArgs = {
  organizationId: string;
  matterType: MatterType;
  actionType?: ActionType | null;
  /** Desde `WorkflowTemplateItem.workflow` si la plantilla fija un flujo. */
  templateWorkflowId?: string | null;
  /** Override explícito (DTO al crear actividad o cambio manual). */
  explicitWorkflowId?: string | null;
};

@Injectable()
export class WorkflowAssignmentService {
  constructor(private readonly em: EntityManager) {}

  async findInitialState(em: EntityManager, wf: WorkflowDefinition): Promise<WorkflowState | null> {
    const byInitial = await em.findOne(
      WorkflowState,
      { workflow: wf, isInitial: true },
      { orderBy: { sortOrder: 'ASC' } as any },
    );
    if (byInitial) return byInitial;
    return em.findOne(WorkflowState, {
      workflow: wf,
      key: WorkflowItemStatus.PENDING,
    });
  }

  private assertOrgCanUseWorkflow(organizationId: string, wf: WorkflowDefinition): void {
    if (wf.isSystem) return;
    const oid = (wf.organization as { id?: string } | undefined)?.id;
    if (!oid || oid !== organizationId) {
      throw new ForbiddenException('Workflow does not belong to this organization');
    }
  }

  /**
   * Prioridad: templateWorkflowId > explicitWorkflowId > org.workflowActionTypeDefaults[actionType]
   * > workflow sistema `action-{actionType}-default` > matterFallbackWorkflowSlug.
   */
  async resolveLeafWorkflow(
    em: EntityManager,
    args: ResolveLeafWorkflowArgs,
  ): Promise<{ workflow: WorkflowDefinition; currentState: WorkflowState } | null> {
    const { organizationId, matterType } = args;
    const actionType = args.actionType ?? ActionType.GENERIC;

    const tryLoad = async (id: string): Promise<WorkflowDefinition | null> => {
      const wf = await em.findOne(
        WorkflowDefinition,
        { id },
        { populate: ['organization'] as any },
      );
      return wf;
    };

    let wf: WorkflowDefinition | null = null;

    if (args.templateWorkflowId) {
      wf = await tryLoad(args.templateWorkflowId);
    }
    if (!wf && args.explicitWorkflowId) {
      wf = await tryLoad(args.explicitWorkflowId);
    }

    if (!wf) {
      const org = await em.findOne(Organization, organizationId, { filters: false });
      const overrideId = org?.workflowActionTypeDefaults?.[actionType];
      if (overrideId) {
        wf = await tryLoad(overrideId);
      }
    }

    if (!wf) {
      const slug = systemWorkflowSlugForActionType(actionType);
      wf = await em.findOne(WorkflowDefinition, {
        slug,
        isSystem: true,
        organization: null,
      });
    }

    if (!wf) {
      const fallbackSlug = matterFallbackWorkflowSlug(matterType);
      wf = await em.findOne(WorkflowDefinition, {
        slug: fallbackSlug,
        isSystem: true,
        organization: null,
      });
    }

    if (!wf) {
      return null;
    }

    this.assertOrgCanUseWorkflow(organizationId, wf);

    const currentState = await this.findInitialState(em, wf);
    if (!currentState) {
      return null;
    }

    return { workflow: wf, currentState };
  }

  /** Cambia el flujo de una actividad hoja y reinicia al estado inicial del nuevo workflow. */
  async applyWorkflowToLeafItem(
    itemId: string,
    workflowId: string,
    organizationId: string,
  ): Promise<void> {
    const item = await this.em.findOne(
      WorkflowItem,
      { id: itemId, organization: organizationId },
      { populate: ['parent'] as any },
    );
    if (!item) throw new NotFoundException('Workflow item not found');

    const childCount = await this.em.count(WorkflowItem, { parent: item } as any);
    if (childCount > 0) {
      throw new ForbiddenException('Only leaf activities can have a workflow assigned');
    }

    const wf = await this.em.findOne(WorkflowDefinition, { id: workflowId }, {
      populate: ['organization'] as any,
    });
    if (!wf) throw new NotFoundException('Workflow not found');
    this.assertOrgCanUseWorkflow(organizationId, wf);

    const currentState = await this.findInitialState(this.em, wf);
    if (!currentState) {
      throw new NotFoundException('Workflow has no initial state');
    }

    item.workflow = wf;
    item.currentState = currentState;
  }
}
