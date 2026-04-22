import type { Page } from 'playwright';
import { isSinoeVerboseLog, safeUrlForLog, sinoeLogInfo, sinoeLogWarn } from '../sinoe-logger';

export interface InboxRowRef {
  /** Texto o id visible para parseo en detalle */
  label: string;
  /** Locator href relativo o absoluto */
  detailHref?: string;
}

async function countLoc(page: Page, selector: string): Promise<number> {
  try {
    return await page.locator(selector).count();
  } catch {
    return -1;
  }
}

/**
 * Si no hay enlaces, ayuda a ver si el DOM es bandeja vacía o selectores obsoletos.
 */
async function logInboxDiagnostics(page: Page): Promise<void> {
  const url = page.url();
  const title = await page.title().catch(() => '');
  const diagnostics: Record<string, unknown> = {
    path: safeUrlForLog(url),
    title: title.slice(0, 100),
    allAnchors: await countLoc(page, 'a[href]'),
    tableRows: await countLoc(page, 'table tbody tr'),
    datatableRows: await countLoc(page, '.ui-datatable-data tr, .ui-treetable tr'),
    primaryNotiLinks: await countLoc(
      page,
      'a[href*="notificacion" i], a[href*="Notificacion" i], table a[href*=".xhtml"]',
    ),
    facesLinks: await countLoc(page, 'a[href*=".faces"]'),
    sinoeXhtml: await countLoc(page, 'a[href*="/sinoe/" i][href*=".xhtml"]'),
  };
  sinoeLogWarn('inbox: 0 notification links — DOM snapshot (ajustar selectores si hace falta)', diagnostics);
}

/**
 * Lista notificaciones en bandeja dentro de `dateRange`.
 * Ajustar selectores a la tabla PrimeFaces real del portal.
 */
export async function listNotificationLinks(
  page: Page,
  dateRangeDays: number,
): Promise<InboxRowRef[]> {
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await page.waitForTimeout(800);

  const start = new Date();
  start.setDate(start.getDate() - dateRangeDays);

  sinoeLogInfo('inbox: start', {
    path: safeUrlForLog(page.url()),
    dateRangeDays,
    rangeFrom: start.toISOString().slice(0, 10),
  });

  // Intentar acotar por fecha si existen inputs (nombres típicos JSF)
  const fromInput = page.locator('input[type="date"], input[id*="fecha" i]').first();
  if (await fromInput.count()) {
    await fromInput.fill(start.toISOString().slice(0, 10)).catch(() => undefined);
    sinoeLogInfo('inbox: filled date filter');
  }

  const searchBtn = page.getByRole('button', { name: /buscar|consultar|filtrar/i }).first();
  if (await searchBtn.count()) {
    await searchBtn.click().catch(() => undefined);
    await page.waitForTimeout(1200);
    sinoeLogInfo('inbox: clicked search/filter');
  }

  const selectors = [
    'a[href*="notificacion" i], a[href*="Notificacion" i], table a[href*=".xhtml"]',
    'a[href*=".faces"][href*="noti" i]',
    'a[href*="/sinoe/" i][href*=".xhtml"]:not([href*="login" i])',
    '.ui-datatable a[href*=".xhtml"], .ui-datatable a[href*=".faces"]',
  ];

  const out: InboxRowRef[] = [];
  const seen = new Set<string>();

  for (let s = 0; s < selectors.length; s++) {
    const links = page.locator(selectors[s]);
    const count = await links.count();
    if (isSinoeVerboseLog()) {
      sinoeLogInfo(`inbox: selector[${s}] matches`, { selector: selectors[s], count });
    }
    for (let i = 0; i < Math.min(count, 100); i++) {
      const a = links.nth(i);
      const href = await a.getAttribute('href');
      const label = (await a.textContent())?.trim() || `row-${i}`;
      if (!href || href.startsWith('#') || href.toLowerCase().includes('javascript:')) continue;
      const abs = href.startsWith('http') ? href : new URL(href, page.url()).href;
      if (seen.has(abs)) continue;
      seen.add(abs);
      out.push({ label, detailHref: href });
    }
    if (out.length > 0) {
      sinoeLogInfo('inbox: links collected', {
        usedSelectorIndex: s,
        total: out.length,
        sampleLabels: out.slice(0, 3).map((r) => r.label.slice(0, 60)),
      });
      break;
    }
  }

  if (out.length === 0) {
    await logInboxDiagnostics(page);
  } else if (!isSinoeVerboseLog()) {
    sinoeLogInfo('inbox: links collected', { total: out.length });
  }

  return out;
}
