import { scrapingQueue } from '../queues/scraping.queue';
import { deadlineNotificationsQueue } from '../queues/deadline-notifications.queue';
import { trashPurgeQueue } from '../queues/trash-purge.queue';
import { whatsappBriefingQueue } from '../queues/whatsapp-briefing.queue';
import { whatsappActivityCleanupQueue } from '../queues/whatsapp-activity-cleanup.queue';
import { feedIngestQueue } from '../queues/feed-ingest.queue';

function envFlagDisabled(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === '0' || v === 'false' || v === 'no' || v === 'off';
}

export async function setupCronJobs() {
  const defaultCron = process.env.SCRAPING_DEFAULT_CRON || '0 */6 * * *';
  const sinoeCron = process.env.SINOE_SCRAPE_CRON || '0 */4 * * *';
  const sinoeCronEnabled = !envFlagDisabled('SINOE_SCRAPE_ENABLED');
  const deadlineCron = process.env.DEADLINE_NOTIFICATIONS_CRON || '15 7 * * *';
  const trashPurgeCron = process.env.TRASH_PURGE_CRON || '45 3 * * *';
  const whatsappBriefingCron = process.env.WHATSAPP_BRIEFING_CRON || '0 * * * *';
  const whatsappCleanupCron = process.env.WHATSAPP_ACTIVITY_CLEANUP_CRON || '5 2 * * *';
  const feedIngestCron = process.env.FEED_INGEST_CRON || '0 * * * *';
  const feedIngestEnabled = !envFlagDisabled('FEED_INGEST_ENABLED');

  await deadlineNotificationsQueue.upsertJobScheduler(
    'deadline-notifications-daily',
    { pattern: deadlineCron },
    {
      name: 'run-deadline-notifications',
      data: {},
    },
  );

  console.log(`Deadline notifications cron: ${deadlineCron}`);

  await trashPurgeQueue.upsertJobScheduler(
    'trash-purge-daily',
    { pattern: trashPurgeCron },
    {
      name: 'purge-expired-trash',
      data: {},
    },
  );

  console.log(`Trash purge cron: ${trashPurgeCron}`);

  await whatsappBriefingQueue.upsertJobScheduler(
    'whatsapp-briefing-hourly',
    { pattern: whatsappBriefingCron },
    {
      name: 'run-whatsapp-briefing',
      data: {},
    },
  );
  console.log(`WhatsApp briefing cron: ${whatsappBriefingCron}`);

  await whatsappActivityCleanupQueue.upsertJobScheduler(
    'whatsapp-activity-cleanup-daily',
    { pattern: whatsappCleanupCron },
    {
      name: 'run-whatsapp-activity-cleanup',
      data: {},
    },
  );
  console.log(`WhatsApp activity cleanup cron: ${whatsappCleanupCron}`);

  if (feedIngestEnabled) {
    await feedIngestQueue.upsertJobScheduler(
      'feed-ingest-hourly',
      { pattern: feedIngestCron },
      {
        name: 'ingest-all-feed-sources',
        data: {},
      },
    );
    console.log(`Feed ingest cron: ${feedIngestCron}`);
  } else {
    await feedIngestQueue.removeJobScheduler('feed-ingest-hourly').catch(() => undefined);
    console.log('Feed ingest cron: disabled (FEED_INGEST_ENABLED)');
  }

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

  if (sinoeCronEnabled) {
    await scrapingQueue.upsertJobScheduler(
      'sinoe-dispatch-cron',
      { pattern: sinoeCron },
      {
        name: 'dispatch-sinoe-scrapes',
        data: {
          dispatchSinoe: true as const,
          sourceType: 'sinoe' as const,
          config: {},
        },
      },
    );
  } else {
    await scrapingQueue.removeJobScheduler('sinoe-dispatch-cron').catch(() => undefined);
  }

  console.log(
    `Cron jobs scheduled: ${defaultCron}; SINOE dispatch: ${sinoeCronEnabled ? sinoeCron : 'disabled (SINOE_SCRAPE_ENABLED)'}`,
  );
}
