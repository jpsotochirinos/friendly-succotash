import type { EntityManager } from '@mikro-orm/postgresql';
import { Blueprint, BlueprintVersion, StageTemplate, ActivityTemplate } from '../entities';
import { BlueprintScope } from '@tracker/shared';
import { BlueprintDocumentType } from '@tracker/shared';
import { ALL_SYSTEM_BLUEPRINT_DEFS, type SystemBlueprintDef } from './system-blueprints';

/** Seeding has no request / TenantInterceptor; ORM would fail applying `tenant` on joined refs. */
const noTenant = { filters: { tenant: false } as const };

async function hasProcessTracks(em: EntityManager, blueprintId: string): Promise<boolean> {
  const rows = (await em.getConnection().execute(
    'SELECT COUNT(*)::int AS c FROM process_tracks WHERE blueprint_id = ?',
    [blueprintId],
  )) as Array<{ c: number }>;
  return (rows[0]?.c ?? 0) > 0;
}

async function removeVersionContent(em: EntityManager, versionId: string): Promise<void> {
  await em.getConnection().execute(
    'DELETE FROM activity_templates WHERE stage_template_id IN (SELECT id FROM stage_templates WHERE blueprint_version_id = ?)',
    [versionId],
  );
  await em.getConnection().execute('DELETE FROM stage_templates WHERE blueprint_version_id = ?', [versionId]);
  await em.flush();
}

function sortActs<T extends { order: number }>(xs: T[]): T[] {
  return [...xs].sort((a, b) => a.order - b.order);
}

async function persistStagesAndActivities(
  em: EntityManager,
  ver: BlueprintVersion,
  def: SystemBlueprintDef,
): Promise<void> {
  for (const st of sortActs(def.stages)) {
    const stage = em.create(StageTemplate, {
      blueprintVersion: ver,
      code: st.code,
      name: st.name,
      order: st.order,
      isOptional: st.isOptional ?? false,
      isParallelizable: false,
    } as any);
    em.persist(stage);
    await em.flush();
    for (const act of sortActs(st.activities)) {
      em.create(ActivityTemplate, {
        stageTemplate: stage,
        code: act.code,
        name: act.name,
        order: act.order,
        isMandatory: act.isMandatory ?? false,
        requiresDocument: act.requiresDocument ?? false,
        suggestedDocumentType: act.suggestedDocumentType ?? BlueprintDocumentType.OTRO,
        description: act.description,
        estimatedDurationMinutes: act.estimatedDurationMinutes,
      } as any);
    }
  }
  await em.flush();
}

/**
 * Create SYSTEM `Blueprint` by `code` with published v1 and full stage/activity tree.
 */
async function createBlueprintFromScratch(em: EntityManager, def: SystemBlueprintDef): Promise<void> {
  const bp = em.create(Blueprint, {
    scope: BlueprintScope.SYSTEM,
    code: def.code,
    name: def.name,
    description: def.description ?? 'Blueprint de sistema (seed).',
    matterType: def.matterType,
    isActive: true,
  } as any);
  em.persist(bp);
  await em.flush();
  const ver = em.create(BlueprintVersion, {
    blueprint: bp,
    versionNumber: 1,
    isDraft: false,
    changelog: def.changelog,
    publishedAt: new Date(),
  } as any);
  em.persist(ver);
  await em.flush();
  await persistStagesAndActivities(em, ver, def);
  bp.currentVersion = ver;
  await em.flush();
}

/**
 * Idempotent: create missing SYSTEM blueprints; optionally replace content for `enrichInPlace` defs.
 */
export async function seedSystemBlueprints(em: EntityManager): Promise<void> {
  for (const def of ALL_SYSTEM_BLUEPRINT_DEFS) {
    const existing = await em.findOne(Blueprint, { scope: BlueprintScope.SYSTEM, code: def.code }, noTenant);
    if (!existing) {
      await createBlueprintFromScratch(em, def);
      continue;
    }
    if (def.enrichInPlace) {
      if (await hasProcessTracks(em, existing.id)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[seed-system-blueprints] skip enrich in-place for ${def.code}: process_tracks reference this blueprint`,
        );
        continue;
      }
      const ver = await em.findOne(
        BlueprintVersion,
        { blueprint: { id: existing.id }, versionNumber: 1 },
        noTenant,
      );
      if (!ver) {
        // eslint-disable-next-line no-console
        console.warn(`[seed-system-blueprints] no v1 for ${def.code}, skip enrich`);
        continue;
      }
      await removeVersionContent(em, ver.id);
      const verFresh = await em.findOne(BlueprintVersion, { id: ver.id }, noTenant);
      if (!verFresh) continue;
      await persistStagesAndActivities(em, verFresh, def);
      if (def.description) {
        const bp2 = await em.findOne(Blueprint, { id: existing.id }, noTenant);
        if (bp2) {
          bp2.description = def.description;
          await em.flush();
        }
      }
    }
  }
}
