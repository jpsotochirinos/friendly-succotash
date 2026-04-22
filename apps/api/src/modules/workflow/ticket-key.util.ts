import type { Trackable } from '@tracker/db';

/** Stable prefix for ticket keys: expediente number, else first letters of title. */
export function ticketPrefixFromTrackable(
  expedientNumber?: string | null,
  title?: string | null,
): string {
  const en = expedientNumber?.trim();
  if (en) {
    const alnum = en.replace(/[^a-zA-Z0-9]/g, '');
    if (alnum.length >= 3) return alnum.slice(0, 5).toUpperCase();
    return alnum.padEnd(3, 'X').toUpperCase().slice(0, 5);
  }
  const t = (title ?? 'ITEM')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9]/g, '');
  const base = (t.slice(0, 3) || 'ITM').toUpperCase();
  return base.padEnd(3, 'X');
}

export function ticketKeyForItem(
  trackable: Pick<Trackable, 'expedientNumber' | 'title'> | undefined,
  itemNumber: number | null | undefined,
): string | null {
  if (itemNumber == null || Number.isNaN(Number(itemNumber))) return null;
  const prefix = ticketPrefixFromTrackable(trackable?.expedientNumber, trackable?.title);
  return `${prefix}-${itemNumber}`;
}
