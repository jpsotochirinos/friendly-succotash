/**
 * workflow_items → activity_instances (misma org, etapa 0 del process track del expediente).
 * Requisito: expediente tenga al menos un ProcessTrack (p. ej. pnpm --filter @tracker/api backfill:process-tracks).
 *
 *   pnpm exec ts-node -T ./src/seeds/migrate-workflow-items-to-activities.ts -- --dry-run
 */
import { MikroORM } from '@mikro-orm/core';
import { ProcessTrackRole, WorkflowStateCategory } from '@tracker/shared';
import { ActivityInstance, ProcessTrack, StageInstance, Trackable, WorkflowItem } from '../entities';
import ormConfig from '../mikro-orm.config';

const dryRun = process.argv.includes('--dry-run');

export async function runMigrate(orm: MikroORM) {
  const em = orm.em.fork();
  const items = await em.find(
    WorkflowItem,
    {},
    {
      filters: { tenant: false } as const,
      populate: [
        'trackable',
        'currentState',
        'organization',
        'assignedTo',
        'reviewedBy',
        'parent',
        'documentTemplate',
        'workflow',
      ],
    },
  );

  const wiIdToActivityId = new Map<string, string>();
  const pendingCreated: { wi: WorkflowItem; ai: ActivityInstance }[] = [];
  let created = 0;
  let skipped = 0;

  for (const wi of items) {
    const orgId = (wi as { organization?: { id: string } }).organization?.id;
    if (!orgId) {
      skipped++;
      continue;
    }
    const conn = em.getConnection();
    const hit = (await conn.execute(
      `SELECT 1 AS x FROM activity_instances
       WHERE organization_id = ? AND (metadata->>'sourceWorkflowItemId') = ? LIMIT 1`,
      [orgId, wi.id],
    )) as { x?: number }[];
    if (hit?.length) {
      skipped++;
      continue;
    }
    const track = wi.trackable;
    if (!track?.id) {
      skipped++;
      continue;
    }
    const pt = await em.findOne(
      ProcessTrack,
      { trackable: track.id, role: ProcessTrackRole.PRIMARY, organization: orgId },
      { filters: { tenant: false } as const, populate: ['currentStageInstance'] },
    );
    if (!pt) {
      console.warn(`[skip] no process track for trackable ${track.id} — run backfill:process-tracks`);
      skipped++;
      continue;
    }
    const stages = await em.find(
      StageInstance,
      { processTrack: pt.id, organization: orgId },
      { filters: { tenant: false } as const, orderBy: { order: 'ASC' } },
    );
    const st = stages[0];
    if (!st) {
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(`[dry-run] would create activity for workflow_item ${wi.id}`);
      created++;
      continue;
    }
    const cat = wi.currentState?.category;
    const baseMeta = { ...(wi.metadata && typeof wi.metadata === 'object' ? wi.metadata : {}) };
    const ai = em.create(ActivityInstance, {
      organization: orgId,
      stageInstance: st,
      trackable: em.getReference(Trackable, track.id),
      title: wi.title,
      description: wi.description,
      kind: wi.kind,
      actionType: wi.actionType,
      itemNumber: wi.itemNumber,
      startDate: wi.startDate,
      dueDate: wi.dueDate,
      location: wi.location,
      priority: wi.priority,
      allDay: wi.allDay,
      reminderMinutesBefore: wi.reminderMinutesBefore,
      calendarColor: wi.calendarColor,
      rrule: wi.rrule,
      isLegalDeadline: wi.isLegalDeadline,
      requiresDocument: wi.requiresDocument,
      accentColor: wi.accentColor,
      workflow: wi.workflow,
      currentState: wi.currentState,
      documentTemplate: wi.documentTemplate,
      assignedTo: wi.assignedTo,
      reviewedBy: wi.reviewedBy,
      completedAt: wi.completedAt,
      metadata: { ...baseMeta, sourceWorkflowItemId: wi.id, migratedAt: new Date().toISOString() },
      workflowStateCategory: (cat as WorkflowStateCategory) ?? WorkflowStateCategory.TODO,
      isCustom: true,
      isMandatory: true,
    } as any);
    em.persist(ai);
    pendingCreated.push({ wi, ai });
    created++;
  }

  if (!dryRun && pendingCreated.length) {
    await em.flush();
    for (const { wi, ai } of pendingCreated) {
      wiIdToActivityId.set(wi.id, ai.id);
    }
    for (const { wi } of pendingCreated) {
      const p = wi.parent;
      if (!p?.id) continue;
      const childAi = wiIdToActivityId.get(wi.id);
      const parentAi = wiIdToActivityId.get(p.id);
      if (!childAi || !parentAi) continue;
      const act = await em.findOne(
        ActivityInstance,
        {
          id: childAi,
          organization: (wi as { organization?: { id: string } }).organization?.id,
        },
        { filters: { tenant: false } as const },
      );
      if (act) {
        act.parent = em.getReference(ActivityInstance, parentAi);
      }
    }
    await em.flush();
  }
  console.log(`migrate-workflow-items-to-activities: created=${created} skipped=${skipped} dryRun=${dryRun}`);
}

async function main() {
  const orm = await MikroORM.init(ormConfig);
  try {
    await runMigrate(orm);
  } finally {
    await orm.close();
  }
}

if (require.main === module) {
  void main();
}
