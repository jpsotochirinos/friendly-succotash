import type { ScrapeResult } from '../../base-scraper';

/**
 * Construye snapshot JSON sin buffers (para `user_sinoe_credentials.last_scrape_snapshot`).
 */
export function buildLastScrapeSnapshot(
  result: ScrapeResult,
  stats: { newCount: number; totalCount: number; byStatus: Record<string, number> },
): Record<string, unknown> {
  return {
    scrapedAt: result.scrapedAt.toISOString(),
    count: stats.totalCount,
    newCount: stats.newCount,
    byStatus: stats.byStatus,
    errors: result.errors,
    dateRange: result.meta?.dateRange,
  };
}
