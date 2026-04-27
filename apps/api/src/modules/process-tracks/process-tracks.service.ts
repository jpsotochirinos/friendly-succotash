import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  ActivityInstance,
  ActivityInstanceComment,
  Blueprint,
  BlueprintVersion,
  ComputedDeadline,
  DeadlineRule,
  Document,
  ProcessTrack,
  ProcessTrackEvent,
  StageInstance,
  Trackable,
  User,
  WorkflowDefinition,
  WorkflowState,
} from '@tracker/db';
import {
  ActionType,
  BlueprintDeadlineTrigger,
  BlueprintScope,
  ComputedDeadlineStatusV2,
  ProcessTrackEventType,
  ProcessTrackRole,
  StageInstanceStatus,
  WorkflowStateCategory,
  SYSTEM_BLUEPRINT_CODE_FREEFORM,
  resolvedTreeToJson,
} from '@tracker/shared';
import {
  isStageInstanceTerminalForEdits,
  isStageWorkClosed,
  STAGE_INSTANCE_METADATA_WORK_CLOSED_AT,
} from './stage-work-closed.util';
import { BlueprintResolverService } from '../blueprints/blueprint-resolver.service';
import { allocateWorkflowItemNumbers } from '../workflow-items/workflow-item-number.util';
import { randomUUID } from 'node:crypto';
import { DeadlineEngineService } from './deadline-engine.service';

/** Not reverted, not done, not cancelled — must inherit or close before advancing the stage. */
function isActivityOpenForStageAdvance(a: ActivityInstance): boolean {
  if (a.isReverted) return false;
  const c = a.workflowStateCategory;
  return c !== WorkflowStateCategory.DONE && c !== WorkflowStateCategory.CANCELLED;
}

@Injectable()
export class ProcessTracksService {
  constructor(
    private readonly em: EntityManager,
    private readonly resolver: BlueprintResolverService,
    private readonly deadlineEngine: DeadlineEngineService,
  ) {}

  /**
   * Creates a process track from a SYSTEM blueprint: INSTANCE blueprint, stages, first activities from templates.
   */
  async createFromSystemBlueprint(
    trackableId: string,
    systemBlueprintId: string,
    organizationId: string,
  ): Promise<ProcessTrack> {
    const sys = await this.em.findOne(Blueprint, {
      id: systemBlueprintId,
      scope: BlueprintScope.SYSTEM,
    });
    if (!sys?.currentVersion) {
      throw new NotFoundException('System blueprint or version not found');
    }
    const trackable = await this.em.findOne(Trackable, { id: trackableId, organization: organizationId });
    if (!trackable) throw new NotFoundException('Trackable not found');
    const existing = await this.em.count(ProcessTrack, { trackable: trackableId });
    const prefix = `P${existing + 1}`;

    const instBp = this.em.create(Blueprint, {
      scope: BlueprintScope.INSTANCE,
      organization: organizationId,
      code: `inst-${randomUUID().slice(0, 8)}`,
      name: `${trackable.title} (instancia)`,
      parentBlueprint: sys,
      matterType: trackable.matterType,
      isActive: true,
    } as any);

    const ver = await this.em.findOne(
      BlueprintVersion,
      { id: sys.currentVersion.id },
      { populate: ['stageTemplates.activities', 'stageTemplates', 'blueprint'] },
    );
    if (!ver) throw new BadRequestException('Version missing');
    const stages = (ver.stageTemplates.getItems() ?? []).slice().sort((a, b) => a.order - b.order);

    const startedAt = new Date();
    const pt = this.em.create(ProcessTrack, {
      organization: organizationId,
      trackable,
      blueprint: instBp,
      role: ProcessTrackRole.PRIMARY,
      prefix,
      startedAt,
      expedientNumber: trackable.expedientNumber ?? undefined,
      court: trackable.court ?? undefined,
    } as any);

    this.em.persist(instBp);
    this.em.persist(pt);
    await this.em.flush();

    let firstStage: StageInstance | null = null;
    for (let i = 0; i < stages.length; i++) {
      const st = stages[i]!;
      const isFirst = i === 0;
      const si = this.em.create(StageInstance, {
        organization: organizationId,
        processTrack: pt,
        stageTemplateCode: st.code,
        order: st.order,
        status: isFirst ? StageInstanceStatus.ACTIVE : StageInstanceStatus.PENDING,
        enteredAt: isFirst ? new Date() : undefined,
      } as any);
      if (i === 0) firstStage = si;
      await this.em.persist(si);

      const acts = (st.activities.getItems() ?? []).slice().sort((a, b) => a.order - b.order);
      const nums = await allocateWorkflowItemNumbers(this.em, trackableId, acts.length);
      for (let j = 0; j < acts.length; j++) {
        const a = acts[j]!;
        const num = nums[j] ?? j + 1;
        const ai = this.em.create(ActivityInstance, {
          organization: organizationId,
          stageInstance: si,
          trackable,
          activityTemplateCode: a.code,
          title: a.name,
          itemNumber: num,
          isMandatory: a.isMandatory,
          isCustom: false,
          workflowStateCategory: WorkflowStateCategory.TODO,
        } as any);
        await this.em.persist(ai);
      }
    }

    if (firstStage) {
      pt.currentStageInstance = firstStage;
    }
    await this.em.flush();
    await this.deadlineEngine.onStageEntered(pt.id, firstStage?.id ?? undefined, organizationId);
    await this.resolver.persistSnapshotForProcessTrack(pt);
    return pt;
  }

  /**
   * “Estilo libre”: reutiliza un blueprint de sistema mínimo (una etapa, sin tareas iniciales).
   * @see seed `SYSTEM_BLUEPRINT_CODE_FREEFORM`
   */
  async createFreeStyle(trackableId: string, organizationId: string): Promise<ProcessTrack> {
    const sys = await this.em.findOne(Blueprint, {
      scope: BlueprintScope.SYSTEM,
      code: SYSTEM_BLUEPRINT_CODE_FREEFORM,
    });
    if (!sys?.id) {
      throw new NotFoundException(
        `System blueprint "${SYSTEM_BLUEPRINT_CODE_FREEFORM}" not found. Run: pnpm --filter @tracker/db seed:system-blueprints`,
      );
    }
    return this.createFromSystemBlueprint(trackableId, sys.id, organizationId);
  }

  async getOne(id: string, organizationId: string) {
    const pt = await this.em.findOne(
      ProcessTrack,
      { id, organization: organizationId },
      {
        populate: [
          'trackable',
          'blueprint',
          'currentStageInstance',
          'stageInstances',
          'stageInstances.activities',
          'stageInstances.activities.assignedTo',
          'stageInstances.activities.reviewedBy',
          'stageInstances.activities.parent',
          'stageInstances.activities.secondaryAssignees',
          'stageInstances.activities.workflow',
          'stageInstances.activities.currentState',
          'stageInstances.activities.documentTemplate',
        ],
      },
    );
    if (!pt) throw new NotFoundException('Process track not found');
    await this.enrichActivityInstanceCardMetadata(pt, organizationId);
    return pt;
  }

  /**
   * In-memory only: document counts and (when migrated) comment counts for Kanban cards.
   * Not flushed to DB; merged into `metadata` for the JSON response.
   */
  private async enrichActivityInstanceCardMetadata(
    pt: ProcessTrack,
    organizationId: string,
  ) {
    const activities: ActivityInstance[] = [];
    for (const st of pt.stageInstances.getItems()) {
      for (const a of st.activities.getItems()) {
        activities.push(a);
      }
    }
    if (activities.length === 0) return;
    const ids = activities.map((a) => a.id);
    const ph = ids.map(() => '?').join(', ');

    const docRows = await this.em.getConnection().execute(
      `SELECT d.activity_instance_id, COUNT(*)::int AS c
       FROM documents d
       WHERE d.organization_id = ?
         AND d.activity_instance_id IN (${ph})
         AND d.activity_instance_id IS NOT NULL
         AND d.deleted_at IS NULL
       GROUP BY d.activity_instance_id`,
      [organizationId, ...ids],
    );
    const docBy = new Map<string, number>();
    for (const row of (Array.isArray(docRows) ? docRows : [docRows]) as Record<string, unknown>[]) {
      const aid = String(row['activity_instance_id'] ?? row['activityInstanceId'] ?? '');
      if (aid) docBy.set(aid, Number(row['c'] ?? 0));
    }

    const wiIdSet = new Set<string>();
    for (const a of activities) {
      const m = a.metadata;
      const swi =
        m &&
        typeof m === 'object' &&
        !Array.isArray(m) &&
        typeof (m as { sourceWorkflowItemId?: unknown }).sourceWorkflowItemId === 'string'
          ? (m as { sourceWorkflowItemId: string }).sourceWorkflowItemId
          : null;
      if (swi) wiIdSet.add(swi);
    }
    const wiIds = [...wiIdSet];
    const comByWi = new Map<string, number>();
    if (wiIds.length) {
      const wph = wiIds.map(() => '?').join(', ');
      const comRows = await this.em.getConnection().execute(
        `SELECT c.workflow_item_id, COUNT(*)::int AS n
         FROM workflow_item_comments c
         WHERE c.organization_id = ?
           AND c.workflow_item_id IN (${wph})
         GROUP BY c.workflow_item_id`,
        [organizationId, ...wiIds],
      );
      for (const row of (Array.isArray(comRows) ? comRows : [comRows]) as Record<string, unknown>[]) {
        const wid = String(row['workflow_item_id'] ?? row['workflowItemId'] ?? '');
        if (wid) comByWi.set(wid, Number(row['n'] ?? 0));
      }
    }

    const aiComBy = new Map<string, number>();
    {
      const aiph = ids.map(() => '?').join(', ');
      const aiComRows = await this.em.getConnection().execute(
        `SELECT aic.activity_instance_id, COUNT(*)::int AS n
         FROM activity_instance_comments aic
         WHERE aic.organization_id = ?
           AND aic.activity_instance_id IN (${aiph})
         GROUP BY aic.activity_instance_id`,
        [organizationId, ...ids],
      );
      for (const row of (Array.isArray(aiComRows) ? aiComRows : [aiComRows]) as Record<string, unknown>[]) {
        const aid = String(row['activity_instance_id'] ?? row['activityInstanceId'] ?? '');
        if (aid) aiComBy.set(aid, Number(row['n'] ?? 0));
      }
    }

    for (const a of activities) {
      const base =
        a.metadata && typeof a.metadata === 'object' && !Array.isArray(a.metadata)
          ? { ...a.metadata }
          : {};
      const nDoc = docBy.get(a.id) ?? 0;
      if (nDoc > 0) base['attachmentsCount'] = nDoc;
      else delete base['attachmentsCount'];

      const swi =
        typeof (base as { sourceWorkflowItemId?: string }).sourceWorkflowItemId === 'string'
          ? (base as { sourceWorkflowItemId: string }).sourceWorkflowItemId
          : null;
      const nComLegacy = swi ? comByWi.get(swi) ?? 0 : 0;
      const nComAi = aiComBy.get(a.id) ?? 0;
      const nCom = nComLegacy + nComAi;
      if (nCom > 0) base['commentsCount'] = nCom;
      else delete base['commentsCount'];

      a.metadata = Object.keys(base).length ? (base as Record<string, unknown>) : undefined;
    }
  }

  async listActivityComments(
    processTrackId: string,
    activityId: string,
    organizationId: string,
  ) {
    const act = await this.findActivityInProcessTrackOrThrow(processTrackId, activityId, organizationId);
    const rows = await this.em.find(
      ActivityInstanceComment,
      { activityInstance: act.id, organization: organizationId },
      {
        orderBy: { createdAt: 'ASC' },
        populate: ['user'] as any,
      },
    );
    return rows.map((c) => {
      const u = c.user as { id: string; email?: string; firstName?: string; lastName?: string } | undefined;
      return {
        id: c.id,
        body: c.body,
        createdAt: c.createdAt,
        user: u
          ? { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName }
          : null,
      };
    });
  }

  async addActivityInstanceComment(
    processTrackId: string,
    activityId: string,
    organizationId: string,
    userId: string,
    body: string,
  ) {
    const act = await this.findActivityInProcessTrackOrThrow(processTrackId, activityId, organizationId);
    const comment = this.em.create(ActivityInstanceComment, {
      activityInstance: act,
      user: this.em.getReference(User, userId),
      body: body.trim(),
      organization: organizationId,
    } as any);
    await this.em.flush();
    await this.em.populate(comment, ['user'] as any);
    const u = comment.user as { id: string; email?: string; firstName?: string; lastName?: string };
    return {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      user: { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName },
    };
  }

  private async findActivityInProcessTrackOrThrow(
    processTrackId: string,
    activityId: string,
    organizationId: string,
  ): Promise<ActivityInstance> {
    const a = await this.em.findOne(
      ActivityInstance,
      {
        id: activityId,
        organization: organizationId,
        stageInstance: { processTrack: { id: processTrackId, organization: organizationId } },
      } as any,
    );
    if (!a) throw new NotFoundException('Activity not found in this process track');
    return a;
  }

  async listEvents(id: string, organizationId: string) {
    return this.em.find(
      ProcessTrackEvent,
      { processTrack: { id, organization: organizationId } },
      { orderBy: { eventAt: 'DESC' }, limit: 200 },
    );
  }

  async getResolvedTree(processTrackId: string, organizationId: string) {
    const pt = await this.em.findOne(
      ProcessTrack,
      { id: processTrackId, organization: organizationId },
      { populate: ['trackable', 'blueprint', 'blueprint.parentBlueprint'] },
    );
    if (!pt) throw new NotFoundException('Process track not found');
    const tree = await this.resolver.resolveForProcessTrack(pt);
    return { ...resolvedTreeToJson(tree), sourceVersionIds: tree.sourceVersionIds };
  }

  private async logEvent(
    processTrackId: string,
    organizationId: string,
    type: ProcessTrackEventType,
    payload: Record<string, unknown>,
    actorId?: string,
  ) {
    this.em.create(
      ProcessTrackEvent,
      {
        organization: organizationId,
        processTrack: this.em.getReference(ProcessTrack, processTrackId),
        eventType: type,
        payload,
        eventAt: new Date(),
        actor: actorId ? this.em.getReference(User, actorId) : undefined,
      } as any,
    );
    await this.em.flush();
  }

  private async getStageDeadlineRuleCodes(
    processTrack: ProcessTrack,
    stageTemplateCode: string,
  ): Promise<Set<string>> {
    const instBp = await this.em.findOne(Blueprint, { id: (processTrack.blueprint as { id: string }).id });
    if (!instBp) return new Set();
    const sys = await this.resolver.resolveSystemRoot(instBp);
    if (!sys.currentVersion) return new Set();
    const rules = await this.em.find(DeadlineRule, {
      blueprintVersion: { id: (sys.currentVersion as { id: string }).id },
      trigger: BlueprintDeadlineTrigger.STAGE_ENTERED,
      triggerTargetCode: stageTemplateCode,
    } as any);
    return new Set(rules.map((r) => r.code));
  }

  private async computeSprintTargetDueDate(
    processTrackId: string,
    organizationId: string,
    stage: StageInstance,
  ): Promise<Date | null> {
    const pt = await this.em.findOne(ProcessTrack, { id: processTrackId, organization: organizationId });
    if (!pt) return null;
    const ruleCodes = await this.getStageDeadlineRuleCodes(pt, stage.stageTemplateCode);
    if (ruleCodes.size === 0) return null;
    const cds = await this.em.find(ComputedDeadline, {
      processTrack: { id: processTrackId, organization: organizationId },
      deadlineRuleCode: { $in: [...ruleCodes] as string[] },
      status: ComputedDeadlineStatusV2.PENDING,
    } as any);
    if (!cds.length) return null;
    return cds.reduce(
      (min, cd) => (cd.effectiveDate < min ? cd.effectiveDate : min),
      cds[0]!.effectiveDate,
    );
  }

  /**
   * Progress for a stage: counts, canAdvance, sprint target date from `ComputedDeadline` (STAGE_ENTERED rules for this stage).
   */
  async getStageProgress(
    processTrackId: string,
    stageInstanceId: string,
    organizationId: string,
  ): Promise<{
    total: number;
    done: number;
    mandatoryTotal: number;
    mandatoryDone: number;
    canAdvance: boolean;
    targetDueDate: string | null;
    isReverted: boolean;
    stageStatus: StageInstanceStatus;
  }> {
    const si = await this.em.findOne(StageInstance, {
      id: stageInstanceId,
      processTrack: { id: processTrackId, organization: organizationId },
    });
    if (!si) throw new NotFoundException('Stage not found');
    const acts = await this.em.find(ActivityInstance, {
      stageInstance: { id: stageInstanceId, organization: organizationId },
    });
    const activeActs = acts.filter((a) => !a.isReverted);
    const total = activeActs.length;
    const done = activeActs.filter((a) => a.workflowStateCategory === WorkflowStateCategory.DONE).length;
    const mandatory = activeActs.filter((a) => a.isMandatory);
    const mandatoryTotal = mandatory.length;
    const mandatoryDone = mandatory.filter((a) => a.workflowStateCategory === WorkflowStateCategory.DONE).length;
    const hasOpenForAdvance = activeActs.some((a) => isActivityOpenForStageAdvance(a));
    const canAdvance =
      si.status === StageInstanceStatus.ACTIVE
      && !si.isReverted
      && !hasOpenForAdvance;
    const pt = await this.em.findOne(ProcessTrack, { id: processTrackId, organization: organizationId });
    const d = pt ? await this.computeSprintTargetDueDate(processTrackId, organizationId, si) : null;
    return {
      total,
      done,
      mandatoryTotal,
      mandatoryDone,
      canAdvance,
      targetDueDate: d ? d.toISOString() : null,
      isReverted: si.isReverted,
      stageStatus: si.status,
    };
  }

  private clearWorkClosedFromStageMetadata(st: StageInstance): void {
    const m = (st.metadata ?? {}) as Record<string, unknown>;
    if (!(STAGE_INSTANCE_METADATA_WORK_CLOSED_AT in m)) return;
    const next = { ...m };
    delete next[STAGE_INSTANCE_METADATA_WORK_CLOSED_AT];
    st.metadata = Object.keys(next).length ? (next as Record<string, unknown>) : undefined;
  }

  /**
   * User-initiated lock: all non-reverted activities in stage must be DONE. Does not advance the workflow.
   */
  async closeStageWork(
    processTrackId: string,
    stageInstanceId: string,
    organizationId: string,
    userId: string,
  ) {
    const st = await this.em.findOne(StageInstance, {
      id: stageInstanceId,
      processTrack: { id: processTrackId, organization: organizationId },
    });
    if (!st) throw new NotFoundException();
    if (st.isReverted) {
      throw new BadRequestException('Cannot close work on a reverted stage');
    }
    if (st.status !== StageInstanceStatus.ACTIVE && st.status !== StageInstanceStatus.PENDING) {
      throw new BadRequestException('Only an active or pending stage can be work-closed');
    }
    if (isStageWorkClosed(st.metadata as Record<string, unknown> | null | undefined)) {
      throw new BadRequestException('Stage work is already closed');
    }
    const acts = await this.em.find(ActivityInstance, { stageInstance: { id: st.id, organization: organizationId } });
    const active = acts.filter((a) => !a.isReverted);
    if (active.length === 0) {
      throw new BadRequestException('No activities in this stage to close');
    }
    const notDone = active.filter((a) => a.workflowStateCategory !== WorkflowStateCategory.DONE);
    if (notDone.length) {
      throw new BadRequestException('All activities must be done before closing stage work');
    }
    const prev = { ...(st.metadata ?? {}) } as Record<string, unknown>;
    prev[STAGE_INSTANCE_METADATA_WORK_CLOSED_AT] = new Date().toISOString();
    st.metadata = prev;
    await this.em.flush();
    await this.logEvent(
      processTrackId,
      organizationId,
      ProcessTrackEventType.STAGE_WORK_CLOSED,
      { stageInstanceId: st.id },
      userId,
    );
    return st;
  }

  /**
   * Remove work lock set by `closeStageWork` (lightweight; not the same as workflow `reopen`).
   */
  async reopenStageWork(
    processTrackId: string,
    stageInstanceId: string,
    organizationId: string,
    userId: string,
  ) {
    const st = await this.em.findOne(StageInstance, {
      id: stageInstanceId,
      processTrack: { id: processTrackId, organization: organizationId },
    });
    if (!st) throw new NotFoundException();
    if (!isStageWorkClosed(st.metadata as Record<string, unknown> | null | undefined)) {
      throw new BadRequestException('Stage work is not closed');
    }
    this.clearWorkClosedFromStageMetadata(st);
    await this.em.flush();
    await this.logEvent(
      processTrackId,
      organizationId,
      ProcessTrackEventType.STAGE_WORK_REOPENED,
      { stageInstanceId: st.id },
      userId,
    );
    return st;
  }

  /**
   * Mark completed ACTIVE step and enter next PENDING non-reverted stage.
   * If open activities remain (not done, not cancelled), pass `pendingActions` (inherit | close) per activity, or 409.
   */
  async advanceStage(
    processTrackId: string,
    stageInstanceId: string,
    organizationId: string,
    userId: string,
    body?: { pendingActions?: Array<{ activityId: string; action: 'inherit' | 'close' }> },
  ) {
    const current = await this.em.findOne(StageInstance, {
      id: stageInstanceId,
      processTrack: { id: processTrackId, organization: organizationId },
    });
    if (!current) throw new NotFoundException('Stage not found');
    if (current.status !== StageInstanceStatus.ACTIVE) {
      throw new BadRequestException('Only the active stage can be advanced');
    }
    if (current.isReverted) {
      throw new BadRequestException('Cannot advance a reverted stage');
    }
    const all = await this.em.find(
      StageInstance,
      { processTrack: { id: processTrackId, organization: organizationId } },
      { orderBy: { order: 'ASC' } },
    );
    const next = all.find(
      (s) => s.order > current.order
        && s.status === StageInstanceStatus.PENDING
        && !s.isReverted,
    ) ?? null;

    const acts = await this.em.find(ActivityInstance, {
      stageInstance: { id: current.id, organization: organizationId },
    });
    const pendingOpen = acts.filter((a) => isActivityOpenForStageAdvance(a));

    if (pendingOpen.length) {
      const actions = body?.pendingActions ?? [];
      const actionById = new Map(actions.map((x) => [x.activityId, x.action]));
      if (actions.length !== actionById.size) {
        throw new BadRequestException('Duplicate activityId in pendingActions');
      }
      const expectedIds = new Set(pendingOpen.map((a) => a.id));
      for (const a of actions) {
        if (!expectedIds.has(a.activityId)) {
          throw new BadRequestException(
            `Activity ${a.activityId} is not an open activity in this stage pending advance`,
          );
        }
        if (a.action !== 'inherit' && a.action !== 'close') {
          throw new BadRequestException('Invalid pending action');
        }
      }
      if (actions.length !== expectedIds.size) {
        throw new ConflictException({
          code: 'STAGE_HAS_PENDING_MANDATORY',
          pending: pendingOpen.map((a) => ({
            id: a.id,
            title: a.title,
            isMandatory: a.isMandatory,
          })),
          pendingActivityIds: pendingOpen.map((a) => a.id),
        });
      }
      for (const pa of actions) {
        const act = pendingOpen.find((x) => x.id === pa.activityId)!;
        if (pa.action === 'inherit') {
          if (!next) {
            throw new BadRequestException('Cannot inherit: there is no next stage');
          }
          act.stageInstance = next;
          await this.logEvent(
            processTrackId,
            organizationId,
            ProcessTrackEventType.ACTIVITY_INHERITED,
            {
              activityInstanceId: act.id,
              toStageInstanceId: next.id,
              fromStageInstanceId: current.id,
            },
            userId,
          );
        } else {
          act.workflowStateCategory = WorkflowStateCategory.DONE;
          act.completedAt = new Date();
          const meta = (act.metadata as Record<string, unknown> | undefined) ?? {};
          act.metadata = { ...meta, closedSkip: true } as any;
          await this.logEvent(
            processTrackId,
            organizationId,
            ProcessTrackEventType.ACTIVITY_CLOSED_SKIPPED,
            { activityInstanceId: act.id, stageInstanceId: current.id },
            userId,
          );
        }
      }
      await this.em.flush();
    } else if (body?.pendingActions?.length) {
      throw new BadRequestException('pendingActions not expected: no open activities in this stage');
    }

    const actsAfter = await this.em.find(ActivityInstance, {
      stageInstance: { id: current.id, organization: organizationId },
    });
    const stillPending = actsAfter.filter((a) => isActivityOpenForStageAdvance(a));
    if (stillPending.length) {
      throw new ConflictException({
        code: 'STAGE_HAS_PENDING_MANDATORY',
        pending: stillPending.map((a) => ({
          id: a.id,
          title: a.title,
          isMandatory: a.isMandatory,
        })),
        pendingActivityIds: stillPending.map((a) => a.id),
      });
    }

    this.clearWorkClosedFromStageMetadata(current);
    current.status = StageInstanceStatus.COMPLETED;
    current.exitedAt = new Date();
    const pt = await this.em.findOne(
      ProcessTrack,
      { id: processTrackId, organization: organizationId },
      { populate: ['trackable', 'blueprint'] },
    );
    if (!pt) throw new NotFoundException();
    await this.em.flush();
    await this.logEvent(
      processTrackId,
      organizationId,
      ProcessTrackEventType.STAGE_EXITED,
      { stageInstanceId: current.id, advanced: true },
      userId,
    );
    const nextActive = all.find(
      (s) => s.order > current.order
        && s.status === StageInstanceStatus.PENDING
        && !s.isReverted,
    );
    if (nextActive) {
      nextActive.status = StageInstanceStatus.ACTIVE;
      nextActive.enteredAt = new Date();
      (pt as any).currentStageInstance = nextActive;
      await this.em.flush();
      await this.logEvent(
        processTrackId,
        organizationId,
        ProcessTrackEventType.STAGE_ENTERED,
        { stageInstanceId: nextActive.id, fromAdvance: true },
        userId,
      );
      await this.deadlineEngine.onStageEntered(processTrackId, nextActive.id, organizationId);
      await this.resolver.persistSnapshotForProcessTrack(pt);
    } else {
      (pt as any).currentStageInstance = current;
      await this.em.flush();
      await this.resolver.persistSnapshotForProcessTrack(pt);
    }
    return { current, next: nextActive ?? null };
  }

  private async waiveDeadlinesForStageTemplateCodes(
    processTrack: ProcessTrack,
    templateCodes: Set<string>,
  ): Promise<void> {
    if (templateCodes.size === 0) return;
    const instBp = await this.em.findOne(Blueprint, { id: (processTrack.blueprint as { id: string }).id });
    if (!instBp) return;
    const sys = await this.resolver.resolveSystemRoot(instBp);
    if (!sys.currentVersion) return;
    const rules = await this.em.find(DeadlineRule, {
      blueprintVersion: { id: (sys.currentVersion as { id: string }).id },
      trigger: BlueprintDeadlineTrigger.STAGE_ENTERED,
    });
    const codes = new Set(
      rules.filter((r) => r.triggerTargetCode && templateCodes.has(r.triggerTargetCode)).map((r) => r.code),
    );
    const cds = await this.em.find(ComputedDeadline, { processTrack: { id: processTrack.id } });
    for (const cd of cds) {
      if (codes.has(cd.deadlineRuleCode) && cd.status === ComputedDeadlineStatusV2.PENDING) {
        cd.status = ComputedDeadlineStatusV2.WAIVED;
      }
    }
  }

  /**
   * Reopen a past stage; reverts all later stages and their activities; waives PENDING computed deadlines for those stages.
   */
  async reopenStage(
    processTrackId: string,
    stageInstanceId: string,
    organizationId: string,
    userId: string,
    body: { reason: string },
  ) {
    if (!body?.reason?.trim()) {
      throw new BadRequestException('reason is required');
    }
    const target = await this.em.findOne(StageInstance, {
      id: stageInstanceId,
      processTrack: { id: processTrackId, organization: organizationId },
    });
    if (!target) throw new NotFoundException('Stage not found');
    if (target.status !== StageInstanceStatus.COMPLETED && target.status !== StageInstanceStatus.SKIPPED) {
      throw new BadRequestException('Only a completed or skipped stage can be reopened');
    }
    const all = await this.em.find(
      StageInstance,
      { processTrack: { id: processTrackId, organization: organizationId } },
      { orderBy: { order: 'ASC' } },
    );
    const pt = await this.em.findOne(
      ProcessTrack,
      { id: processTrackId, organization: organizationId },
      { populate: ['trackable', 'blueprint'] },
    );
    if (!pt) throw new NotFoundException();
    const templateCodesToWaive = new Set(
      all.filter((s) => s.order >= target.order).map((s) => s.stageTemplateCode),
    );
    await this.waiveDeadlinesForStageTemplateCodes(pt, templateCodesToWaive);
    for (const s of all) {
      if (s.order < target.order) {
        // unchanged
        continue;
      }
      if (s.id === target.id) {
        s.status = StageInstanceStatus.ACTIVE;
        s.isReverted = false;
        s.exitedAt = undefined;
        s.enteredAt = new Date();
        const sActs = await this.em.find(ActivityInstance, { stageInstance: s.id, organization: organizationId });
        for (const a of sActs) {
          a.isReverted = false;
        }
        continue;
      }
      if (s.order > target.order) {
        s.status = StageInstanceStatus.PENDING;
        s.isReverted = true;
        s.enteredAt = undefined;
        s.exitedAt = undefined;
        const laterActs = await this.em.find(ActivityInstance, { stageInstance: s.id, organization: organizationId });
        for (const a of laterActs) {
          a.isReverted = true;
          if (a.workflowStateCategory !== WorkflowStateCategory.DONE) {
            a.completedAt = undefined;
          }
        }
        await this.logEvent(
          processTrackId,
          organizationId,
          ProcessTrackEventType.STAGE_REVERTED,
          { stageInstanceId: s.id, reason: body.reason, reopenedFrom: target.id },
          userId,
        );
      }
    }
    (pt as any).currentStageInstance = target;
    await this.em.flush();
    await this.logEvent(
      processTrackId,
      organizationId,
      ProcessTrackEventType.STAGE_REOPENED,
      { stageInstanceId: target.id, reason: body.reason },
      userId,
    );
    await this.deadlineEngine.onStageEntered(processTrackId, target.id, organizationId);
    if (pt) await this.resolver.persistSnapshotForProcessTrack(pt);
    return target;
  }

  /**
   * Activates a stage: completes any other active stage, then marks the target as ACTIVE.
   */
  async enterStage(
    processTrackId: string,
    stageInstanceId: string,
    organizationId: string,
    userId: string,
  ) {
    const target = await this.em.findOne(StageInstance, {
      id: stageInstanceId,
      processTrack: { id: processTrackId, organization: organizationId },
    });
    if (!target) throw new NotFoundException('Stage not found');
    const all = await this.em.find(
      StageInstance,
      { processTrack: { id: processTrackId, organization: organizationId } },
      { orderBy: { order: 'ASC' } },
    );
    for (const s of all) {
      if (s.status === StageInstanceStatus.ACTIVE && s.id !== target.id) {
        s.status = StageInstanceStatus.COMPLETED;
        s.exitedAt = new Date();
      }
    }
    target.status = StageInstanceStatus.ACTIVE;
    target.enteredAt = new Date();
    const pt = await this.em.findOne(
      ProcessTrack,
      { id: processTrackId, organization: organizationId },
      { populate: ['trackable', 'blueprint'] },
    );
    if (pt) {
      (pt as any).currentStageInstance = target;
    }
    await this.em.flush();
    await this.logEvent(processTrackId, organizationId, ProcessTrackEventType.STAGE_ENTERED, { stageInstanceId: target.id }, userId);
    await this.deadlineEngine.onStageEntered(processTrackId, target.id, organizationId);
    if (pt) await this.resolver.persistSnapshotForProcessTrack(pt);
    return target;
  }

  async exitStage(
    processTrackId: string,
    stageInstanceId: string,
    organizationId: string,
    userId: string,
    _reason?: string,
  ) {
    const s = await this.em.findOne(StageInstance, {
      id: stageInstanceId,
      processTrack: { id: processTrackId, organization: organizationId },
    });
    if (!s) throw new NotFoundException();
    s.status = StageInstanceStatus.COMPLETED;
    s.exitedAt = new Date();
    await this.em.flush();
    await this.logEvent(processTrackId, organizationId, ProcessTrackEventType.STAGE_EXITED, { stageInstanceId: s.id }, userId);
    return s;
  }

  async skipStage(
    processTrackId: string,
    stageInstanceId: string,
    organizationId: string,
    userId: string,
  ) {
    const s = await this.em.findOne(StageInstance, {
      id: stageInstanceId,
      processTrack: { id: processTrackId, organization: organizationId },
    });
    if (!s) throw new NotFoundException();
    s.status = StageInstanceStatus.SKIPPED;
    s.exitedAt = new Date();
    await this.em.flush();
    await this.logEvent(processTrackId, organizationId, ProcessTrackEventType.STAGE_EXITED, { stageInstanceId: s.id, skipped: true }, userId);
    return s;
  }

  async listDeadlines(processTrackId: string, organizationId: string) {
    return this.em.find(ComputedDeadline, { processTrack: { id: processTrackId, organization: organizationId } });
  }

  async overrideEffectiveDeadline(
    processTrackId: string,
    deadlineId: string,
    organizationId: string,
    userId: string,
    body: { effectiveDate: string; reason: string },
  ) {
    const d = await this.em.findOne(ComputedDeadline, {
      id: deadlineId,
      processTrack: { id: processTrackId, organization: organizationId },
    });
    if (!d) throw new NotFoundException();
    d.effectiveDate = new Date(body.effectiveDate);
    d.overrideAt = new Date();
    d.overrideBy = this.em.getReference(User, userId);
    d.overrideReason = body.reason;
    await this.em.flush();
    await this.logEvent(processTrackId, organizationId, ProcessTrackEventType.DEADLINE_OVERRIDDEN, { deadlineId: d.id }, userId);
    return d;
  }

  async revertDeadlineToLegal(
    processTrackId: string,
    deadlineId: string,
    organizationId: string,
    userId: string,
  ) {
    const d = await this.em.findOne(ComputedDeadline, {
      id: deadlineId,
      processTrack: { id: processTrackId, organization: organizationId },
    });
    if (!d) throw new NotFoundException();
    d.effectiveDate = d.legalDate;
    d.overrideAt = undefined;
    d.overrideBy = undefined;
    d.overrideReason = undefined;
    await this.em.flush();
    await this.logEvent(processTrackId, organizationId, ProcessTrackEventType.DEADLINE_OVERRIDDEN, { deadlineId: d.id, reverted: true }, userId);
    return d;
  }

  private parseWorkflowStateCategory(
    value: string | undefined,
    defaultCat: WorkflowStateCategory,
  ): WorkflowStateCategory {
    if (value == null || value === '') return defaultCat;
    const allowed = new Set<string>(Object.values(WorkflowStateCategory) as string[]);
    if (!allowed.has(value)) {
      throw new BadRequestException(`Invalid workflowStateCategory: ${value}`);
    }
    return value as WorkflowStateCategory;
  }

  private async assertActivityParent(
    processTrackId: string,
    organizationId: string,
    parentId: string,
  ) {
    const parent = await this.em.findOne(
      ActivityInstance,
      { id: parentId, organization: organizationId },
      { populate: ['stageInstance', 'stageInstance.processTrack'] as any },
    );
    if (!parent) throw new NotFoundException('Parent activity not found');
    const ptId = (parent.stageInstance as any).processTrack?.id;
    if (ptId !== processTrackId) {
      throw new BadRequestException('Parent must belong to the same process track');
    }
    return parent;
  }

  private async assertOptionalFks(organizationId: string, body: {
    workflowId?: string | null;
    currentStateId?: string | null;
    documentTemplateId?: string | null;
    assignedToId?: string | null;
    reviewedById?: string | null;
  }) {
    if (body.workflowId) {
      const w = await this.em.findOne(WorkflowDefinition, { id: body.workflowId }, { populate: ['organization'] as any });
      if (!w) throw new NotFoundException('Workflow not found');
      const wOrg = (w as any).organization?.id as string | undefined;
      if (wOrg && wOrg !== organizationId) {
        throw new BadRequestException('Workflow not in organization');
      }
    }
    if (body.currentStateId) {
      const s = await this.em.findOne(WorkflowState, { id: body.currentStateId }, { populate: ['workflow', 'workflow.organization'] as any });
      if (!s) throw new NotFoundException('Workflow state not found');
      const sOrg = (s as any).workflow?.organization?.id as string | undefined;
      if (sOrg && sOrg !== organizationId) {
        throw new BadRequestException('Workflow state not in organization');
      }
    }
    if (body.documentTemplateId) {
      const d = await this.em.findOne(Document, { id: body.documentTemplateId, organization: organizationId });
      if (!d) throw new NotFoundException('Document not found');
    }
    if (body.assignedToId) {
      const u = await this.em.findOne(User, { id: body.assignedToId, organization: organizationId });
      if (!u) throw new NotFoundException('Assigned user not found');
    }
    if (body.reviewedById) {
      const u = await this.em.findOne(User, { id: body.reviewedById, organization: organizationId });
      if (!u) throw new NotFoundException('Reviewer not found');
    }
  }

  private parseActionType(v: string | undefined): ActionType | undefined {
    if (v == null || v === '') return undefined;
    if (!Object.values(ActionType).includes(v as ActionType)) {
      throw new BadRequestException(`Invalid actionType: ${v}`);
    }
    return v as ActionType;
  }

  private parsePriority(
    v: 'low' | 'normal' | 'high' | 'urgent' | string | undefined,
  ): 'low' | 'normal' | 'high' | 'urgent' | undefined {
    if (v == null) return undefined;
    const allowed = new Set(['low', 'normal', 'high', 'urgent']);
    if (!allowed.has(v)) throw new BadRequestException(`Invalid priority: ${v}`);
    return v as 'low' | 'normal' | 'high' | 'urgent';
  }

  async createCustomActivity(
    processTrackId: string,
    organizationId: string,
    userId: string,
    body: {
      stageInstanceId?: string;
      title: string;
      description?: string;
      isMandatory?: boolean;
      dueDate?: string | null;
      startDate?: string | null;
      kind?: string;
      actionType?: string;
      assignedToId?: string | null;
      reviewedById?: string | null;
      parentId?: string | null;
      location?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent' | string;
      allDay?: boolean;
      reminderMinutesBefore?: number[] | null;
      rrule?: string | null;
      isLegalDeadline?: boolean;
      accentColor?: string | null;
      calendarColor?: string | null;
      metadata?: Record<string, unknown> | null;
      secondaryAssigneeIds?: string[];
      workflowId?: string | null;
      currentStateId?: string | null;
      documentTemplateId?: string | null;
      workflowStateCategory?: string;
    },
  ) {
    const pt = await this.em.findOne(ProcessTrack, { id: processTrackId, organization: organizationId }, {
      populate: ['trackable', 'currentStageInstance'] as any,
    });
    if (!pt) throw new NotFoundException();
    const stageId = body.stageInstanceId ?? (pt as any).currentStageInstance?.id;
    if (!stageId) {
      throw new BadRequestException('stageInstanceId is required when the track has no current stage');
    }
    const st = await this.em.findOne(StageInstance, {
      id: stageId,
      processTrack: { id: processTrackId, organization: organizationId },
    });
    if (!st) throw new NotFoundException();
    if (isStageInstanceTerminalForEdits({ status: st.status, metadata: st.metadata })) {
      throw new BadRequestException({ message: 'Stage is not editable', code: 'STAGE_NOT_EDITABLE' });
    }
    const trackableId = pt.trackable?.id;
    if (!trackableId) throw new NotFoundException();
    await this.assertOptionalFks(organizationId, {
      workflowId: body.workflowId,
      currentStateId: body.currentStateId,
      documentTemplateId: body.documentTemplateId,
      assignedToId: body.assignedToId,
      reviewedById: body.reviewedById,
    });
    if (body.parentId) {
      await this.assertActivityParent(processTrackId, organizationId, body.parentId);
    }
    if (body.secondaryAssigneeIds?.length) {
      const cnt = await this.em.count(User, { id: { $in: body.secondaryAssigneeIds }, organization: organizationId });
      if (cnt !== body.secondaryAssigneeIds.length) {
        throw new BadRequestException('One or more secondary assignees were not found');
      }
    }
    const n = await this.em.count(ActivityInstance, { stageInstance: { id: st.id, organization: organizationId } });
    const [num] = await allocateWorkflowItemNumbers(this.em, trackableId, 1);
    const itemNumber = num ?? n + 1;
    const cat = this.parseWorkflowStateCategory(
      body.workflowStateCategory,
      WorkflowStateCategory.TODO,
    );
    const at = this.parseActionType(body.actionType);
    const pri = this.parsePriority(body.priority);
    const act = this.em.create(ActivityInstance, {
      organization: organizationId,
      stageInstance: st,
      trackable: this.em.getReference(Trackable, trackableId),
      title: body.title,
      description: body.description,
      isCustom: true,
      itemNumber,
      isMandatory: body.isMandatory === true,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      kind: body.kind,
      actionType: at,
      location: body.location,
      priority: pri ?? 'normal',
      allDay: body.allDay ?? true,
      reminderMinutesBefore: body.reminderMinutesBefore ?? undefined,
      rrule: body.rrule ?? undefined,
      isLegalDeadline: body.isLegalDeadline === true,
      accentColor: body.accentColor ?? undefined,
      calendarColor: body.calendarColor ?? undefined,
      metadata: body.metadata ?? undefined,
      workflowStateCategory: cat,
      assignedTo: body.assignedToId ? this.em.getReference(User, body.assignedToId) : undefined,
      reviewedBy: body.reviewedById ? this.em.getReference(User, body.reviewedById) : undefined,
      parent: body.parentId ? this.em.getReference(ActivityInstance, body.parentId) : undefined,
      workflow: body.workflowId ? this.em.getReference(WorkflowDefinition, body.workflowId) : undefined,
      currentState: body.currentStateId ? this.em.getReference(WorkflowState, body.currentStateId) : undefined,
      documentTemplate: body.documentTemplateId ? this.em.getReference(Document, body.documentTemplateId) : undefined,
    } as any);
    if (body.secondaryAssigneeIds?.length) {
      const users = await this.em.find(User, { id: { $in: body.secondaryAssigneeIds }, organization: organizationId });
      act.secondaryAssignees.set(users);
    }
    await this.em.persistAndFlush(act);
    await this.logEvent(processTrackId, organizationId, ProcessTrackEventType.ACTIVITY_CREATED, { activityInstanceId: act.id }, userId);
    return act;
  }

  async completeActivity(
    processTrackId: string,
    activityId: string,
    organizationId: string,
    userId: string,
  ) {
    return this.patchActivity(
      processTrackId,
      activityId,
      organizationId,
      { workflowStateCategory: WorkflowStateCategory.DONE },
      userId,
    );
  }

  async patchActivity(
    processTrackId: string,
    activityId: string,
    organizationId: string,
    body: Partial<{
      title: string;
      description: string | null;
      dueDate: string | null;
      startDate: string | null;
      workflowStateCategory: string;
      stageInstanceId: string;
      isMandatory: boolean;
      kind: string;
      actionType: string;
      assignedToId: string | null;
      reviewedById: string | null;
      parentId: string | null;
      location: string | null;
      priority: 'low' | 'normal' | 'high' | 'urgent' | string;
      allDay: boolean;
      reminderMinutesBefore: number[] | null;
      rrule: string | null;
      isLegalDeadline: boolean;
      accentColor: string | null;
      calendarColor: string | null;
      metadata: Record<string, unknown> | null;
      secondaryAssigneeIds: string[];
      workflowId: string | null;
      currentStateId: string | null;
      documentTemplateId: string | null;
    }>,
    userId?: string,
  ) {
    const a = await this.em.findOne(
      ActivityInstance,
      {
        id: activityId,
        organization: organizationId,
        stageInstance: { processTrack: { id: processTrackId, organization: organizationId } },
      },
      { populate: ['stageInstance', 'secondaryAssignees'] },
    );
    if (!a) throw new NotFoundException();
    const fromCat = a.workflowStateCategory;
    const fromStageId = a.stageInstance.id;
    if (a.isReverted) {
      throw new BadRequestException('Activity is reverted and cannot be edited');
    }
    const fromStage = a.stageInstance;
    const fromLocked = isStageInstanceTerminalForEdits({
      status: fromStage.status,
      metadata: fromStage.metadata as Record<string, unknown> | null | undefined,
    });
    if (fromLocked) {
      const disallowed = [
        'isMandatory',
        'kind',
        'actionType',
        'parentId',
        'workflowId',
        'currentStateId',
        'documentTemplateId',
        'stageInstanceId',
        'workflowStateCategory',
      ] as const;
      const b = body as Record<string, unknown>;
      for (const k of disallowed) {
        if (b[k] !== undefined) {
          throw new BadRequestException({
            message: 'This stage does not allow that change',
            code: 'STAGE_NOT_EDITABLE',
          });
        }
      }
    }
    if (body.stageInstanceId !== undefined && body.stageInstanceId !== fromStageId) {
      const toSt = await this.em.findOne(StageInstance, {
        id: body.stageInstanceId,
        processTrack: { id: processTrackId, organization: organizationId },
      });
      if (!toSt) throw new NotFoundException('Target stage not found');
      if (isStageInstanceTerminalForEdits({ status: toSt.status, metadata: toSt.metadata })) {
        throw new BadRequestException({
          message: 'Cannot move into a non-editable stage',
          code: 'STAGE_NOT_EDITABLE',
        });
      }
    }
    if (body.title !== undefined) a.title = body.title;
    if (body.description !== undefined) a.description = body.description ?? undefined;
    if (body.dueDate !== undefined) a.dueDate = body.dueDate ? new Date(body.dueDate) : undefined;
    if (body.startDate !== undefined) a.startDate = body.startDate ? new Date(body.startDate) : undefined;
    if (body.isMandatory !== undefined) a.isMandatory = body.isMandatory;
    if (body.kind !== undefined) a.kind = body.kind;
    if (body.actionType !== undefined) {
      a.actionType = body.actionType ? this.parseActionType(body.actionType) : undefined;
    }
    if (body.location !== undefined) a.location = body.location ?? undefined;
    if (body.priority !== undefined) a.priority = this.parsePriority(body.priority) ?? 'normal';
    if (body.allDay !== undefined) a.allDay = body.allDay;
    if (body.reminderMinutesBefore !== undefined) a.reminderMinutesBefore = body.reminderMinutesBefore ?? undefined;
    if (body.rrule !== undefined) a.rrule = body.rrule ?? undefined;
    if (body.isLegalDeadline !== undefined) a.isLegalDeadline = body.isLegalDeadline;
    if (body.accentColor !== undefined) a.accentColor = body.accentColor ?? undefined;
    if (body.calendarColor !== undefined) a.calendarColor = body.calendarColor ?? undefined;
    if (body.metadata !== undefined) {
      a.metadata =
        body.metadata == null
          ? undefined
          : { ...(a.metadata ?? {}), ...body.metadata };
    }
    if (body.assignedToId !== undefined) {
      if (body.assignedToId) {
        await this.assertOptionalFks(organizationId, { assignedToId: body.assignedToId });
        a.assignedTo = this.em.getReference(User, body.assignedToId);
      } else {
        a.assignedTo = undefined;
      }
    }
    if (body.reviewedById !== undefined) {
      if (body.reviewedById) {
        await this.assertOptionalFks(organizationId, { reviewedById: body.reviewedById });
        a.reviewedBy = this.em.getReference(User, body.reviewedById);
      } else {
        a.reviewedBy = undefined;
      }
    }
    if (body.parentId !== undefined) {
      if (body.parentId) {
        if (body.parentId === activityId) {
          throw new BadRequestException('Activity cannot be its own parent');
        }
        await this.assertActivityParent(processTrackId, organizationId, body.parentId);
        a.parent = this.em.getReference(ActivityInstance, body.parentId);
      } else {
        a.parent = undefined;
      }
    }
    if (body.workflowId !== undefined) {
      if (body.workflowId) {
        await this.assertOptionalFks(organizationId, { workflowId: body.workflowId });
        a.workflow = this.em.getReference(WorkflowDefinition, body.workflowId);
      } else {
        a.workflow = undefined;
      }
    }
    if (body.currentStateId !== undefined) {
      if (body.currentStateId) {
        await this.assertOptionalFks(organizationId, { currentStateId: body.currentStateId });
        a.currentState = this.em.getReference(WorkflowState, body.currentStateId);
      } else {
        a.currentState = undefined;
      }
    }
    if (body.documentTemplateId !== undefined) {
      if (body.documentTemplateId) {
        await this.assertOptionalFks(organizationId, { documentTemplateId: body.documentTemplateId });
        a.documentTemplate = this.em.getReference(Document, body.documentTemplateId);
      } else {
        a.documentTemplate = undefined;
      }
    }
    if (body.secondaryAssigneeIds !== undefined) {
      if (!body.secondaryAssigneeIds.length) {
        a.secondaryAssignees.removeAll();
      } else {
        const cnt = await this.em.count(User, {
          id: { $in: body.secondaryAssigneeIds },
          organization: organizationId,
        });
        if (cnt !== body.secondaryAssigneeIds.length) {
          throw new BadRequestException('One or more secondary assignees were not found');
        }
        const users = await this.em.find(User, {
          id: { $in: body.secondaryAssigneeIds },
          organization: organizationId,
        });
        a.secondaryAssignees.set(users);
      }
    }
    if (body.stageInstanceId !== undefined) {
      const st = await this.em.findOne(StageInstance, {
        id: body.stageInstanceId,
        processTrack: { id: processTrackId, organization: organizationId },
      });
      if (!st) throw new NotFoundException('Target stage not found');
      a.stageInstance = st;
    }
    if (body.workflowStateCategory !== undefined) {
      a.workflowStateCategory = this.parseWorkflowStateCategory(
        body.workflowStateCategory,
        a.workflowStateCategory,
      );
      if (a.workflowStateCategory === WorkflowStateCategory.DONE) {
        a.completedAt = new Date();
      } else {
        a.completedAt = undefined;
      }
    }
    await this.em.flush();
    if (
      userId
      && body.stageInstanceId !== undefined
      && body.stageInstanceId !== fromStageId
    ) {
      await this.logEvent(
        processTrackId,
        organizationId,
        ProcessTrackEventType.ACTIVITY_MOVED,
        {
          activityInstanceId: a.id,
          fromStageInstanceId: fromStageId,
          toStageInstanceId: body.stageInstanceId,
        },
        userId,
      );
    }
    if (
      userId
      && body.workflowStateCategory === WorkflowStateCategory.DONE
      && fromCat !== WorkflowStateCategory.DONE
    ) {
      await this.logEvent(
        processTrackId,
        organizationId,
        ProcessTrackEventType.ACTIVITY_COMPLETED,
        { activityInstanceId: a.id, from: fromCat, to: WorkflowStateCategory.DONE },
        userId,
      );
    }
    return a;
  }

  /**
   * Appends a new stage instance at the end of the track (order = max+1, PENDING).
   * Uses the last blueprint stage code by default so the template exists in the resolved tree.
   */
  async addStageInstance(
    processTrackId: string,
    organizationId: string,
    userId: string,
    body?: { stageTemplateCode?: string },
  ): Promise<StageInstance> {
    const pt = await this.em.findOne(
      ProcessTrack,
      { id: processTrackId, organization: organizationId },
      { populate: ['blueprint'] },
    );
    if (!pt) throw new NotFoundException();
    const tree = await this.resolver.resolveForProcessTrack(pt);
    const codes = new Set(tree.stages.map((s) => s.code));
    const sorted = [...tree.stages].sort((a, b) => a.order - b.order);
    const defaultCode = sorted.length ? sorted[sorted.length - 1]!.code : 'general';
    let templateCode = body?.stageTemplateCode?.trim();
    if (templateCode) {
      if (!codes.has(templateCode)) {
        throw new BadRequestException(
          `Invalid stageTemplateCode (not in blueprint): ${templateCode}. Valid: ${[...codes].join(', ')}`,
        );
      }
    } else {
      templateCode = defaultCode;
    }
    const existing = await this.em.find(StageInstance, {
      processTrack: { id: processTrackId, organization: organizationId },
    });
    const maxOrder = existing.length ? Math.max(...existing.map((s) => s.order)) : -1;
    const si = this.em.create(StageInstance, {
      organization: organizationId,
      processTrack: pt,
      stageTemplateCode: templateCode!,
      order: maxOrder + 1,
      status: StageInstanceStatus.PENDING,
      isReverted: false,
    } as any);
    await this.em.persistAndFlush(si);
    await this.logEvent(
      processTrackId,
      organizationId,
      ProcessTrackEventType.STAGE_INSTANCE_CREATED,
      { stageInstanceId: si.id, stageTemplateCode: templateCode, order: si.order },
      userId,
    );
    await this.resolver.persistSnapshotForProcessTrack(pt);
    return si;
  }

  async patchStageMetadata(
    processTrackId: string,
    stageInstanceId: string,
    organizationId: string,
    body: {
      label?: string;
      stageColor?: string;
      responsibleUserId?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    const st = await this.em.findOne(StageInstance, {
      id: stageInstanceId,
      processTrack: { id: processTrackId, organization: organizationId },
    });
    if (!st) throw new NotFoundException();
    const prev: Record<string, unknown> = { ...(st.metadata ?? {}) };
    if (body.label !== undefined) prev['label'] = body.label;
    if (body.stageColor !== undefined) prev['stageColor'] = body.stageColor;
    if (body.responsibleUserId !== undefined) {
      if (body.responsibleUserId) {
        const u = await this.em.findOne(User, { id: body.responsibleUserId, organization: organizationId });
        if (!u) throw new NotFoundException('Responsible user not found');
      }
      prev['responsibleUserId'] = body.responsibleUserId;
    }
    if (body.metadata) {
      const rest = { ...body.metadata } as Record<string, unknown>;
      delete rest[STAGE_INSTANCE_METADATA_WORK_CLOSED_AT];
      Object.assign(prev, rest);
    }
    st.metadata = Object.keys(prev).length ? prev : undefined;
    await this.em.flush();
    return st;
  }

  async patchTrackMetadata(
    processTrackId: string,
    organizationId: string,
    body: {
      icon?: string;
      iconColor?: string;
      label?: string;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    const pt = await this.em.findOne(ProcessTrack, { id: processTrackId, organization: organizationId });
    if (!pt) throw new NotFoundException();
    const prev: Record<string, unknown> = { ...(pt.metadata ?? {}) };
    if (body.icon !== undefined) prev['icon'] = body.icon;
    if (body.iconColor !== undefined) prev['iconColor'] = body.iconColor;
    if (body.label !== undefined) prev['label'] = body.label;
    if (body.metadata) Object.assign(prev, body.metadata);
    pt.metadata = Object.keys(prev).length ? prev : undefined;
    await this.em.flush();
    return this.getOne(processTrackId, organizationId);
  }

  async deleteActivity(processTrackId: string, activityId: string, organizationId: string) {
    const a = await this.em.findOne(
      ActivityInstance,
      {
        id: activityId,
        organization: organizationId,
        stageInstance: { processTrack: { id: processTrackId, organization: organizationId } },
      },
      { populate: ['stageInstance'] },
    );
    if (!a) throw new NotFoundException();
    const sInst = a.stageInstance as StageInstance;
    if (isStageInstanceTerminalForEdits({ status: sInst.status, metadata: sInst.metadata })) {
      throw new BadRequestException({ message: 'Stage is not editable', code: 'STAGE_NOT_EDITABLE' });
    }
    await this.em.removeAndFlush(a);
  }
}
