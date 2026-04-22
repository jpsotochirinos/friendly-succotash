import type { Page } from 'playwright';
import type { SinoeAnexo } from '@tracker/shared';

export type SinoeAnexoRow = SinoeAnexo & { downloadHref?: string };

export interface DetailParseResult {
  nroNotificacion: string;
  nroExpediente: string;
  sumilla: string;
  organoJurisdiccional: string;
  fecha: Date;
  estadoRevision: 'Leído' | 'No Leído';
  carpeta: string;
  anexos: SinoeAnexoRow[];
}

/**
 * Extrae campos del detalle de una notificación. Selectores genéricos; refinar con HTML real.
 */
export async function parseNotificationDetail(page: Page): Promise<DetailParseResult> {
  const bodyText = await page.locator('body').innerText();

  const nroNotificacion =
    bodyText.match(/notificaci[oó]n\s*[:]?\s*([0-9\-A-Za-z]+)/i)?.[1]?.trim() ||
    bodyText.match(/N[°º]?\s*([0-9\-]+)/)?.[1]?.trim() ||
    `unknown-${Date.now()}`;

  const nroExpediente =
    bodyText.match(/expediente\s*[:]?\s*([0-9\-]+)/i)?.[1]?.trim() || '—';

  const sumilla =
    bodyText.split(/\n/).find((l) => /sumilla|asunto/i.test(l))?.replace(/^.*?:/, '').trim() ||
    bodyText.slice(0, 500);

  const organoJurisdiccional =
    bodyText.match(/(juzgado|sala|distrito)[^\n]*/i)?.[0]?.trim() || '—';

  const fecha = new Date();

  const estadoRevision: 'Leído' | 'No Leído' = /no\s*leíd|pendiente/i.test(bodyText)
    ? 'No Leído'
    : 'Leído';

  const carpeta = bodyText.match(/carpeta\s*[:]?\s*([^\n]+)/i)?.[1]?.trim() || '—';

  const anexos: SinoeAnexoRow[] = [];
  const rows = page.locator('table tbody tr');
  const n = await rows.count();
  for (let i = 0; i < n; i++) {
    const row = rows.nth(i);
    const cells = row.locator('td');
    const c = await cells.count();
    if (c >= 3) {
      const tipo = (await cells.nth(0).innerText()).trim();
      const identificacionAnexo = (await cells.nth(1).innerText()).trim();
      const nroPaginas = (await cells.nth(2).innerText()).trim();
      const pesoArchivo = c > 3 ? (await cells.nth(3).innerText()).trim() : '—';
      const link = row.locator('a[href]').first();
      const downloadHref = (await link.count()) ? (await link.getAttribute('href')) || undefined : undefined;
      if (tipo.length > 0 && tipo.length < 200) {
        anexos.push({ tipo, identificacionAnexo, nroPaginas, pesoArchivo, downloadHref });
      }
    }
  }

  return {
    nroNotificacion,
    nroExpediente,
    sumilla,
    organoJurisdiccional,
    fecha,
    estadoRevision,
    carpeta,
    anexos,
  };
}
