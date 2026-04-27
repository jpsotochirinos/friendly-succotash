import { existsSync } from 'fs';
import { resolve } from 'path';
import { config as loadDotenv } from 'dotenv';

/** Misma clave que el API; prioriza `.env` en la raíz del monorepo (pnpm corre desde `apps/worker`). */
const monorepoRootEnv = resolve(__dirname, '../../../.env');
const cwdEnv = resolve(process.cwd(), '.env');
if (existsSync(monorepoRootEnv)) {
  loadDotenv({ path: monorepoRootEnv });
  console.log('[worker] Loaded env from', monorepoRootEnv);
} else if (existsSync(cwdEnv)) {
  loadDotenv({ path: cwdEnv });
  console.log('[worker] Loaded env from', cwdEnv);
} else {
  loadDotenv();
}

import { MikroORM } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { createEvaluationWorker } from './processors/evaluation.processor';
import { createScrapingWorker } from './processors/scraping.processor';
import { createDeadlineNotificationsWorker } from './processors/deadline-notifications.processor';
import { createTrashPurgeWorker } from './processors/trash-purge.processor';
import { createTimeTickWorker, scheduleTimeTickCron } from './processors/time-tick.processor';
import { createImportAnalyzeWorker } from './processors/import-analyze.processor';
import { createImportCommitWorker } from './processors/import-commit.processor';
import { createImportRevertWorker } from './processors/import-revert.processor';
import { createImportDriveIngestWorker } from './processors/import-drive-ingest.processor';
import { createImportMsGraphIngestWorker } from './processors/import-ms-graph-ingest.processor';
import { setupCronJobs } from './schedules/cron';
import { createWhatsAppBriefingWorker } from './processors/whatsapp-briefing.processor';
import { createWhatsAppActivityCleanupWorker } from './processors/whatsapp-activity-cleanup.processor';
import { createFeedIngestWorker } from './processors/feed-ingest.processor';
import { createDocxToPdfWorker } from './processors/docx-to-pdf.processor';
import { createSignaturesFinalizeWorker } from './processors/signatures-finalize.processor';
import { createSignaturesExpireWorker } from './processors/signatures-expire.processor';
import { createSinoeMatchWorker } from './processors/sinoe-match.processor';

async function bootstrap() {
  console.log('[worker] Starting...');

  const orm = await MikroORM.init({
    driver: (await import('@mikro-orm/postgresql')).PostgreSqlDriver,
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 5432,
    dbName: process.env.DATABASE_NAME || 'tracker_db',
    user: process.env.DATABASE_USER || 'tracker_user',
    password: process.env.DATABASE_PASSWORD || 'tracker_pass',
    entities: ['../../packages/db/dist/entities/**/*.js'],
    entitiesTs: ['../../packages/db/src/entities/**/*.ts'],
    metadataProvider: TsMorphMetadataProvider,
    debug: process.env.NODE_ENV === 'development',
  });

  console.log('[worker] ORM connected');

  createScrapingWorker(orm);
  console.log('[worker] Scraping worker registered');

  createEvaluationWorker(orm);
  console.log('[worker] Evaluation worker registered');

  createDeadlineNotificationsWorker(orm);
  console.log('[worker] Deadline notifications worker registered');

  createTrashPurgeWorker(orm);
  console.log('[worker] Trash purge worker registered');

  createTimeTickWorker(orm);
  console.log('[worker] Time tick worker registered');

  createImportAnalyzeWorker(orm);
  console.log('[worker] Import analyze worker registered');

  createImportCommitWorker(orm);
  console.log('[worker] Import commit worker registered');

  createImportRevertWorker(orm);
  console.log('[worker] Import revert worker registered');

  createImportDriveIngestWorker(orm);
  console.log('[worker] Import Drive ingest worker registered');

  createImportMsGraphIngestWorker(orm);
  console.log('[worker] Import MS Graph ingest worker registered');

  createWhatsAppBriefingWorker(orm);
  console.log('[worker] WhatsApp briefing worker registered');

  createWhatsAppActivityCleanupWorker(orm);
  console.log('[worker] WhatsApp activity cleanup worker registered');

  createFeedIngestWorker(orm);
  console.log('[worker] Feed ingest worker registered');

  createDocxToPdfWorker(orm);
  console.log('[worker] DOCX→PDF worker registered');

  createSignaturesFinalizeWorker(orm);
  console.log('[worker] Signatures finalize worker registered');

  createSignaturesExpireWorker(orm);
  console.log('[worker] Signatures expire worker registered');

  const sinoeMatchW = createSinoeMatchWorker(orm);
  if (sinoeMatchW) {
    console.log(
      '[worker] SINOE match worker registered (uses API dist — set DISABLE_SINOE_MATCH_WORKER=true on API to avoid double-processing)',
    );
  }

  await setupCronJobs();
  await scheduleTimeTickCron();
  console.log('[worker] Cron jobs scheduled');

  console.log('[worker] Ready — listening for jobs');

  process.on('SIGTERM', async () => {
    console.log('[worker] SIGTERM received, shutting down...');
    await orm.close();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error('[worker] Fatal error:', err);
  process.exit(1);
});
