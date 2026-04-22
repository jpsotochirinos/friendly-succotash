import { Browser, BrowserContext, Page, chromium } from 'playwright';

export interface ScrapeResult {
  success: boolean;
  data: Record<string, unknown>[];
  errors: string[];
  scrapedAt: Date;
  /** SINOE: rango de fechas aplicado, conteos, etc. (sin buffers) */
  meta?: {
    dateRange?: { from: string; to: string };
    byStatus?: Record<string, number>;
    newCount?: number;
    totalCount?: number;
  };
}

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });
  }

  async cleanup(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
    this.context = null;
    this.browser = null;
  }

  protected async newPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser not initialized. Call init() first.');
    }
    return this.context.newPage();
  }

  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    delayMs = 2000,
  ): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        console.warn(`Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delayMs * attempt));
        }
      }
    }
    throw lastError;
  }

  abstract scrape(config: Record<string, unknown>): Promise<ScrapeResult>;
}
