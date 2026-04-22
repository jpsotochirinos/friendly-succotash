/**
 * Runner aislado: ejecuta SinoeScraper sin API/worker/Postgres/Redis/MinIO.
 * Uso: `pnpm --filter @tracker/worker sinoe:debug`
 * Requiere en .env (o env): SINOE_USERNAME, SINOE_PASSWORD, y claves CAPTCHA según estrategia.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { config as loadDotenv } from 'dotenv';

const monorepoRootEnv = resolve(__dirname, '../../../../../../.env');
const cwdEnv = resolve(process.cwd(), '.env');
if (existsSync(monorepoRootEnv)) {
  loadDotenv({ path: monorepoRootEnv });
  console.log('[sinoe:debug] Loaded env from', monorepoRootEnv);
} else if (existsSync(cwdEnv)) {
  loadDotenv({ path: cwdEnv });
  console.log('[sinoe:debug] Loaded env from', cwdEnv);
} else {
  loadDotenv();
}

import type { ScrapeResult } from '../../base-scraper';
import { SinoeScraper } from '../sinoe-scraper';

function envBool(name: string, defaultValue: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === '') return defaultValue;
  return v === '1' || v.toLowerCase() === 'true';
}

function sanitizeResult(r: ScrapeResult): Record<string, unknown> {
  return {
    success: r.success,
    errors: r.errors,
    scrapedAt: r.scrapedAt.toISOString(),
    meta: r.meta,
    data: r.data.map((row) => {
      const rec = row as Record<string, unknown>;
      const anexos = rec.anexos as
        | Array<Record<string, unknown> & { fileBuffer?: Buffer }>
        | undefined;
      const anexosSafe =
        anexos?.map((a) => {
          const { fileBuffer, ...rest } = a;
          return {
            ...rest,
            fileBufferPresent: Boolean(fileBuffer),
            fileBufferLength: fileBuffer?.length ?? 0,
          };
        }) ?? [];
      return { ...rec, anexos: anexosSafe };
    }),
  };
}

async function main(): Promise<void> {
  process.env.SINOE_DEBUG = 'true';
  process.env.SINOE_LOG_VERBOSE = '1';

  // `sinoe:debug` muestra el navegador por defecto aunque `.env` tenga SINOE_HEADLESS=true.
  // Para forzar headless en esta corrida: SINOE_DEBUG_HEADLESS=true
  if (envBool('SINOE_DEBUG_HEADLESS', false)) {
    process.env.SINOE_HEADLESS = 'true';
  } else {
    process.env.SINOE_HEADLESS = 'false';
  }

  const username = process.env.SINOE_USERNAME?.trim();
  const password = process.env.SINOE_PASSWORD?.trim();
  if (!username || !password) {
    console.error(
      '[sinoe:debug] Missing SINOE_USERNAME and/or SINOE_PASSWORD. Add them to friendly-succotash/.env (local only; do not commit).',
    );
    process.exit(1);
  }

  const outDir = process.env.SINOE_RUN_OUT_DIR?.trim() || join('/tmp', `sinoe-run-${Date.now()}`);
  mkdirSync(outDir, { recursive: true });

  const slowMo = Number(process.env.SINOE_SLOWMO_MS) || 150;
  const pauseOnError = envBool('SINOE_PAUSE_ON_ERROR', true);

  console.log('[sinoe:debug] outDir =', outDir);
  console.log('[sinoe:debug] SINOE_HEADLESS =', process.env.SINOE_HEADLESS);
  console.log('[sinoe:debug] slowMo =', slowMo, 'pauseOnError =', pauseOnError);

  const scraper = new SinoeScraper({
    outDir,
    slowMo,
    pauseOnError,
  });

  let result: ScrapeResult;
  try {
    result = await scraper.scrape({
      username,
      password,
      baseUrl: process.env.SINOE_BASE_URL || undefined,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[sinoe:debug] Unhandled error:', msg);
    writeFileSync(
      join(outDir, 'result.json'),
      JSON.stringify({ success: false, errors: [msg], scrapedAt: new Date().toISOString() }, null, 2),
    );
    process.exit(1);
    return;
  }

  const safe = sanitizeResult(result);
  writeFileSync(join(outDir, 'result.json'), JSON.stringify(safe, null, 2));
  console.log('[sinoe:debug] result.json →', join(outDir, 'result.json'));
  console.log('[sinoe:debug] trace (if enabled) →', join(outDir, 'trace.zip'));
  const tracePath = join(outDir, 'trace.zip');
  console.log(
    '[sinoe:debug] Ver trace (Playwright del workspace; si `npx playwright` da Permission denied, usa esto):',
  );
  console.log(`  pnpm --filter @tracker/worker exec playwright show-trace ${JSON.stringify(tracePath)}`);
  console.log('[sinoe:debug] success =', result.success, 'rows =', result.data.length);

  try {
    const names = readdirSync(outDir).sort();
    console.log('[sinoe:debug] Archivos en outDir (' + names.length + '):');
    for (const name of names) {
      console.log('  ', join(outDir, name));
    }
    const pngs = names.filter((n) => n.endsWith('.png'));
    if (pngs.length === 0) {
      console.log(
        '[sinoe:debug] No hay .png en outDir: si falló el login, revisa trace.zip (Timeline) o abre el visor de trazas.',
      );
    }
  } catch {
    /* ignore */
  }

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error('[sinoe:debug] Fatal:', err);
  process.exit(1);
});
