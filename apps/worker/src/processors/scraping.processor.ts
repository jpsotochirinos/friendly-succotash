import { Worker, Job } from 'bullmq';
import { MikroORM } from '@mikro-orm/postgresql';
import { getRedisConnection } from '../config/redis';
import { SourceAScraper } from '../scrapers/source-a.scraper';
import { SourceCScraper } from '../scrapers/source-c.scraper';
import type { ScrapeResult } from '../scrapers/base-scraper';

interface ScrapingJobData {
  sourceType: 'source_a' | 'source_c';
  config: {
    url?: string;
    trackableId?: string;
    organizationId?: string;
  };
}

export function createScrapingWorker(orm: MikroORM) {
  const scrapers = {
    source_a: new SourceAScraper(),
    source_c: new SourceCScraper(),
  };

  const worker = new Worker<ScrapingJobData>(
    'scraping',
    async (job: Job<ScrapingJobData>) => {
      const { sourceType, config } = job.data;
      const em = orm.em.fork();

      await job.updateProgress(10);

      const scraper = scrapers[sourceType];
      const result: ScrapeResult = await scraper.scrape(config);

      await job.updateProgress(50);

      if (!result.success) {
        console.error(`Scraping ${sourceType} failed:`, result.errors);
      }

      for (const item of result.data) {
        const externalRef = item.externalRef as string;
        if (!externalRef) continue;

        const existing = await em.findOne('ExternalSource', {
          externalRef,
          sourceType,
        }, { filters: false }) as any;

        if (existing) {
          existing.cachedData = item;
          existing.lastCheckedAt = new Date();
          existing.lastError = result.errors.length > 0 ? { errors: result.errors } : null;
        } else if (config.trackableId && config.organizationId) {
          em.create('ExternalSource', {
            trackable: config.trackableId,
            organization: config.organizationId,
            sourceType,
            externalRef,
            cachedData: item,
            lastCheckedAt: new Date(),
          });

          if (sourceType === 'source_a') {
            await createWorkflowItemFromScrape(em, item, config);
          }
        }
      }

      await em.flush();
      await job.updateProgress(100);

      return {
        sourceType,
        itemsFound: result.data.length,
        success: result.success,
        errors: result.errors,
      };
    },
    {
      connection: getRedisConnection(),
      concurrency: 1,
    },
  );

  worker.on('completed', (job, result) => {
    console.log(
      `Scraping ${result.sourceType} completed: ${result.itemsFound} items`,
    );
  });

  worker.on('failed', (job, err) => {
    console.error(`Scraping ${job?.data.sourceType} failed:`, err.message);
  });

  return worker;
}

async function createWorkflowItemFromScrape(
  em: any,
  scrapedData: Record<string, unknown>,
  config: { trackableId?: string; organizationId?: string },
) {
  if (!config.trackableId || !config.organizationId) return;

  em.create('WorkflowItem', {
    trackable: config.trackableId,
    organization: config.organizationId,
    title: (scrapedData.title as string) || 'Item from Source A',
    description: JSON.stringify(scrapedData),
    itemType: 'action',
    actionType: 'external_check',
    status: 'pending',
    depth: 2,
    sortOrder: 0,
    metadata: { source: 'source_a', scrapedData },
  });
}
