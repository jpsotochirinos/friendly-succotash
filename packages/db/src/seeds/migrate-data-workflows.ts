/**
 * Idempotent data migration: assigns `workflow_id` and `current_state_id` to
 * WorkflowItem / WorkflowTemplateItem rows (including parents) from system
 * workflow definitions. Syncs `current_state_id` from legacy `status` when
 * `workflow_id` is already set.
 *
 * Run after migrations + `pnpm --filter @tracker/db seed:workflows`.
 */
import { MikroORM } from '@mikro-orm/postgresql';
import config from '../mikro-orm.config';
import {
  WorkflowDefinition,
  WorkflowItem,
  WorkflowState,
  WorkflowTemplateItem,
  Trackable,
} from '../entities';
import {
  ActionType,
  MatterType,
  WorkflowItemStatus,
  matterFallbackWorkflowSlug,
  systemWorkflowSlugForActionType,
} from '@tracker/shared';
import { seedSystemWorkflows } from './workflows.seed';

function slugForLeafItem(actionType: ActionType | undefined | null, matterType: MatterType): string {
  if (actionType) {
    return systemWorkflowSlugForActionType(actionType);
  }
  return matterFallbackWorkflowSlug(matterType);
}

async function main() {
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();
  try {
    await seedSystemWorkflows(em);

    const workflows = await em.find(WorkflowDefinition, {
      isSystem: true,
      organization: null,
    });
    const wfBySlug = new Map<string, WorkflowDefinition>();
    for (const w of workflows) {
      wfBySlug.set(w.slug, w);
    }

    const statesByWorkflow = new Map<string, Map<string, WorkflowState>>();
    const allStates = await em.find(WorkflowState, { workflow: { $in: workflows } } as any, {
      populate: ['workflow'] as any,
    });
    for (const s of allStates) {
      const wid = (s.workflow as WorkflowDefinition).id;
      if (!statesByWorkflow.has(wid)) statesByWorkflow.set(wid, new Map());
      statesByWorkflow.get(wid)!.set(s.key, s);
    }

    const items = await em.find(
      WorkflowItem,
      {},
      {
        filters: false,
        populate: ['parent', 'currentState'] as any,
      },
    );

    let wiUpdated = 0;
    for (const item of items) {
      if (item.workflow && item.currentState) continue;

      const trackableRef = item.trackable as Trackable | string;
      const trackableId =
        typeof trackableRef === 'object' && trackableRef
          ? (trackableRef as Trackable).id
          : (trackableRef as string);
      const trackable = await em.findOne(Trackable, { id: trackableId }, { filters: false });
      if (!trackable) {
        console.warn(`No trackable for item ${item.id}, skipping`);
        continue;
      }
      const slug = slugForLeafItem(item.actionType ?? null, trackable.matterType);
      let wf = wfBySlug.get(slug);
      if (!wf) {
        wf = wfBySlug.get(matterFallbackWorkflowSlug(trackable.matterType));
      }
      if (!wf) {
        console.warn(`No workflow for slug ${slug}, item ${item.id}, skipping`);
        continue;
      }
      const stateMap = statesByWorkflow.get(wf.id);
      const key =
        (item.currentState as WorkflowState | undefined)?.key ?? WorkflowItemStatus.PENDING;
      const st = stateMap?.get(key);
      if (!st) {
        console.warn(`No state for key ${key} on item ${item.id}, skipping`);
        continue;
      }
      item.workflow = wf;
      item.currentState = st;
      wiUpdated++;
    }

    /** `filters: false`: populate de `template` puede tocar relaciones que encadenan entidades con filtro tenant. */
    const tplItems = await em.find(WorkflowTemplateItem, {}, {
      filters: false,
      populate: ['template'] as any,
    });

    let wtiUpdated = 0;
    for (const ti of tplItems) {
      if (ti.workflow && ti.currentState) continue;

      const template = ti.template as { matterType: MatterType };
      const slug = slugForLeafItem(ti.actionType ?? null, template.matterType);
      let wf = wfBySlug.get(slug);
      if (!wf) {
        wf = wfBySlug.get(matterFallbackWorkflowSlug(template.matterType));
      }
      if (!wf) continue;
      const stateMap = statesByWorkflow.get(wf.id);
      const defaultStatus = 'pending';
      const st = stateMap?.get(defaultStatus);
      if (!st) continue;
      ti.workflow = wf;
      ti.currentState = st;
      wtiUpdated++;
    }

    await em.flush();
    console.log(
      `migrate-data-workflows: updated ${wiUpdated} workflow_items, ${wtiUpdated} workflow_template_items (missing workflow/state).`,
    );
  } finally {
    await orm.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
