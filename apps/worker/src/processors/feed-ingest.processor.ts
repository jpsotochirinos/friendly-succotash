import { Worker, Job } from 'bullmq';
import Parser from 'rss-parser';
import { MikroORM } from '@mikro-orm/postgresql';
import { FeedItem, FeedSource } from '@tracker/db';
import { getRedisConnection } from '../config/redis';

function itemLink(item: {
  link?: string;
  guid?: string | { value?: string };
}): string | null {
  if (item.link && typeof item.link === 'string') return item.link.trim();
  const g = item.guid;
  if (typeof g === 'string' && g.trim()) return g.trim();
  if (g && typeof g === 'object' && typeof g.value === 'string' && g.value.trim()) return g.value.trim();
  return null;
}

export function createFeedIngestWorker(orm: MikroORM) {
  const worker = new Worker(
    'feed-ingest',
    async (job: Job<{ sourceId?: string }>) => {
      const em = orm.em.fork();
      const parser = new Parser({
        timeout: 25000,
        headers: { 'User-Agent': 'AlegaFeedIngest/1.0' },
      });

      const where = job.data?.sourceId
        ? ({ id: job.data.sourceId, active: true } as const)
        : ({ active: true } as const);

      const sources = await em.find(FeedSource, where);

      for (const src of sources) {
        try {
          const feed = await parser.parseURL(src.url);
          const slice = (feed.items ?? []).slice(0, 120);
          for (const raw of slice) {
            const link = itemLink(raw);
            if (!link || !raw.title) continue;
            const dup = await em.findOne(FeedItem, { url: link });
            if (dup) continue;
            const pub = raw.pubDate ? new Date(raw.pubDate) : new Date();
            const summary = (raw.contentSnippet || raw.summary || '').trim();
            const contentRaw = raw.content;
            const content =
              typeof contentRaw === 'string' && contentRaw.trim()
                ? contentRaw.slice(0, 50000)
                : undefined;
            em.create(
              FeedItem,
              {
                kind: src.kind,
                title: raw.title.slice(0, 2000),
                summary: summary ? summary.slice(0, 12000) : undefined,
                content,
                url: link.slice(0, 2048),
                sourceLabel: src.name,
                publishedAt: pub,
                feedSource: src,
              } as any,
            );
          }
          src.lastFetchedAt = new Date();
          src.lastError = undefined;
          await em.flush();
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          src.lastFetchedAt = new Date();
          src.lastError = msg.slice(0, 8000);
          await em.flush();
        }
      }

      return { sources: sources.length };
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('failed', (job, err) => {
    console.error('[feed-ingest] job failed', job?.id, err);
  });

  return worker;
}
