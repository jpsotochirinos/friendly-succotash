import { BaseScraper, ScrapeResult } from './base-scraper';

export class SourceCScraper extends BaseScraper {
  async scrape(config: Record<string, unknown>): Promise<ScrapeResult> {
    const url = config.url as string || process.env.SOURCE_C_URL;
    if (!url) {
      return { success: false, data: [], errors: ['SOURCE_C_URL not configured'], scrapedAt: new Date() };
    }

    const errors: string[] = [];
    const data: Record<string, unknown>[] = [];

    try {
      await this.init();
      const page = await this.newPage();

      await this.withRetry(async () => {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      });

      const notifications = await page.$$eval('.notification-item, .alert-item', (items) =>
        items.map((item) => ({
          externalRef: item.getAttribute('data-id') || '',
          title: item.querySelector('.title')?.textContent?.trim() || '',
          type: item.querySelector('.type')?.textContent?.trim() || '',
          date: item.querySelector('.date')?.textContent?.trim() || '',
          content: item.querySelector('.content')?.textContent?.trim() || '',
        })),
      );

      data.push(...notifications.filter((n) => n.externalRef));

      await page.close();
      await this.cleanup();

      return { success: errors.length === 0, data, errors, scrapedAt: new Date() };
    } catch (error: any) {
      await this.cleanup();
      return { success: false, data, errors: [...errors, error.message], scrapedAt: new Date() };
    }
  }
}
