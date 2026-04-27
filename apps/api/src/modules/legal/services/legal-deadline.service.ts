import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { EntityManager as PgEntityManager } from '@mikro-orm/postgresql';
import {
  LegalDeadline,
  WorkflowState,
  Trackable,
  WorkflowItem,
  SinoeNotification,
} from '@tracker/db';
import {
  DeadlineTriggerType,
  LegalDeadlineStatus,
  DeadlineType,
  LEGAL_PROCESS_ROOT_KIND,
} from '@tracker/shared';
import { LegalDeadlineCalculatorService } from './legal-deadline-calculator.service';

@Injectable()
export class LegalDeadlineService {
  private readonly logger = new Logger(LegalDeadlineService.name);

  constructor(
    private readonly em: PgEntityManager,
    private readonly calculator: LegalDeadlineCalculatorService,
  ) {}

  private mgr(em?: EntityManager): EntityManager {
    return em ?? this.em;
  }

  async registerNotificationDate(
    organizationId: string,
    trackableId: string,
    workflowStateId: string,
    notificationDate: Date,
    triggerType: DeadlineTriggerType = DeadlineTriggerType.MANUAL,
    em?: EntityManager,
  ): Promise<LegalDeadline> {
    const m = this.mgr(em);
    const state = await m.findOneOrFail(
      WorkflowState,
      { id: workflowStateId },
      { populate: ['workflow'] },
    );

    if (state.deadlineType !== DeadlineType.FROM_NOTIFICATION) {
      throw new BadRequestException(
        `La etapa no tiene plazo desde notificación (FROM_NOTIFICATION)`,
      );
    }
    if (state.deadlineDays == null) {
      throw new BadRequestException(`La etapa no tiene deadlineDays configurado`);
    }

    const trackable = await m.findOneOrFail(Trackable, { id: trackableId, organization: organizationId });
    const root = await m.findOne(WorkflowItem, {
      trackable: trackableId,
      kind: LEGAL_PROCESS_ROOT_KIND,
      parent: null,
      organization: organizationId,
    });

    const dueDate = await this.calculator.calcularPlazo(
      notificationDate,
      state.deadlineDays,
      state.deadlineCalendarType,
      { organizationId, courtName: trackable.court ?? undefined },
    );

    const deadline = m.create(LegalDeadline, {
      organization: organizationId,
      trackable,
      workflowState: state,
      processRootItem: root ?? undefined,
      triggerType,
      triggerDate: notificationDate,
      legalDays: state.deadlineDays,
      dueDate,
      calendarType: state.deadlineCalendarType,
      lawRef: state.deadlineLawRef ?? undefined,
      status: LegalDeadlineStatus.PENDING,
    } as any);

    await m.persistAndFlush(deadline);
    this.logger.log(
      `LegalDeadline creado: trackable=${trackableId}, state=${state.name}, due=${dueDate.toISOString()}`,
    );
    return deadline;
  }

  async createStageStartDeadline(
    organizationId: string,
    trackableId: string,
    processRoot: WorkflowItem,
    state: WorkflowState,
    triggerDate: Date,
    em?: EntityManager,
  ): Promise<LegalDeadline | null> {
    if (state.deadlineType !== DeadlineType.FROM_STAGE_START || state.deadlineDays == null) {
      return null;
    }
    const m = this.mgr(em);
    const trackable = await m.findOneOrFail(Trackable, { id: trackableId, organization: organizationId });
    const dueDate = await this.calculator.calcularPlazo(
      triggerDate,
      state.deadlineDays,
      state.deadlineCalendarType,
      { organizationId, courtName: trackable.court ?? undefined },
    );
    const deadline = m.create(LegalDeadline, {
      organization: organizationId,
      trackable,
      workflowState: state,
      processRootItem: processRoot,
      triggerType: DeadlineTriggerType.STAGE_ENTERED,
      triggerDate,
      legalDays: state.deadlineDays,
      dueDate,
      calendarType: state.deadlineCalendarType,
      lawRef: state.deadlineLawRef ?? undefined,
      status: LegalDeadlineStatus.PENDING,
    } as any);
    await m.persistAndFlush(deadline);
    return deadline;
  }

  async createNotificationDeadlineFromSinoe(
    organizationId: string,
    trackableId: string,
    processRoot: WorkflowItem,
    state: WorkflowState,
    notificationDate: Date,
    notification: SinoeNotification,
    em?: EntityManager,
  ): Promise<LegalDeadline | null> {
    if (state.deadlineType !== DeadlineType.FROM_NOTIFICATION || state.deadlineDays == null) {
      return null;
    }
    const m = this.mgr(em);
    const trackable = await m.findOneOrFail(Trackable, { id: trackableId, organization: organizationId });
    const dueDate = await this.calculator.calcularPlazo(
      notificationDate,
      state.deadlineDays,
      state.deadlineCalendarType,
      { organizationId, courtName: trackable.court ?? undefined },
    );
    const deadline = m.create(LegalDeadline, {
      organization: organizationId,
      trackable,
      workflowState: state,
      processRootItem: processRoot,
      triggerType: DeadlineTriggerType.SINOE,
      triggerDate: notificationDate,
      sinoeNotification: notification,
      legalDays: state.deadlineDays,
      dueDate,
      calendarType: state.deadlineCalendarType,
      lawRef: state.deadlineLawRef ?? undefined,
      status: LegalDeadlineStatus.PENDING,
    } as any);
    await m.persistAndFlush(deadline);
    return deadline;
  }

  async getForTrackable(
    organizationId: string,
    trackableId: string,
    em?: EntityManager,
  ): Promise<LegalDeadline[]> {
    const m = this.mgr(em);
    return m.find(
      LegalDeadline,
      { organization: organizationId, trackable: trackableId },
      { populate: ['workflowState'], orderBy: { dueDate: 'ASC' } },
    );
  }

  async getUpcoming(
    organizationId: string,
    daysAhead: number = 7,
    em?: EntityManager,
  ): Promise<LegalDeadline[]> {
    const m = this.mgr(em);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return m.find(
      LegalDeadline,
      {
        organization: organizationId,
        status: LegalDeadlineStatus.PENDING,
        dueDate: { $lte: cutoff },
      },
      { populate: ['trackable', 'workflowState'], orderBy: { dueDate: 'ASC' } },
    );
  }

  async markAsMet(organizationId: string, deadlineId: string, em?: EntityManager): Promise<void> {
    const m = this.mgr(em);
    const deadline = await m.findOneOrFail(LegalDeadline, {
      id: deadlineId,
      organization: organizationId,
    });
    deadline.status = LegalDeadlineStatus.MET;
    deadline.metAt = new Date();
    await m.flush();
  }

  async markOverdueDeadlines(organizationId: string, em?: EntityManager): Promise<number> {
    const m = this.mgr(em);
    const now = new Date();
    const overdueList = await m.find(LegalDeadline, {
      organization: organizationId,
      status: LegalDeadlineStatus.PENDING,
      dueDate: { $lt: now },
    });
    for (const d of overdueList) {
      d.status = LegalDeadlineStatus.OVERDUE;
    }
    await m.flush();
    return overdueList.length;
  }
}
