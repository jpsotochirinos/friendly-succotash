import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  WorkflowDefinition,
  WorkflowState,
  WorkflowItem,
  Trackable,
  LegalDeadline,
  LegalProcessStageLog,
} from '@tracker/db';
import { LEGAL_PROCESS_ROOT_KIND } from '@tracker/shared';
import { allocateWorkflowItemNumbers } from '../../workflow-items/workflow-item-number.util';

@Injectable()
export class LegalProcessTemplateService {
  private readonly logger = new Logger(LegalProcessTemplateService.name);

  constructor(private readonly em: EntityManager) {}

  async getAvailableTemplates(): Promise<WorkflowDefinition[]> {
    return this.em.find(
      WorkflowDefinition,
      {
        isSystem: true,
        legalProcessCode: { $ne: null },
        organization: null,
      },
      { orderBy: { legalProcessCode: 'ASC' } },
    );
  }

  async instantiateForTrackable(
    organizationId: string,
    trackableId: string,
    workflowDefinitionId: string,
  ): Promise<{ workflow: WorkflowDefinition; rootItem: WorkflowItem }> {
    const existing = await this.em.findOne(WorkflowItem, {
      trackable: trackableId,
      kind: LEGAL_PROCESS_ROOT_KIND,
      parent: null,
      organization: organizationId,
    });
    if (existing) {
      throw new BadRequestException('Este expediente ya tiene un proceso legal inicializado');
    }

    await this.em.findOneOrFail(Trackable, { id: trackableId, organization: organizationId });

    const wf = await this.em.findOne(WorkflowDefinition, {
      id: workflowDefinitionId,
      legalProcessCode: { $ne: null },
      isSystem: true,
      organization: null,
    });
    if (!wf) {
      throw new NotFoundException('Plantilla procesal no encontrada o no es de sistema');
    }

    const initial = await this.em.findOne(WorkflowState, {
      workflow: wf.id,
      isInitial: true,
    });
    if (!initial) {
      throw new BadRequestException('La plantilla no tiene estado inicial (isInitial)');
    }

    const [nextNum] = await allocateWorkflowItemNumbers(this.em, trackableId, 1);

    const root = this.em.create(WorkflowItem, {
      organization: organizationId,
      trackable: trackableId,
      parent: undefined,
      title: wf.name,
      description: wf.description,
      kind: LEGAL_PROCESS_ROOT_KIND,
      workflow: wf,
      currentState: initial,
      itemNumber: nextNum,
      depth: 0,
      sortOrder: 0,
    } as any);

    await this.em.persistAndFlush(root);
    this.logger.log(`Proceso legal instanciado: trackable=${trackableId}, workflow=${wf.slug}`);
    return { workflow: wf, rootItem: root };
  }

  async getTimeline(organizationId: string, trackableId: string) {
    const root = await this.em.findOne(
      WorkflowItem,
      {
        trackable: trackableId,
        kind: LEGAL_PROCESS_ROOT_KIND,
        parent: null,
        organization: organizationId,
      },
      { populate: ['workflow', 'currentState'] },
    );

    if (!root || !root.workflow) {
      return { hasProcess: false as const };
    }

    const wf = root.workflow;
    const stages = await this.em.find(
      WorkflowState,
      { workflow: wf.id },
      { orderBy: [{ stageOrderIndex: 'ASC' }, { sortOrder: 'ASC' }] },
    );

    const deadlines = await this.em.find(
      LegalDeadline,
      { organization: organizationId, trackable: trackableId },
      { orderBy: { dueDate: 'ASC' }, populate: ['workflowState'] },
    );

    const logs = await this.em.find(
      LegalProcessStageLog,
      { organization: organizationId, trackable: trackableId },
      { orderBy: { advancedAt: 'DESC' }, populate: ['fromState', 'toState'] },
    );

    const currentId = root.currentState?.id ?? null;
    const currentOrder = root.currentState?.stageOrderIndex ?? -1;

    return {
      hasProcess: true as const,
      workflow: {
        id: wf.id,
        name: wf.name,
        slug: wf.slug,
        legalProcessCode: wf.legalProcessCode,
        applicableLaw: wf.applicableLaw,
      },
      currentStateId: currentId,
      stages: stages.map((s) => ({
        id: s.id,
        key: s.key,
        name: s.name,
        stageOrderIndex: s.stageOrderIndex,
        deadlineType: s.deadlineType,
        deadlineDays: s.deadlineDays,
        deadlineCalendarType: s.deadlineCalendarType,
        deadlineLawRef: s.deadlineLawRef,
        category: s.category,
        status:
          currentId === s.id
            ? 'active'
            : s.stageOrderIndex != null && currentOrder >= 0 && s.stageOrderIndex < currentOrder
              ? 'completed'
              : s.stageOrderIndex != null && s.stageOrderIndex > currentOrder
                ? 'pending'
                : 'pending',
      })),
      deadlines: deadlines.map((d) => ({
        id: d.id,
        dueDate: d.dueDate,
        status: d.status,
        workflowStateId: d.workflowState.id,
        lawRef: d.lawRef,
      })),
      logs: logs.map((l) => ({
        id: l.id,
        advancedAt: l.advancedAt,
        advancedBy: l.advancedBy,
        fromStateId: l.fromState?.id ?? null,
        toStateId: l.toState.id,
      })),
    };
  }
}
