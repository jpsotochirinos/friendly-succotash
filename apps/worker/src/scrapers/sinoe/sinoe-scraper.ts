import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { Page } from 'playwright';
import { chromium } from 'playwright';
import type { SinoeAnexoDownloaded, SinoeScrapeRow } from '@tracker/shared';
import { BaseScraper, type ScrapeResult } from '../base-scraper';
import { downloadWithSession, extensionFromMime } from './attachments/attachment-downloader';
import {
  casillaRowLocator,
  dismissPostLoginBlockingDialogs,
  downloadAnexosForCasillaRow,
  filterCasillaRowsByDateRange,
  maybeApplyCasillaDateFilter,
  navigateToCasillasElectronicas,
  parseCasillaTableRows,
} from './pages/casilla-inbox.page';
import { listNotificationLinks } from './pages/inbox.page';
import { performLogin } from './pages/login.page';
import { parseNotificationDetail } from './pages/notification-detail.page';
import {
  flushSinoeTimings,
  isSinoeVerboseLog,
  safeUrlForLog,
  setSinoeDebugEventsLogPath,
  setSinoeTimingsPath,
  sinoeLogInfo,
  sinoeLogWarn,
  sinoeTime,
} from './sinoe-logger';

/** Opciones solo para el runner de depuración local (`sinoe:debug`). Producción usa `new SinoeScraper()` sin args. */
export interface SinoeScraperDebugOpts {
  outDir?: string;
  /** Playwright launch slowMo (ms) */
  slowMo?: number;
  /** Si `outDir` está definido, arranca trace por defecto; pon `false` para desactivar. */
  enableTrace?: boolean;
  /** Antes de cerrar la página, abre Playwright Inspector si hay error dentro del scrape. */
  pauseOnError?: boolean;
}

export class SinoeScraper extends BaseScraper {
  private readonly debugOpts?: SinoeScraperDebugOpts;
  private traceStarted = false;
  private stepShotSeq = 0;

  constructor(debugOpts?: SinoeScraperDebugOpts) {
    super();
    this.debugOpts = debugOpts;
  }

  override async init(): Promise<void> {
    const headless = process.env.SINOE_HEADLESS !== 'false';
    const slowMo = this.debugOpts?.slowMo ?? 0;
    const outDir = this.debugOpts?.outDir;
    if (outDir && !existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    if (outDir) {
      setSinoeDebugEventsLogPath(join(outDir, 'events.log'));
      setSinoeTimingsPath(join(outDir, 'timings.json'));
    }

    await sinoeTime('scraper.init', async () => {
      this.browser = await chromium.launch({
        headless,
        slowMo,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.context = await this.browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      });

      const trace =
        Boolean(outDir) && (this.debugOpts?.enableTrace === undefined || this.debugOpts.enableTrace === true);
      if (trace && this.context) {
        await this.context.tracing.start({ screenshots: true, snapshots: true, sources: true });
        this.traceStarted = true;
      }
    });
  }

  override async cleanup(): Promise<void> {
    try {
      if (this.context && this.traceStarted && this.debugOpts?.outDir) {
        const tracePath = join(this.debugOpts.outDir, 'trace.zip');
        await this.context.tracing.stop({ path: tracePath }).catch(() => undefined);
        this.traceStarted = false;
      }
    } finally {
      flushSinoeTimings();
      setSinoeTimingsPath(null);
      setSinoeDebugEventsLogPath(null);
      await super.cleanup();
    }
  }

  private appendEventLine(line: string): void {
    const dir = this.debugOpts?.outDir;
    if (!dir) return;
    try {
      appendFileSync(join(dir, 'events.log'), `${new Date().toISOString()} ${line}\n`);
    } catch {
      /* ignore */
    }
  }

  private attachPageDebugListeners(page: Page): void {
    if (!this.debugOpts?.outDir) return;
    page.on('console', (msg) => {
      const text = `[console.${msg.type()}] ${msg.text()}`;
      this.appendEventLine(text);
      if (process.env.SINOE_DEBUG === 'true') {
        console.log(`[SINOE][page] ${text}`);
      }
    });
    page.on('pageerror', (err) => {
      const text = `[pageerror] ${err.message}`;
      this.appendEventLine(text);
      console.warn(`[SINOE][page] ${text}`);
    });
  }

  private async debugScreenshot(page: Page, label: string): Promise<void> {
    const dir = this.debugOpts?.outDir;
    if (!dir) return;
    this.stepShotSeq += 1;
    const safe = label.replace(/[^a-z0-9_-]/gi, '_').slice(0, 80);
    const path = join(dir, `step-${String(this.stepShotSeq).padStart(2, '0')}-${safe}.png`);
    try {
      await page.screenshot({ path, fullPage: true });
    } catch {
      /* ignore */
    }
  }

  private async collectCasillaNavDiagnostics(page: Page): Promise<{
    url: string;
    frames: { name: string; url: string }[];
    commandLinks: { id: string; text: string; rel: string | null; href: string | null; frameUrl: string }[];
    tilesText: string[];
    hasPrimeFaces: boolean;
  }> {
    const framesMeta = page.frames().map((f) => ({ name: f.name() || '', url: f.url() }));
    const commandLinks: {
      id: string;
      text: string;
      rel: string | null;
      href: string | null;
      frameUrl: string;
    }[] = [];
    const tilesSet = new Set<string>();
    for (const f of page.frames()) {
      const frameUrl = f.url();
      try {
        const links = await f.evaluate(() => {
          const els = Array.from(document.querySelectorAll('a.ui-commandlink'));
          return els.map((a) => ({
            id: a.id || '',
            text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200),
            rel: a.getAttribute('rel'),
            href: a.getAttribute('href'),
          }));
        });
        for (const l of links) commandLinks.push({ ...l, frameUrl });
      } catch {
        /* cross-origin or detached */
      }
      try {
        const tiles = await f.evaluate(() =>
          Array.from(document.querySelectorAll('span.txtredbtn')).map((s) => (s.textContent || '').trim()),
        );
        for (const t of tiles) if (t) tilesSet.add(t);
      } catch {
        /* ignore */
      }
    }
    const hasPrimeFaces = await page
      .evaluate(() => typeof (window as unknown as { PrimeFaces?: unknown }).PrimeFaces !== 'undefined')
      .catch(() => false);
    return {
      url: page.url(),
      frames: framesMeta,
      commandLinks,
      tilesText: [...tilesSet],
      hasPrimeFaces,
    };
  }

  /** Solo con `debugOpts.outDir`: JSON + captura para afinar selectores si falla la casilla. */
  private async dumpCasillaNavDiagnostics(page: Page): Promise<void> {
    const dir = this.debugOpts?.outDir;
    if (!dir) return;
    try {
      const diag = page.isClosed() ? { error: 'page closed' } : await this.collectCasillaNavDiagnostics(page);
      writeFileSync(join(dir, 'casilla-nav-diag.json'), JSON.stringify(diag, null, 2), 'utf8');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      writeFileSync(join(dir, 'casilla-nav-diag.json'), JSON.stringify({ error: msg }, null, 2), 'utf8');
    }
    await this.debugScreenshot(page, 'casilla-nav-failed');
  }

  async scrape(config: Record<string, unknown>): Promise<ScrapeResult> {
    const baseUrl =
      (config.baseUrl as string) ||
      process.env.SINOE_BASE_URL ||
      'https://casillas.pj.gob.pe/sinoe/login.xhtml';
    const username = config.username as string;
    const password = config.password as string;
    const rangeDays = Number(process.env.SINOE_SCRAPE_DATE_RANGE_DAYS) || 7;
    const timeoutMs = Number(process.env.SINOE_SCRAPE_TIMEOUT_MS) || 180_000;

    if (!username || !password) {
      sinoeLogWarn('scrape: aborted — username/password missing in config');
      return {
        success: false,
        data: [],
        errors: ['SINOE: username/password missing'],
        scrapedAt: new Date(),
      };
    }

    sinoeLogInfo('scrape: starting', {
      baseUrl: safeUrlForLog(baseUrl),
      rangeDays,
      timeoutMs,
      headless: process.env.SINOE_HEADLESS !== 'false',
      verbose: isSinoeVerboseLog(),
    });

    const run = async (): Promise<ScrapeResult> => {
      this.stepShotSeq = 0;
      await this.init();
      const page = await this.newPage();
      this.attachPageDebugListeners(page);
      const from = new Date();
      from.setDate(from.getDate() - rangeDays);
      const to = new Date();

      try {
        return await sinoeTime('scrape.total', async () => {
          try {
            await sinoeTime('scraper.login', async () => {
              await this.withRetry(async () => {
                await performLogin(page, { username, password }, baseUrl);
              });
            });
          } catch (loginErr: unknown) {
            await this.debugScreenshot(page, 'login-failed');
            throw loginErr;
          }

          sinoeLogInfo('scrape: after login', {
            path: safeUrlForLog(page.url()),
          });
          await this.debugScreenshot(page, 'after-login');
          await sinoeTime('scraper.dismissPostLogin', () => dismissPostLoginBlockingDialogs(page));

          const data: Record<string, unknown>[] = [];
          const byStatus: Record<string, number> = {};

          const maxCasilla = Number(process.env.SINOE_MAX_CASILLA_ROWS) || 100;
          let casillaOk = false;
          await this.debugScreenshot(page, 'before-casilla-click');
          try {
            await sinoeTime('scraper.navigateCasilla', async () => {
              await navigateToCasillasElectronicas(page);
            });
            casillaOk = true;
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            await this.dumpCasillaNavDiagnostics(page);
            sinoeLogWarn('scrape: casilla navigation failed, using legacy inbox links', { error: msg });
          }

          if (casillaOk) {
            await this.debugScreenshot(page, 'casilla-table');
            await sinoeTime('scraper.maybeCasillaDateFilter', () =>
              maybeApplyCasillaDateFilter(page, rangeDays),
            );
            const rawCasilla = await sinoeTime('scraper.parseCasillaTable', () => parseCasillaTableRows(page), (rows) => ({
              count: rows.length,
            }));
            const casillaRows = filterCasillaRowsByDateRange(rawCasilla, rangeDays);
            sinoeLogInfo('scrape: casilla rows (after date filter)', {
              count: casillaRows.length,
              max: maxCasilla,
            });
            await this.debugScreenshot(page, 'after-casilla-table');

            const casillaBatch = casillaRows.slice(0, maxCasilla);
            let idx = 0;
            for (const cr of casillaBatch) {
              idx += 1;
              const rowLoc = casillaRowLocator(page, cr.rowIndex);
              if (isSinoeVerboseLog()) {
                sinoeLogInfo(`scrape: casilla row ${idx}/${casillaBatch.length}`, {
                  nroNotificacion: cr.nroNotificacion,
                });
              }
              const anexos = await sinoeTime(
                `scraper.downloadAnexos.${cr.nroNotificacion}`,
                () => downloadAnexosForCasillaRow(page, rowLoc, cr.nroNotificacion),
                (a) => ({
                  nroNotificacion: cr.nroNotificacion,
                  anexos: a.length,
                  bytes: a.reduce((sum, x) => sum + (x.fileBuffer?.length ?? 0), 0),
                }),
              );
              const estado = cr.estadoRevision;
              byStatus[estado] = (byStatus[estado] || 0) + 1;

              const row: SinoeScrapeRow = {
                externalRef: `sinoe:${cr.nroNotificacion}`,
                nroNotificacion: cr.nroNotificacion,
                nroExpediente: cr.nroExpediente,
                sumilla: cr.sumilla,
                organoJurisdiccional: cr.organoJurisdiccional,
                fecha: cr.fecha,
                estadoRevision: cr.estadoRevision,
                carpeta: '—',
                anexos,
              };
              data.push(row as unknown as Record<string, unknown>);
              await this.debugScreenshot(page, `casilla-row-${idx}-${cr.nroNotificacion.replace(/[^0-9-]/g, '')}`);
            }
          } else {
            const links = await sinoeTime('scraper.legacyInboxLinks', () =>
              listNotificationLinks(page, rangeDays),
            );
            sinoeLogInfo('scrape: inbox link count (legacy)', { count: links.length });
            await this.debugScreenshot(page, 'after-inbox');

            let idx = 0;
            for (const link of links) {
              if (!link.detailHref) continue;
              const absolute = new URL(link.detailHref, page.url()).href;
              idx += 1;
              if (isSinoeVerboseLog()) {
                sinoeLogInfo(`scrape: detail ${idx}/${links.length}`, { path: safeUrlForLog(absolute) });
              }
              await this.withRetry(async () => {
                await page.goto(absolute, { waitUntil: 'domcontentloaded', timeout: 60_000 });
              });

              const detail = await parseNotificationDetail(page);
              await this.debugScreenshot(page, `detail-${idx}-nro-${detail.nroNotificacion.slice(0, 40)}`);
              const anexos: SinoeAnexoDownloaded[] = [];

              for (const ax of detail.anexos) {
                const { downloadHref, ...meta } = ax;
                const entry: SinoeAnexoDownloaded = { ...meta };
                if (downloadHref) {
                  try {
                    const { buffer, contentType } = await downloadWithSession(page, downloadHref);
                    entry.fileBuffer = buffer;
                    const ext = extensionFromMime(contentType, 'pdf');
                    entry.suggestedFilename = `anexo-${detail.nroNotificacion}-${meta.identificacionAnexo.slice(0, 40)}.${ext}`;
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : String(e);
                    console.warn(`SINOE anexo download skipped: ${msg}`);
                  }
                }
                anexos.push(entry);
              }

              const estado = detail.estadoRevision;
              byStatus[estado] = (byStatus[estado] || 0) + 1;

              const row: SinoeScrapeRow = {
                externalRef: `sinoe:${detail.nroNotificacion}`,
                nroNotificacion: detail.nroNotificacion,
                nroExpediente: detail.nroExpediente,
                sumilla: detail.sumilla,
                organoJurisdiccional: detail.organoJurisdiccional,
                fecha: detail.fecha,
                estadoRevision: detail.estadoRevision,
                carpeta: detail.carpeta,
                anexos,
              };
              data.push(row as unknown as Record<string, unknown>);
            }
          }

          sinoeLogInfo('scrape: finished OK', {
            rowsParsed: data.length,
            byStatus,
            dateRange: { from: from.toISOString(), to: to.toISOString() },
          });

          return {
            success: true,
            data,
            errors: [],
            scrapedAt: new Date(),
            meta: {
              dateRange: { from: from.toISOString(), to: to.toISOString() },
              byStatus,
              totalCount: data.length,
              newCount: data.length,
            },
          };
        });
      } catch (runErr: unknown) {
        if (this.debugOpts?.pauseOnError && !page.isClosed()) {
          sinoeLogWarn('scrape: pause for inspector (pauseOnError)', {});
          await page.pause().catch(() => undefined);
        }
        throw runErr;
      } finally {
        await page.close().catch(() => undefined);
        await this.cleanup();
      }
    };

    try {
      return await Promise.race([
        run(),
        new Promise<ScrapeResult>((_, reject) =>
          setTimeout(() => reject(new Error('SINOE_SCRAPE_TIMEOUT')), timeoutMs),
        ),
      ]);
    } catch (error: unknown) {
      await this.cleanup();
      const msg = error instanceof Error ? error.message : String(error);
      sinoeLogWarn('scrape: failed', { error: msg });
      return {
        success: false,
        data: [],
        errors: [msg],
        scrapedAt: new Date(),
      };
    }
  }
}
