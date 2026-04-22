/**
 * Heurísticas para sugerir clave de expediente (agrupación) sin ML pesado.
 */

/** Patrones comunes de número de expediente judicial (Perú y genéricos). */
const EXPEDIENTE_PATTERNS: RegExp[] = [
  /\b\d{4}-\d{4}-\d{1,6}-[A-Z0-9]+-[A-Z0-9-]+\b/i,
  /\bExp\.?\s*N[°º]?\s*[\d\-/]+\b/i,
  /\b\d{5}-\d{4}-\d+-\w+-\w+\b/,
  /\bCUADERNO\s+[\d.]+\b/i,
];

/**
 * Deriva una clave estable de expediente desde la ruta relativa (primera carpeta con sentido).
 */
export function trackableKeyFromPath(sourcePath: string): { key: string; confidence: number } {
  const normalized = sourcePath.replace(/\\/g, '/').trim();
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) {
    return { key: 'sin-clasificar', confidence: 0.1 };
  }
  // Usar el primer segmento como carpeta de expediente si hay varios niveles
  if (segments.length >= 2) {
    return { key: segments.slice(0, -1).join('/'), confidence: 0.65 };
  }
  return { key: segments[0], confidence: 0.4 };
}

export function extractExpedienteNumberFromText(text: string): string | null {
  const slice = text.slice(0, 100_000);
  for (const re of EXPEDIENTE_PATTERNS) {
    const m = slice.match(re);
    if (m) return m[0].trim();
  }
  return null;
}

/**
 * Clave sugerida combinando número de expediente en texto + path.
 */
export function suggestTrackableKey(sourcePath: string, textPreview: string): { key: string; confidence: number } {
  const fromText = extractExpedienteNumberFromText(textPreview);
  if (fromText) {
    return { key: fromText, confidence: 0.85 };
  }
  return trackableKeyFromPath(sourcePath);
}
