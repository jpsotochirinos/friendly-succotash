/** Normaliza texto para matchear sumillas SINOE con keywords (sin tildes, mayúsculas). */
export function normalizeSinoeMatchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export function sinoeKeywordsMatch(sumilla: string, keywords: string[]): boolean {
  const t = normalizeSinoeMatchText(sumilla);
  return keywords.some((kw) => t.includes(normalizeSinoeMatchText(kw)));
}
