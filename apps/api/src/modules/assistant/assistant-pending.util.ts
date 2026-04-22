import type { InteractiveListRow } from '../whatsapp/providers/whatsapp-provider.interface';
import type { PendingInteractiveChoice, PendingInteractiveChoiceOption } from './assistant-pending.types';

export const MORE_ROW_ID = '__more__';
export const CHOICE_PAGE_CONTENT_SIZE = 9;

export function mapWidgetChoiceOptions(
  options: Array<{ id: string; label: string; description?: string }>,
): PendingInteractiveChoiceOption[] {
  return options.map((o) => ({
    id: o.id,
    title: o.label,
    description: o.description,
  }));
}

/** Hasta 9 ítems de contenido + fila «Ver más» si quedan opciones (máx. 10 filas para WhatsApp). */
export function buildChoiceDisplayRows(pending: PendingInteractiveChoice): {
  rows: InteractiveListRow[];
} {
  const { allOptions, page, pageSize } = pending;
  const start = page * pageSize;
  const slice = allOptions.slice(start, start + pageSize);
  const hasMore = start + slice.length < allOptions.length;
  const rows: InteractiveListRow[] = slice.map((o) => ({
    id: o.id,
    title: o.title.slice(0, 80),
    description: o.description?.slice(0, 72),
  }));
  if (hasMore) {
    rows.push({ id: MORE_ROW_ID, title: 'Ver más opciones' });
  }
  return { rows };
}

export function resolveChoicePickId(
  interactiveId: string | undefined,
  bodyTrimmed: string,
  pending: PendingInteractiveChoice,
): string | null {
  if (interactiveId?.length) return interactiveId;
  const m = bodyTrimmed.match(/^\s*(\d+)\s*$/);
  if (!m) return null;
  const n = Number(m[1]);
  const { rows } = buildChoiceDisplayRows(pending);
  if (!Number.isFinite(n) || n < 1 || n > rows.length) return null;
  return rows[n - 1]!.id;
}

export function findChoiceOptionById(
  pending: PendingInteractiveChoice,
  id: string,
): PendingInteractiveChoiceOption | undefined {
  return pending.allOptions.find((o) => o.id === id);
}

/** Twilio templates mal configurados pueden enviar el nombre del placeholder como texto del botón. */
function isPlaceholderYes(s: string): boolean {
  return /^(btn_1_title|btn_1_id|btn_1)$/.test(s);
}

function isPlaceholderNo(s: string): boolean {
  return /^(btn_2_title|btn_2_id|btn_2)$/.test(s);
}

export function resolveConfirmReply(
  interactiveId: string | undefined,
  bodyTrimmed: string,
): 'yes' | 'no' | null {
  const id = interactiveId?.toLowerCase().trim();
  if (id === 'confirm_yes') return 'yes';
  if (id === 'confirm_no') return 'no';
  if (id && isPlaceholderYes(id)) return 'yes';
  if (id && isPlaceholderNo(id)) return 'no';
  const t = bodyTrimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (isPlaceholderYes(t)) return 'yes';
  if (isPlaceholderNo(t)) return 'no';
  if (/^(si|s|yes|y|1|ok)$/.test(t)) return 'yes';
  if (/^1[\s.)]*$/.test(t)) return 'yes';
  if (/^2[\s.)]*$/.test(t)) return 'no';
  if (/^(no|n|2)$/.test(t)) return 'no';
  return null;
}
