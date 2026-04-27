import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  Blueprint,
  ProcessTrack,
  ComputedDeadline,
  DeadlineRule,
  StageInstance,
} from '@tracker/db';
import {
  BlueprintDeadlineTrigger,
  ComputedDeadlineStatusV2,
  DeadlineDurationUnit,
  DeadlineCalendarType,
} from '@tracker/shared';
import { LegalDeadlineCalculatorService } from '../legal/services/legal-deadline-calculator.service';
import { BlueprintResolverService } from '../blueprints/blueprint-resolver.service';

@Injectable()
export class DeadlineEngineService {

  constructor(
    private readonly em: EntityManager,
    private readonly calc: LegalDeadlineCalculatorService,
    private readonly resolver: BlueprintResolverService,
  ) {}

  /**
   * When a stage is entered, create `ComputedDeadline` rows for `DeadlineRule` with trigger `STAGE_ENTERED` for that stage code (idempotent per rule code).
   */
  async onStageEntered(
    processTrackId: string,
    stageInstanceId: string | undefined,
    organizationId: string,
  ): Promise<void> {
    if (!stageInstanceId) return;
    const pt = await this.em.findOne(
      ProcessTrack,
      { id: processTrackId, organization: organizationId },
      { populate: ['trackable', 'blueprint', 'currentStageInstance'] },
    );
    if (!pt) return;
    const instBp = await this.em.findOne(Blueprint, { id: (pt.blueprint as { id: string }).id });
    if (!instBp) return;
    const sys = await this.resolver.resolveSystemRoot(instBp);
    if (!sys.currentVersion) return;
    const rules = await this.em.find(DeadlineRule, {
      blueprintVersion: { id: sys.currentVersion.id },
      trigger: BlueprintDeadlineTrigger.STAGE_ENTERED,
    });
    const si = await this.em.findOne(StageInstance, { id: stageInstanceId, organization: organizationId });
    if (!si) return;
    for (const r of rules) {
      if (r.triggerTargetCode && r.triggerTargetCode !== si.stageTemplateCode) continue;
      const exists = await this.em.findOne(ComputedDeadline, {
        processTrack: pt,
        deadlineRuleCode: r.code,
        status: { $ne: ComputedDeadlineStatusV2.WAIVED },
      } as any);
      if (exists) continue;
      const triggerAt = si.enteredAt ?? new Date();
      const calType =
        r.durationUnit === DeadlineDurationUnit.JUDICIAL_BUSINESS_DAYS
          ? DeadlineCalendarType.JUDICIAL
          : DeadlineCalendarType.CALENDAR;
      const legal = await this.calc.calcularPlazo(triggerAt, r.durationDays, calType, {
        organizationId,
        courtName: (pt as any).trackable?.court ?? undefined,
      });
      const cd = this.em.create(ComputedDeadline, {
        organization: organizationId,
        processTrack: pt,
        deadlineRuleCode: r.code,
        legalDate: legal,
        effectiveDate: legal,
        triggeredAt: triggerAt,
        triggeredByEvent: 'stage_entered',
        status: ComputedDeadlineStatusV2.PENDING,
      } as any);
      await this.em.persistAndFlush(cd);
    }
  }
}
