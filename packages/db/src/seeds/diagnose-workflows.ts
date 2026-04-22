/**
 * Diagnóstico de workflows configurables por organización.
 *
 * Uso:
 *   pnpm --filter @tracker/db diagnose:workflows -- --org <uuid-org | email-usuario>
 *
 * Si no se pasa --org, usa la primera organización de la BD (orden por nombre).
 */
import { MikroORM } from '@mikro-orm/postgresql';
import config from '../mikro-orm.config';
import { Organization, User, WorkflowDefinition, WorkflowState, WorkflowTransition } from '../entities';
import type { EntityManager } from '@mikro-orm/postgresql';

function parseOrgArg(): string | undefined {
  const idx = process.argv.indexOf('--org');
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1].trim();
  return undefined;
}

async function resolveOrganizationId(em: EntityManager, arg?: string): Promise<string> {
  if (!arg) {
    const rows = await em.find(Organization, {}, { orderBy: { name: 'ASC' }, limit: 1, filters: false });
    const first = rows[0];
    if (!first) throw new Error('No hay organizaciones en la BD.');
    return first.id;
  }

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRe.test(arg)) return arg;

  const user = await em.findOne(
    User,
    { email: arg.toLowerCase() },
    { populate: ['organization'], filters: false },
  );
  if (!user) throw new Error(`Usuario con email "${arg}" no encontrado.`);
  const oid = (user.organization as { id: string } | undefined)?.id;
  if (!oid) throw new Error('Usuario sin organización.');
  return oid;
}

async function main() {
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();
  const conn = em.getConnection();

  try {
    const orgArg = parseOrgArg();
    const organizationId = await resolveOrganizationId(em, orgArg);

    const org = await em.findOne(Organization, { id: organizationId }, { filters: false });
    if (!org) throw new Error(`Organización ${organizationId} no encontrada.`);

    console.log('=== diagnose-workflows ===\n');
    console.log(`Organización: ${org.name} (${org.id})`);
    const ff = org.featureFlags?.useConfigurableWorkflows;
    console.log(`  featureFlags.useConfigurableWorkflows: ${ff === true ? 'true' : ff === false ? 'false' : '(ausente / undefined)'}`);
    console.log(`  workflowActionTypeDefaults: ${JSON.stringify(org.workflowActionTypeDefaults ?? null)}`);

    const systemWfs = await em.find(
      WorkflowDefinition,
      { isSystem: true, organization: null },
      { orderBy: { slug: 'ASC' }, filters: false },
    );
    console.log(`\nWorkflows del sistema (is_system, organization null): ${systemWfs.length}`);
    for (const w of systemWfs) {
      console.log(`  - ${w.slug}  (${w.name})  id=${w.id}`);
    }

    const orgWfs = await em.find(
      WorkflowDefinition,
      { organization: organizationId },
      { orderBy: { slug: 'ASC' }, filters: false },
    );
    console.log(`\nWorkflows propios de la org: ${orgWfs.length}`);
    for (const w of orgWfs) {
      console.log(`  - ${w.slug}  (${w.name})  id=${w.id}`);
    }

    const leafMissingSql = `
      SELECT COUNT(*)::int AS c
      FROM workflow_items wi
      WHERE wi.organization_id = ?
        AND NOT EXISTS (SELECT 1 FROM workflow_items c WHERE c.parent_id = wi.id)
        AND (wi.workflow_id IS NULL OR wi.current_state_id IS NULL)
    `;
    const leafMissing = await conn.execute(leafMissingSql, [organizationId]);
    const leafMissingCount = extractCount(leafMissing);
    console.log(`\nHojas workflow_items sin workflow_id o current_state_id (esta org): ${leafMissingCount}`);

    const allWfs = [...systemWfs, ...orgWfs];
    const seen = new Set<string>();
    const uniqueWorkflowIds = allWfs.map((w) => w.id).filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    console.log('\n--- Matriz de estados y transiciones (por workflow) ---\n');

    for (const wfId of uniqueWorkflowIds) {
      const wf = allWfs.find((w) => w.id === wfId);
      if (!wf) continue;
      const states = await em.find(
        WorkflowState,
        { workflow: wfId },
        { orderBy: { sortOrder: 'ASC', key: 'ASC' }, filters: false },
      );
      const transitions = await em.find(
        WorkflowTransition,
        { workflow: wfId },
        { populate: ['fromState', 'toState'], filters: false },
      );

      console.log(`Workflow: ${wf.slug}  [${wf.isSystem ? 'system' : 'org'}]  id=${wf.id}`);
      console.log(`  Estados (${states.length}):`);
      for (const s of states) {
        const ini = s.isInitial ? ' [INITIAL]' : '';
        console.log(`    - ${s.key}  (${s.name})  category=${s.category}${ini}`);
      }
      console.log(`  Transiciones (${transitions.length}):`);
      for (const t of transitions) {
        const fromK = t.fromState ? (t.fromState as WorkflowState).key : '(null)';
        const toK = (t.toState as WorkflowState).key;
        const perm = t.requiredPermission ? ` perm=${t.requiredPermission}` : '';
        console.log(`    ${fromK} --[${t.name}]--> ${toK}${perm}`);
      }
      console.log('');
    }

    console.log('--- Acciones sugeridas ---\n');
    if (ff !== true) {
      console.log('  - Activar flag: PATCH /api/organizations/me con body { "featureFlags": { "useConfigurableWorkflows": true } }');
    }
    if (systemWfs.length === 0) {
      console.log('  - Sembrar workflows del sistema: pnpm --filter @tracker/db seed:workflows');
    }
    if (leafMissingCount > 0) {
      console.log('  - Backfill hojas: pnpm --filter @tracker/db migrate:data:workflows');
    }
    if (ff === true && leafMissingCount === 0 && systemWfs.length > 0) {
      console.log('  - Datos básicos OK para Kanban en esta org (revisar transiciones si el drag sigue bloqueado).');
    }
  } finally {
    await orm.close();
  }
}

function extractCount(result: unknown): number {
  const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? [];
  const first = rows[0] as Record<string, unknown> | undefined;
  if (!first) return 0;
  const v = first.c ?? first.count;
  return typeof v === 'string' ? parseInt(v, 10) : Number(v ?? 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
