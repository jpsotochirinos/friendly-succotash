import { Worker, Job } from 'bullmq';
import { MikroORM } from '@mikro-orm/postgresql';
import { UserSinoeCredentials } from '@tracker/db';
import { decryptSinoeCredentials, parseDataEncryptionKey } from '@tracker/shared';
import { getRedisConnection } from '../config/redis';
import { scrapingQueue } from '../queues/scraping.queue';
import { SourceAScraper } from '../scrapers/source-a.scraper';
import { SourceCScraper } from '../scrapers/source-c.scraper';
import { SinoeScraper } from '../scrapers/sinoe.scraper';
import type { ScrapeResult } from '../scrapers/base-scraper';
import { SinoeCompositeRepository, createMinioClientForWorker } from '../scrapers/sinoe/repository/composite-repository';
import { buildLastScrapeSnapshot } from '../scrapers/sinoe/repository/json-snapshot-repository';
import { createNotificationEventWithRecipients } from '@tracker/db';
import { NOTIFICATION_TYPES, NOTIFICATION_RECIPIENT_ROLES } from '@tracker/shared';
import { sendPlainEmail } from '../utils/mailer';

type ScrapingJobData =
  | {
      dispatchSinoe?: false;
      sourceType: 'source_a' | 'source_c';
      config: {
        url?: string;
        trackableId?: string;
        organizationId?: string;
      };
    }
  | {
      dispatchSinoe?: false;
      sourceType: 'sinoe';
      config: {
        userId: string;
        organizationId: string;
      };
    }
  | {
      dispatchSinoe: true;
      sourceType: 'sinoe';
      config: Record<string, unknown>;
    };

export function createScrapingWorker(orm: MikroORM) {
  const scrapers = {
    source_a: new SourceAScraper(),
    source_c: new SourceCScraper(),
  };

  const worker = new Worker<ScrapingJobData>(
    'scraping',
    async (job: Job<ScrapingJobData>) => {
      const em = orm.em.fork();
      await job.updateProgress(5);

      if (job.name === 'dispatch-sinoe-scrapes' || job.data.dispatchSinoe === true) {
        const rows = await em.find(
          UserSinoeCredentials,
          {},
          { filters: false, populate: ['user', 'organization'] as any },
        );
        let dispatched = 0;
        for (const row of rows) {
          await scrapingQueue.add(
            'scrape-sinoe-user',
            {
              sourceType: 'sinoe' as const,
              config: {
                userId: row.user.id,
                organizationId: row.organization.id,
              },
            },
            { removeOnComplete: { count: 200 } },
          );
          dispatched++;
        }
        await job.updateProgress(100);
        return {
          sourceType: 'sinoe_dispatch' as const,
          dispatched,
          success: true,
          errors: [] as string[],
        };
      }

      const { sourceType, config } = job.data as ScrapingJobData;
      await job.updateProgress(10);

      if (sourceType === 'sinoe') {
        const result = await runSinoeJob(em, config as { userId: string; organizationId: string });
        await job.updateProgress(100);
        return {
          sourceType: 'sinoe' as const,
          itemsFound: result.data.length,
          success: result.success,
          errors: result.errors,
        };
      }

      const scraper = scrapers[sourceType];
      const result: ScrapeResult = await scraper.scrape(config);

      await job.updateProgress(50);

      if (!result.success) {
        console.error(`Scraping ${sourceType} failed:`, result.errors);
      }

      for (const item of result.data) {
        const externalRef = item.externalRef as string;
        if (!externalRef) continue;

        const existing = (await em.findOne(
          'ExternalSource',
          {
            externalRef,
            sourceType,
          },
          { filters: false },
        )) as any;

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
            await createWorkflowItemFromScrape(em, item, config, 'source_a');
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

  worker.on('completed', (job, result: any) => {
    const n = result?.itemsFound ?? result?.dispatched ?? 0;
    const st = result?.sourceType;
    console.log(`Scraping ${st} completed: ${n} items`);
    if (st === 'sinoe') {
      if (result?.errors?.length) {
        console.warn('[SINOE] job result errors:', result.errors);
      }
      if (n === 0 && result?.success) {
        console.warn(
          '[SINOE] 0 items with success=true — revisa logs [SINOE] arriba (post-login URL, inbox links). Activa SINOE_DEBUG=true para detalle por selector/fila.',
        );
      }
    }
  });

  worker.on('failed', (job, err) => {
    console.error(`Scraping ${job?.data?.sourceType} failed:`, err.message);
  });

  return worker;
}

async function runSinoeJob(
  em: any,
  config: { userId: string; organizationId: string },
): Promise<ScrapeResult> {
  const row = await em.findOne(
    UserSinoeCredentials,
    { user: config.userId, organization: config.organizationId },
    { filters: false },
  );
  if (!row) {
    return {
      success: false,
      data: [],
      errors: ['SINOE credentials not found for user'],
      scrapedAt: new Date(),
    };
  }

  let key: Buffer;
  try {
    key = parseDataEncryptionKey(process.env.SINOE_CREDENTIALS_KEY);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid key';
    row.lastScrapeAt = new Date();
    const hint =
      msg === 'Encryption key is not configured'
        ? `${msg}. Add SINOE_CREDENTIALS_KEY to the repo root .env (same 64-char hex / base64 as the API) and restart the worker. If you run the worker only from apps/worker, ensure .env is loaded (worker now loads ../../../.env automatically).`
        : `Decryption key: ${msg}`;
    row.lastScrapeError = hint;
    await em.flush();
    return {
      success: false,
      data: [],
      errors: [hint],
      scrapedAt: new Date(),
    };
  }

  let creds: { username: string; password: string };
  try {
    creds = decryptSinoeCredentials(
      {
        ciphertext: row.ciphertext,
        iv: row.iv,
        authTag: row.authTag,
        keyVersion: row.keyVersion,
      },
      key,
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Decrypt failed';
    row.lastScrapeAt = new Date();
    row.lastScrapeError = msg;
    await em.flush();
    return {
      success: false,
      data: [],
      errors: [msg],
      scrapedAt: new Date(),
    };
  }

  const scraper = new SinoeScraper();
  const result = await scraper.scrape({
    username: creds.username,
    password: creds.password,
    baseUrl: process.env.SINOE_BASE_URL,
  });

  let returnResult: ScrapeResult = result;

  row.lastScrapeAt = new Date();
  row.lastScrapeError = result.success ? null : result.errors.join('; ') || 'Unknown error';

  if (result.success) {
    try {
      if (result.data.length > 0) {
        const { client, bucket } = await createMinioClientForWorker();
        const composite = new SinoeCompositeRepository(client, bucket);
        const stats = await composite.persistScrapeResult(em, row, result, {
          userId: config.userId,
          organizationId: config.organizationId,
        });
        returnResult = {
          ...result,
          meta: {
            ...result.meta,
            newCount: stats.newCount,
            totalCount: stats.totalCount,
            byStatus: stats.byStatus,
          },
        };
      } else {
        row.lastScrapeSnapshot = buildLastScrapeSnapshot(result, {
          newCount: 0,
          totalCount: 0,
          byStatus: {},
        }) as any;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      row.lastScrapeError = `Persist SINOE: ${msg}`;
      row.lastScrapeSnapshot = {
        scrapedAt: result.scrapedAt.toISOString(),
        count: result.data.length,
        errors: [...result.errors, row.lastScrapeError],
      } as any;
      returnResult = {
        ...result,
        success: false,
        errors: [...result.errors, row.lastScrapeError],
      };
    }
  } else {
    row.lastScrapeSnapshot = {
      scrapedAt: result.scrapedAt.toISOString(),
      count: 0,
      errors: result.errors,
    } as any;
  }

  await em.flush();

  return returnResult;
}

async function createWorkflowItemFromScrape(
  em: any,
  scrapedData: Record<string, unknown>,
  config: { trackableId?: string; organizationId?: string },
  sourceType: 'source_a' | 'source_c',
) {
  if (!config.trackableId || !config.organizationId) return;

  const wi = em.create('WorkflowItem', {
    trackable: config.trackableId,
    organization: config.organizationId,
    title: (scrapedData.title as string) || `Item from ${sourceType}`,
    description: JSON.stringify(scrapedData),
    kind: 'Diligencia',
    actionType: 'external_check',
    status: 'pending',
    depth: 2,
    sortOrder: 0,
    metadata: { source: sourceType, scrapedData },
  }) as { id: string };

  const trackable = (await em.findOne('Trackable', config.trackableId, {
    populate: ['assignedTo'],
    filters: false,
  })) as { assignedTo?: { id: string }; title?: string } | null;

  const recipients: { userId: string; role: string }[] = [];
  const owner = trackable?.assignedTo;
  if (owner?.id) {
    recipients.push({ userId: owner.id, role: NOTIFICATION_RECIPIENT_ROLES.OWNER });
  }

  if (!recipients.length) return;

  const sourceLabel = sourceType === 'source_a' ? 'scrape:source_a' : 'scrape:source_c';
  const result = await createNotificationEventWithRecipients(em, {
    organizationId: config.organizationId,
    trackableId: config.trackableId,
    type: NOTIFICATION_TYPES.WORKFLOW_ITEM_FROM_EXTERNAL,
    title: `Nueva actividad: ${(scrapedData.title as string) || 'Scraping'}`,
    message: trackable?.title
      ? `Expediente: ${trackable.title}. Origen ${sourceType}.`
      : `Origen ${sourceType}.`,
    data: {
      severity: 'info',
      source: sourceLabel,
      scrapeSource: sourceType,
      workflowItemId: wi.id,
    },
    sourceEntityType: 'workflow_item',
    sourceEntityId: wi.id,
    recipients,
  });

  if (!result.created) return;

  const users = (await em.find(
    'User',
    { id: { $in: recipients.map((r) => r.userId) }, organization: config.organizationId } as any,
    { fields: ['id', 'email'] as any, filters: false },
  )) as { id: string; email: string }[];
  for (const u of users) {
    try {
      await sendPlainEmail({
        to: u.email,
        subject: `Nueva actividad — ${(scrapedData.title as string) || sourceType}`,
        html: `<p>Se creó una diligencia desde ${sourceType}.</p>`,
      });
      await em.getConnection().execute(
        `UPDATE notification_recipients SET email_sent_at = now()
         WHERE notification_event_id = ? AND user_id = ?`,
        [result.event.id, u.id],
      );
    } catch {
      /* ignore */
    }
  }
}
