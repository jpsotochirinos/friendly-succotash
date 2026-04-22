/**
 * Encola ingesta RSS del feed (mismo job que el cron).
 * Uso: pnpm --filter @tracker/worker run feed:ingest:once
 */
import { existsSync } from 'fs';
import { resolve } from 'path';
import { config as loadDotenv } from 'dotenv';

const monorepoRootEnv = resolve(__dirname, '../../../../.env');
const cwdEnv = resolve(process.cwd(), '.env');
if (existsSync(monorepoRootEnv)) {
  loadDotenv({ path: monorepoRootEnv });
} else if (existsSync(cwdEnv)) {
  loadDotenv({ path: cwdEnv });
} else {
  loadDotenv();
}

async function main() {
  const { feedIngestQueue } = await import('../queues/feed-ingest.queue');
  await feedIngestQueue.add(
    'ingest-all-feed-sources',
    {},
    { jobId: `manual-feed-ingest-${Date.now()}` },
  );
  console.log('[feed-ingest] Job encolado.');
  await feedIngestQueue.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
