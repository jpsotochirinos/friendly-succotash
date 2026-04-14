import 'dotenv/config';
import { MikroORM } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { createEvaluationWorker } from './processors/evaluation.processor';
import { createScrapingWorker } from './processors/scraping.processor';
import { setupCronJobs } from './schedules/cron';

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

  await setupCronJobs();
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
