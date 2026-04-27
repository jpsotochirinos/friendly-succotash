import { Injectable, Logger } from '@nestjs/common';
import { MikroORM, type EntityManager } from '@mikro-orm/core';
import { SinoeNotification, WorkflowItem, WorkflowState } from '@tracker/db';
import { LEGAL_PROCESS_ROOT_KIND } from '@tracker/shared';
import { LegalProcessAdvanceService } from './legal-process-advance.service';
import { sinoeKeywordsMatch } from '../legal-process-sinoe-match.util';

@Injectable()
export class LegalProcessSinoeMatcherService {
  private readonly logger = new Logger(LegalProcessSinoeMatcherService.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly advanceService: LegalProcessAdvanceService,
  ) {}

  /**
   * Procesa job BullMQ: transacción + filtro tenant.
   */
  async processJob(organizationId: string, notificationId: string): Promise<boolean> {
    return this.orm.em.transactional(async (em) => {
      em.setFilterParams('tenant', { organizationId });
      return this.matchAndAdvance(em, organizationId, notificationId);
    });
  }

  async matchAndAdvance(
    em: EntityManager,
    organizationId: string,
    notificationId: string,
  ): Promise<boolean> {
    const notif = await em.findOne(
      SinoeNotification,
      { id: notificationId, organization: organizationId },
      { populate: ['trackable'] },
    );
    if (!notif?.trackable) {
      return false;
    }

    const trackableId =
      typeof notif.trackable === 'object' ? notif.trackable.id : notif.trackable;

    const root = await em.findOne(
      WorkflowItem,
      {
        trackable: trackableId,
        kind: LEGAL_PROCESS_ROOT_KIND,
        parent: null,
        organization: organizationId,
      },
      { populate: ['workflow', 'currentState'] },
    );
    if (!root?.workflow) {
      return false;
    }

    const current = root.currentState;
    const currentOrder =
      current?.stageOrderIndex ?? current?.sortOrder ?? -1;

    const candidates = await em.find(
      WorkflowState,
      {
        workflow: root.workflow.id,
        stageOrderIndex: { $gt: currentOrder },
      },
      { orderBy: { stageOrderIndex: 'ASC' } },
    );

    for (const st of candidates) {
      const kws = st.sinoeKeywords;
      if (!kws?.length) continue;
      if (!sinoeKeywordsMatch(notif.sumilla ?? '', kws)) continue;

      await this.advanceService.advanceAutomaticBySinoe(organizationId, notif, st, em);
      notif.workflowItem = root;
      await em.flush();
      this.logger.log(
        `SINOE matcher: trackable=${trackableId} → ${st.name} (notif ${notif.id})`,
      );
      return true;
    }

    return false;
  }
}
