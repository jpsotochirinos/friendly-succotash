import { readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Frame, Locator, Page } from 'playwright';
import type { SinoeAnexoDownloaded, SinoeEstadoRevision } from '@tracker/shared';
import JSZip from 'jszip';
import { isSinoeVerboseLog, safeUrlForLog, sinoeLogInfo, sinoeLogWarn, sinoeTime } from '../sinoe-logger';

const TABLE_TBODY = '[id="frmBusqueda:tblLista_data"]';

export const CASILLA_TILE_NOT_FOUND = 'CASILLA_TILE_NOT_FOUND';

function getCasillaNavTimeoutMs(): number {
  const n = Number(process.env.SINOE_CASILLA_NAV_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 45_000;
}

/**
 * Cierra diálogos PrimeFaces tras el login (sesión activa, comunicados, etc.).
 * Si siguen abiertos, el portal a veces no muestra o no hidrata el tile de Casillas.
 */
export async function dismissPostLoginBlockingDialogs(page: Page): Promise<void> {
  for (let round = 0; round < 10; round++) {
    const inDialog = page
      .locator('.ui-dialog:visible, [role="dialog"]:visible')
      .getByRole('button', { name: /^Aceptar$/i })
      .first();
    if (await inDialog.isVisible().catch(() => false)) {
      await inDialog.click().catch(() => undefined);
      sinoeLogInfo('casilla: dismissed post-login dialog (Aceptar)');
      await page.waitForTimeout(400);
      await page.locator('.ui-widget-overlay').first().waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
      continue;
    }
    const globalAceptar = page.getByRole('button', { name: /^Aceptar$/i }).first();
    if (await globalAceptar.isVisible().catch(() => false)) {
      await globalAceptar.click().catch(() => undefined);
      sinoeLogInfo('casilla: dismissed post-login overlay (Aceptar)');
      await page.waitForTimeout(400);
      continue;
    }
    break;
  }
}

function casillaTileCandidates(frame: Frame): Locator[] {
  return [
    frame
      .locator('a.ui-commandlink')
      .filter({ has: frame.locator('span.txtredbtn', { hasText: /Casillas\s*Electr/i }) })
      .first(),
    frame.locator('a[rel="popover"]').filter({ hasText: /Casillas/i }).first(),
    frame.locator('a:has(img[src*="logo-menu-sinoe"])').first(),
    frame.getByRole('link', { name: /Casillas\s*Electr/i }).first(),
  ];
}

/** Localiza el tile aunque el menú tarde en AJAX; prioriza visible, si no, caja con tamaño (click forzado). */
async function findCasillaTileForClick(frame: Frame): Promise<Locator | null> {
  for (const loc of casillaTileCandidates(frame)) {
    if ((await loc.count().catch(() => 0)) === 0) continue;
    try {
      await loc.first().waitFor({ state: 'attached', timeout: 2500 });
    } catch {
      continue;
    }
    const first = loc.first();
    await first.scrollIntoViewIfNeeded().catch(() => undefined);
    if (await first.isVisible().catch(() => false)) return first;
    const box = await first.boundingBox().catch(() => null);
    if (box && box.width >= 8 && box.height >= 8) return first;
  }
  return null;
}

async function clickCasillaTile(link: Locator): Promise<void> {
  await link.scrollIntoViewIfNeeded().catch(() => undefined);
  try {
    await link.click({ timeout: 20_000 });
  } catch {
    await link.click({ force: true, timeout: 20_000 });
  }
}

async function waitForCasillaTableAttached(page: Page, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const frame of page.frames()) {
      const t = frame.locator(TABLE_TBODY);
      const n = await t.count().catch(() => 0);
      if (n > 0) {
        await t.first().waitFor({ state: 'attached', timeout: 10_000 });
        return;
      }
    }
    await page.waitForTimeout(250);
  }
  throw new Error('CASILLA_TABLE_TIMEOUT: frmBusqueda:tblLista_data not found');
}
const DIALOG_ANEXOS = '[id="frmAnexos:dlgListaAnexos"]';
const BTN_DESCARGA_TODO = '[id="frmAnexos:btnDescargaTodo"]';

export interface CasillaTableRow {
  rowIndex: number;
  nroNotificacion: string;
  nroExpediente: string;
  sumilla: string;
  organoJurisdiccional: string;
  fecha: Date;
  estadoRevision: SinoeEstadoRevision;
}

function isZipMagic(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b;
}

export function parseCasillaDateTime(s: string): Date {
  const t = s.replace(/\s+/g, ' ').trim();
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return new Date();
  const [, d, mo, y, h, mi, sec] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(sec));
}

function rowWithinRange(fecha: Date, rangeDays: number): boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - rangeDays);
  cutoff.setHours(0, 0, 0, 0);
  return fecha.getTime() >= cutoff.getTime();
}

/**
 * Tras el login, entra a la bandeja desde el tile "Casillas Electrónicas" (PrimeFaces).
 * El id `frmNuevo:j_idt38` es inestable; se prueban varios selectores y todos los frames (iframes).
 * `SINOE_CASILLA_NAV_TIMEOUT_MS` acota el tiempo para encontrar el tile (default 45000).
 */
export async function navigateToCasillasElectronicas(page: Page): Promise<void> {
  const navMs = getCasillaNavTimeoutMs();
  const primeMs = Math.min(15_000, navMs);

  await page.waitForLoadState('domcontentloaded');
  await sinoeTime('casilla.nav.networkidle', async () => {
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  });

  await sinoeTime('casilla.nav.primefaces-ready', async () => {
    await page
      .waitForFunction(
        () => typeof (window as unknown as { PrimeFaces?: unknown }).PrimeFaces !== 'undefined',
        { timeout: primeMs },
      )
      .catch(() => undefined);
  });

  await sinoeTime('casilla.nav.frmNuevo-attached', async () => {
    await page
      .locator('form[id*="frmNuevo" i]')
      .first()
      .waitFor({ state: 'attached', timeout: Math.min(25_000, navMs) })
      .catch(() => undefined);
  });

  const deadline = Date.now() + navMs;
  let link: Locator | null = null;
  let rounds = 0;

  await sinoeTime(
    'casilla.nav.find-tile',
    async () => {
      while (Date.now() < deadline && !link) {
        rounds += 1;
        await dismissPostLoginBlockingDialogs(page);
        for (const frame of page.frames()) {
          link = await findCasillaTileForClick(frame);
          if (link) break;
        }
        if (!link) {
          await page.waitForTimeout(500);
        }
      }
    },
    () => ({ rounds }),
  );

  if (!link) {
    throw new Error(`${CASILLA_TILE_NOT_FOUND}: no visible Casillas Electrónicas tile`);
  }

  await sinoeTime('casilla.nav.wait-table', async () => {
    sinoeLogInfo('casilla: clicking Casillas Electrónicas', { path: safeUrlForLog(page.url()) });
    await clickCasillaTile(link!);

    await page.waitForTimeout(500);
    await page
      .locator('.ui-widget-overlay')
      .first()
      .waitFor({ state: 'hidden', timeout: 120_000 })
      .catch(() => undefined);

    await waitForCasillaTableAttached(page, 120_000);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
  });

  sinoeLogInfo('casilla: table visible', { path: safeUrlForLog(page.url()) });
}

/** Misma idea que inbox genérico: filtro por fecha si hay controles en frmBusqueda. */
export async function maybeApplyCasillaDateFilter(page: Page, rangeDays: number): Promise<void> {
  const start = new Date();
  start.setDate(start.getDate() - rangeDays);
  const fromInput = page.locator('form[id*="frmBusqueda" i] input[type="date"], input[id*="fecha" i]').first();
  if (await fromInput.count()) {
    await fromInput.fill(start.toISOString().slice(0, 10)).catch(() => undefined);
    sinoeLogInfo('casilla: filled date filter');
  }
  const searchBtn = page.getByRole('button', { name: /buscar|consultar|filtrar/i }).first();
  if (await searchBtn.count()) {
    await searchBtn.click().catch(() => undefined);
    await page.waitForTimeout(1500);
    sinoeLogInfo('casilla: clicked search/filter');
  }
}

/**
 * Filas de la tabla PrimeFaces `frmBusqueda:tblLista_data`.
 * Columnas: chk, icono leído, #, nro notificación, expediente, sumilla (textarea), órgano, fecha, acciones.
 */
export async function parseCasillaTableRows(page: Page): Promise<CasillaTableRow[]> {
  const tbody = page.locator(TABLE_TBODY);
  await tbody.waitFor({ state: 'attached', timeout: 15_000 });
  const rows = tbody.locator('tr[role="row"]');
  const n = await rows.count();
  const out: CasillaTableRow[] = [];

  for (let i = 0; i < n; i++) {
    const tr = rows.nth(i);
    const cells = tr.locator('td[role="gridcell"]');
    const c = await cells.count();
    if (c < 8) continue;

    const iconAlt = (await cells.nth(1).locator('img').getAttribute('alt').catch(() => '')) || '';
    const altLower = iconAlt.toLowerCase();
    const estadoRevision: SinoeEstadoRevision =
      /no\s*le|unread|pendiente|no leida/i.test(altLower) ? 'No Leído' : 'Leído';

    const nroNotificacion = (await cells.nth(3).innerText()).trim();
    const nroExpediente = (await cells.nth(4).innerText()).trim();
    let sumilla = '';
    const ta = cells.nth(5).locator('textarea');
    if (await ta.count()) {
      sumilla = (await ta.inputValue().catch(() => '')).trim();
    }
    if (!sumilla) {
      sumilla = (await cells.nth(5).innerText()).trim();
    }
    const organoJurisdiccional = (await cells.nth(6).innerText()).trim();
    const fechaStr = (await cells.nth(7).innerText()).trim();
    const fecha = parseCasillaDateTime(fechaStr);

    if (!nroNotificacion || !/^\d/.test(nroNotificacion)) continue;

    out.push({
      rowIndex: i,
      nroNotificacion,
      nroExpediente: nroExpediente || '—',
      sumilla: sumilla || '—',
      organoJurisdiccional: organoJurisdiccional || '—',
      fecha,
      estadoRevision,
    });
  }

  if (isSinoeVerboseLog()) {
    sinoeLogInfo('casilla: parsed rows', { count: out.length, sample: out.slice(0, 2).map((r) => r.nroNotificacion) });
  } else {
    sinoeLogInfo('casilla: parsed rows', { count: out.length });
  }

  return out;
}

export function filterCasillaRowsByDateRange(rows: CasillaTableRow[], rangeDays: number): CasillaTableRow[] {
  return rows.filter((r) => rowWithinRange(r.fecha, rangeDays));
}

async function closeAnexosModal(page: Page): Promise<void> {
  const dlg = page.locator(DIALOG_ANEXOS);
  const closeBtn = dlg.locator('.ui-dialog-titlebar-close').first();
  if (await closeBtn.count()) {
    await closeBtn.click().catch(() => undefined);
    await dlg.waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => undefined);
  }
  await page.waitForTimeout(300);
}

async function expandZipToAnexos(zipBuffer: Buffer, nroNotificacion: string): Promise<SinoeAnexoDownloaded[]> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const out: SinoeAnexoDownloaded[] = [];
  const entries = Object.entries(zip.files).filter(([, zf]) => !zf.dir);
  for (const [path, entry] of entries) {
    const name = path.split('/').pop() || path;
    if (!name || name.startsWith('.')) continue;
    const uint8 = await entry.async('uint8array');
    const buf = Buffer.from(uint8);
    const ext = (name.includes('.') ? name.split('.').pop() : 'bin') || 'bin';
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
    out.push({
      tipo: ext.toUpperCase(),
      identificacionAnexo: name.slice(0, 500),
      nroPaginas: '—',
      pesoArchivo: String(buf.length),
      fileBuffer: buf,
      suggestedFilename: `anexo-${nroNotificacion}-${safeName}`,
    });
  }
  return out;
}

/**
 * Abre "Ver anexos", pulsa "Descargar todo" y devuelve anexos (ZIP expandido o un solo archivo).
 */
export async function downloadAnexosForCasillaRow(
  page: Page,
  rowLocator: Locator,
  nroNotificacion: string,
): Promise<SinoeAnexoDownloaded[]> {
  const btn = rowLocator.locator('button[title="Ver anexos"]');
  if ((await btn.count()) === 0) {
    return [];
  }

  await sinoeTime(
    'casilla.download.open-modal',
    async () => {
      await btn.click();
      const dialog = page.locator(DIALOG_ANEXOS);
      await dialog.waitFor({ state: 'visible', timeout: 45_000 });
    },
    { nroNotificacion },
  );

  const downloadBtn = page.locator(BTN_DESCARGA_TODO);
  await sinoeTime(
    'casilla.download.btn-visible',
    async () => {
      await downloadBtn.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
    },
    { nroNotificacion },
  );

  if ((await downloadBtn.count()) === 0 || !(await downloadBtn.isVisible().catch(() => false))) {
    sinoeLogWarn('casilla: btnDescargaTodo not visible — skip anexos', { nroNotificacion });
    await sinoeTime('casilla.download.close-modal', () => closeAnexosModal(page), { nroNotificacion });
    return [];
  }

  let buf!: Buffer;
  try {
    let dlBytes = 0;
    let suggested = `sinoe-${nroNotificacion}.bin`;
    await sinoeTime(
      'casilla.download.zip-download',
      async () => {
        const downloadPromise = page.waitForEvent('download', { timeout: 180_000 });
        await downloadBtn.click();
        const download = await downloadPromise;
        suggested = download.suggestedFilename() || suggested;
        const tmpFile = join(tmpdir(), `sinoe-dl-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`);
        await download.saveAs(tmpFile);
        buf = readFileSync(tmpFile);
        dlBytes = buf.length;
        try {
          unlinkSync(tmpFile);
        } catch {
          /* ignore */
        }
      },
      () => ({ nroNotificacion, bytes: dlBytes }),
    );

    if (isZipMagic(buf)) {
      const expanded = await sinoeTime(
        'casilla.download.zip-expand',
        async () => expandZipToAnexos(buf, nroNotificacion),
        (ex) => ({ nroNotificacion, files: ex.length }),
      );
      await sinoeTime('casilla.download.close-modal', () => closeAnexosModal(page), { nroNotificacion });
      sinoeLogInfo('casilla: zip expanded', { nroNotificacion, files: expanded.length });
      return expanded;
    }

    const ext = suggested.includes('.') ? (suggested.split('.').pop() || 'pdf') : 'pdf';
    await sinoeTime('casilla.download.close-modal', () => closeAnexosModal(page), { nroNotificacion });
    return [
      {
        tipo: ext.toUpperCase(),
        identificacionAnexo: suggested.slice(0, 500),
        nroPaginas: '—',
        pesoArchivo: String(buf.length),
        fileBuffer: buf,
        suggestedFilename: `anexo-${nroNotificacion}-${suggested.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
      },
    ];
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    sinoeLogWarn('casilla: download failed', { nroNotificacion, error: msg });
    await sinoeTime('casilla.download.close-modal', () => closeAnexosModal(page), { nroNotificacion });
    return [];
  }
}

/** Localiza la fila por índice (tras cerrar el modal se re-consulta el tbody). */
export function casillaRowLocator(page: Page, rowIndex: number): Locator {
  return page.locator(TABLE_TBODY).locator('tr[role="row"]').nth(rowIndex);
}
