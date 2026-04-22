/** Normaliza nº de expediente para matchear `trackables.expedient_number`. */
export function normalizeExpediente(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
