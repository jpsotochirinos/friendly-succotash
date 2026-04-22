/**
 * Comprueba que la BD está lista para el motor configurable (Fase 2/3):
 * orgs con flag, y filas `workflow_items` / `workflow_template_items` con
 * `workflow_id` + `current_state_id` (todas las filas, no solo hojas).
 *
 * Uso:
 *   pnpm --filter @tracker/db validate:workflow-readiness
 *   pnpm --filter @tracker/db validate:workflow-readiness -- --strict
 *
 * `--strict`: exit code 1 si falta workflow/estado en alguna fila.
 */
import { MikroORM } from '@mikro-orm/postgresql';
import config from '../mikro-orm.config';

type Row = { c?: string | number };

async function scalarCount(conn: { execute: (q: string) => Promise<unknown> }, sql: string): Promise<number> {
  const res = (await conn.execute(sql)) as Row[] | { rows?: Row[] };
  const rows = Array.isArray(res) ? res : res.rows ?? [];
  const first = rows[0] as Record<string, unknown> | undefined;
  if (!first) return 0;
  const v = first.c ?? first.count;
  return typeof v === 'string' ? parseInt(v, 10) : Number(v ?? 0);
}

async function main() {
  const strict = process.argv.includes('--strict');
  const orm = await MikroORM.init(config);
  const conn = orm.em.getConnection();

  try {
    const orgsNotOnConfigurable = await scalarCount(
      conn,
      `
      SELECT COUNT(*)::int AS c
      FROM organizations
      WHERE NOT (COALESCE(feature_flags, '{}'::jsonb) @> '{"useConfigurableWorkflows": true}'::jsonb)
      `,
    );

    const orgsExplicitFalse = await scalarCount(
      conn,
      `
      SELECT COUNT(*)::int AS c
      FROM organizations
      WHERE (feature_flags->>'useConfigurableWorkflows') = 'false'
      `,
    );

    const allItemsMissingWf = await scalarCount(
      conn,
      `
      SELECT COUNT(*)::int AS c
      FROM workflow_items wi
      WHERE wi.workflow_id IS NULL OR wi.current_state_id IS NULL
      `,
    );

    const allTemplateItemsMissingWf = await scalarCount(
      conn,
      `
      SELECT COUNT(*)::int AS c
      FROM workflow_template_items wi
      WHERE wi.workflow_id IS NULL OR wi.current_state_id IS NULL
      `,
    );

    console.log('validate-workflow-readiness\n');
    console.log(`  Organizations sin flag useConfigurableWorkflows=true: ${orgsNotOnConfigurable}`);
    console.log(`  Organizations con flag explícito false:               ${orgsExplicitFalse}`);
    console.log(`  workflow_items sin workflow_id o current_state_id:    ${allItemsMissingWf}`);
    console.log(`  workflow_template_items sin workflow/estado:          ${allTemplateItemsMissingWf}`);

    const blocking = allItemsMissingWf > 0 || allTemplateItemsMissingWf > 0;
    if (blocking) {
      console.log(
        '\n  Acción: ejecutar `pnpm --filter @tracker/db migrate:data:workflows` y volver a validar.',
      );
      if (strict) {
        process.exitCode = 1;
      }
    } else {
      console.log('\n  OK: todas las filas tienen workflow_id y current_state_id.');
    }

    if (orgsNotOnConfigurable > 0) {
      console.log(
        '\n  Nota: hay orgs sin el flag en true (p. ej. JSON vacío o clave ausente). Revisar o alinear con Migration_25 / PATCH organizations.',
      );
    }
  } finally {
    await orm.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
