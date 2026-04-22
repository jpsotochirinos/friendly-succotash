/**
 * Encola un job de briefing WhatsApp (mismo que el cron).
 * Uso: pnpm --filter @tracker/worker run whatsapp:briefing:once -- --force
 * --force ignora la hora del cron por tenant (solo para pruebas).
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
  const force = process.argv.includes('--force');
  const { whatsappBriefingQueue } = await import('../queues/whatsapp-briefing.queue');
  await whatsappBriefingQueue.add(
    'run-whatsapp-briefing',
    { force },
    { jobId: `manual-briefing-${Date.now()}` },
  );
  console.log('[whatsapp-briefing] Job encolado. force=', force);
  await whatsappBriefingQueue.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
