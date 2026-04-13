import { scrapingQueue } from '../queues/scraping.queue';

export async function setupCronJobs() {
  const defaultCron = process.env.SCRAPING_DEFAULT_CRON || '0 */6 * * *';

  await scrapingQueue.upsertJobScheduler(
    'source-a-cron',
    { pattern: defaultCron },
    {
      name: 'scrape-source_a',
      data: {
        sourceType: 'source_a' as const,
        config: {},
      },
    },
  );

  await scrapingQueue.upsertJobScheduler(
    'source-c-cron',
    { pattern: defaultCron },
    {
      name: 'scrape-source_c',
      data: {
        sourceType: 'source_c' as const,
        config: {},
      },
    },
  );

  console.log(`Cron jobs scheduled: ${defaultCron}`);
}
