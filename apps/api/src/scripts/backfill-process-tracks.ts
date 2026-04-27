/**
 * One-shot: create a freeform ProcessTrack for every Trackable that has none.
 *
 * Usage (from repo root, with .env loaded):
 *   pnpm --filter @tracker/api backfill:process-tracks -- --dry-run
 *   pnpm --filter @tracker/api backfill:process-tracks -- --org <organization-uuid>
 *
 * Prerequisite: system blueprint `freeform-estilo-libre` must exist:
 *   pnpm --filter @tracker/db seed:system-blueprints
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProcessTracksService } from '../modules/process-tracks/process-tracks.service';
import { MikroORM } from '@mikro-orm/core';

function parseArgs(argv: string[]) {
  const args = argv.filter((a) => a !== '--');
  let dryRun = false;
  let orgId: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') dryRun = true;
    else if (a === '--org' && args[i + 1]) {
      orgId = args[++i];
    }
  }
  return { dryRun, orgId };
}

async function main() {
  const { dryRun, orgId } = parseArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const processTracks = app.get(ProcessTracksService);
  const em = app.get(MikroORM).em;

  const params: unknown[] = [];
  let orgSql = '';
  if (orgId) {
    orgSql = ' AND t.organization_id = ?';
    params.push(orgId);
  }

  const rows = (await em.getConnection().execute(
    `SELECT t.id AS id, t.organization_id AS organization_id
     FROM trackables t
     WHERE NOT EXISTS (SELECT 1 FROM process_tracks p WHERE p.trackable_id = t.id)${orgSql}`,
    params,
  )) as Array<{ id: string; organization_id: string }>;

  let created = 0;
  let errors = 0;

  console.log(`Found ${rows.length} trackable(s) without process track(s)${orgId ? ` (org=${orgId})` : ''}.`);
  if (dryRun) {
    for (const r of rows) {
      console.log(`[dry-run] would create freeform process track for trackable=${r.id} org=${r.organization_id}`);
    }
    console.log(`dry-run summary: would create=${rows.length}`);
    await app.close();
    return;
  }

  for (const r of rows) {
    try {
      const pt = await processTracks.createFreeStyle(r.id, r.organization_id);
      created++;
      console.log(`[ok] created process track id=${pt.id} for trackable=${r.id}`);
    } catch (e) {
      errors++;
      console.error(`[err] trackable=${r.id} org=${r.organization_id}:`, e);
    }
  }

  console.log(`summary: created=${created}, errors=${errors}`);
  await app.close();
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
