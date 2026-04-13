import { BaseScraper, ScrapeResult } from './base-scraper';

export class SourceAScraper extends BaseScraper {
  async scrape(config: Record<string, unknown>): Promise<ScrapeResult> {
    const url = config.url as string || process.env.SOURCE_A_URL;
    if (!url) {
      return { success: false, data: [], errors: ['SOURCE_A_URL not configured'], scrapedAt: new Date() };
    }

    const errors: string[] = [];
    const data: Record<string, unknown>[] = [];

    try {
      await this.init();
      const page = await this.newPage();

      await this.withRetry(async () => {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      });

      await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {
        errors.push('Table not found on page');
      });

      const rows = await page.$$eval('table tbody tr', (trs) =>
        trs.map((tr) => {
          const cells = tr.querySelectorAll('td');
          return {
            externalRef: cells[0]?.textContent?.trim() || '',
            title: cells[1]?.textContent?.trim() || '',
            status: cells[2]?.textContent?.trim() || '',
            date: cells[3]?.textContent?.trim() || '',
            details: cells[4]?.textContent?.trim() || '',
          };
        }),
      );

      data.push(...rows.filter((r) => r.externalRef));

      await page.close();
      await this.cleanup();

      return {
        success: errors.length === 0,
        data,
        errors,
        scrapedAt: new Date(),
      };
    } catch (error: any) {
      await this.cleanup();
      return {
        success: false,
        data,
        errors: [...errors, error.message],
        scrapedAt: new Date(),
      };
    }
  }
}
