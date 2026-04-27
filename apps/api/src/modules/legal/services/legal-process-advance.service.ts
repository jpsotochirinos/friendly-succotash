import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { EntityManager as PgEntityManager } from '@mikro-orm/postgresql';
import {
  Trackable,
  WorkflowState,
  WorkflowItem,
  WorkflowTransition,
  LegalProcessStageLog,
  SinoeNotification,
  User,
} from '@tracker/db';
import { AdvancedByType, DeadlineType, LEGAL_PROCESS_ROOT_KIND } from '@tracker/shared';
import { LegalDeadlineService } from './legal-deadline.service';

@Injectable()
export class LegalProcessAdvanceService {
  private readonly logger = new Logger(LegalProcessAdvanceService.name);

  constructor(
    private readonly em: PgEntityManager,
    private readonly deadlineService: LegalDeadlineService,
  ) {}

  private mgr(em?: EntityManager): EntityManager {
    return em ?? this.em;
  }

  async advanceManual(
    organizationId: string,
    trackableId: string,
    targetStateId: string,
    userId: string,
    force: boolean = false,
    em?: EntityManager,
  ): Promise<void> {
    const m = this.mgr(em);
    const root = await this.findProcessRoot(m, organizationId, trackableId);
    if (!root) {
      throw new NotFoundException('No hay proceso legal en este expediente');
    }
    await m.populate(root, ['currentState', 'workflow']);
    const targetState = await m.findOneOrFail(
      WorkflowState,
      { id: targetStateId },
      { populate: ['workflow'] },
    );
    if (targetState.workflow.id !== root.workflow!.id) {
      throw new BadRequestException('El estado no pertenece al flujo del expediente');
    }

    const current = root.currentState ?? undefined;
    if (!force && current) {
      await this.assertCanTransition(m, root.workflow!.id, current.id, targetState.id);
    }

    if (current?.id === targetState.id) {
      return;
    }

    await this.internalAdvance(
      m,
      organizationId,
      trackableId,
      root,
      current ?? null,
      targetState,
      AdvancedByType.MANUAL,
      userId,
      undefined,
      undefined,
      false,
    );
  }

  /**
   * Avance por SINOE: debe llamarse dentro de la misma transacción / fork que carga la notificación.
   */
  async advanceAutomaticBySinoe(
    organizationId: string,
    notification: SinoeNotification,
    targetState: WorkflowState,
    em?: EntityManager,
  ): Promise<void> {
    const m = this.mgr(em);
    const toState = await m.findOneOrFail(
      WorkflowState,
      { id: targetState.id },
      { populate: ['workflow'] },
    );
    const trackable = notification.trackable;
    if (!trackable) {
      return;
    }
    const tid = typeof trackable === 'object' ? trackable.id : trackable;
    const root = await this.findProcessRoot(m, organizationId, tid);
    if (!root) {
      return;
    }
    await m.populate(root, ['currentState', 'workflow']);
    const current = root.currentState ?? undefined;
    if (toState.workflow.id !== root.workflow!.id) {
      return;
    }
    if (current?.id === toState.id) {
      return;
    }
    await this.assertCanTransition(m, root.workflow!.id, current?.id, toState.id);

    await this.internalAdvance(
      m,
      organizationId,
      tid,
      root,
      current ?? null,
      toState,
      AdvancedByType.SINOE,
      null,
      notification,
      notification.fecha,
      true,
    );
  }

  private async findProcessRoot(
    m: EntityManager,
    organizationId: string,
    trackableId: string,
  ): Promise<WorkflowItem | null> {
    return m.findOne(
      WorkflowItem,
      {
        trackable: trackableId,
        kind: LEGAL_PROCESS_ROOT_KIND,
        parent: null,
        organization: organizationId,
      },
      { populate: ['workflow', 'currentState'] },
    );
  }

  private async assertCanTransition(
    m: EntityManager,
    workflowId: string,
    fromStateId: string | undefined,
    toStateId: string,
  ): Promise<void> {
    const list = await m.find(WorkflowTransition, {
      workflow: workflowId,
      toState: toStateId,
    });
    const ok = list.some(
      (t) => !t.fromState || (fromStateId != null && t.fromState.id === fromStateId),
    );
    if (!ok) {
      throw new BadRequestException('Transición no permitida entre etapas');
    }
  }

  private async internalAdvance(
    m: EntityManager,
    organizationId: string,
    trackableId: string,
    root: WorkflowItem,
    fromState: WorkflowState | null,
    toState: WorkflowState,
    advancedBy: AdvancedByType,
    userId: string | null,
    sinoeNotification: SinoeNotification | undefined,
    _notificationDate: Date | undefined,
    fromSinoe: boolean,
  ): Promise<void> {
    const trackable = await m.findOneOrFail(Trackable, { id: trackableId, organization: organizationId });

    root.currentState = toState;
    await m.flush();

    const log = m.create(LegalProcessStageLog, {
      organization: organizationId,
      trackable,
      processRootItem: root,
      fromState: fromState ? m.getReference(WorkflowState, fromState.id) : undefined,
      toState: m.getReference(WorkflowState, toState.id),
      advancedBy,
      sinoeNotification: sinoeNotification
        ? m.getReference(SinoeNotification, sinoeNotification.id)
        : undefined,
      advancedByUser: userId ? m.getReference(User, userId) : undefined,
      advancedAt: new Date(),
    } as any);
    await m.persistAndFlush(log);

    if (toState.deadlineType === DeadlineType.FROM_STAGE_START && toState.deadlineDays != null) {
      await this.deadlineService.createStageStartDeadline(
        organizationId,
        trackableId,
        root,
        toState,
        new Date(),
        m,
      );
    }

    if (
      fromSinoe &&
      toState.deadlineType === DeadlineType.FROM_NOTIFICATION &&
      toState.deadlineDays != null &&
      sinoeNotification
    ) {
      await this.deadlineService.createNotificationDeadlineFromSinoe(
        organizationId,
        trackableId,
        root,
        toState,
        sinoeNotification.fecha,
        sinoeNotification,
        m,
      );
    }

    this.logger.log(
      `Avance procesal: trackable=${trackableId} ${fromState?.name ?? '—'} → ${toState.name} (${advancedBy})`,
    );
  }
}
