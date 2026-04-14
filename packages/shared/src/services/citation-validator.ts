export interface CitationCheckResult {
  citationsFound: string[];
  totalCitations: number;
  validCitations: number;
  invalidCitations: string[];
  duplicateCitations: string[];
  hasBibliography: boolean;
  citationDensity: number;
  score: number;
}

const CITATION_PATTERNS = [
  /([A-ZÁÉÍÓÚÑ][a-záéíóúüñ]+(?:\s(?:et\s+al\.?|y|&)\s*[A-ZÁÉÍÓÚÑ][a-záéíóúüñ]+)*)\s*\((\d{4})\)/g,
  /(?:Ley|D\.?S\.?|R\.?M\.?|D\.?L\.?)\s*(?:N[°ºo]\.?\s*)(\d[\d-]*)/gi,
  /\[(\d+)\]/g,
];

const BIBLIOGRAPHY_MARKERS = [
  /\n\s*(?:referencias|bibliograf[ií]a|fuentes|works cited|references)\s*\n/i,
];

export function validateCitations(text: string): CitationCheckResult {
  const found: string[] = [];

  for (const pattern of CITATION_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      found.push(match[0]);
    }
  }

  const normalized = found.map(c => c.trim().toLowerCase());
  const unique = [...new Set(normalized)];
  const duplicates = normalized.filter((c, i) => normalized.indexOf(c) !== i);
  const duplicateCitations = [...new Set(duplicates)];

  const hasBibliography = BIBLIOGRAPHY_MARKERS.some(p => p.test(text));

  const bracketRefs = found.filter(c => /^\[\d+\]$/.test(c));
  const invalidCitations: string[] = [];
  if (bracketRefs.length > 0 && !hasBibliography) {
    invalidCitations.push(
      'Se usan referencias numéricas [n] pero no se encontró sección de bibliografía.',
    );
  }

  const wordCount = (text.match(/\b\w{3,}\b/g) || []).length;
  const citationDensity = wordCount > 0 ? (unique.length / wordCount) * 1000 : 0;

  let score = 0.5;

  if (found.length === 0 && wordCount < 200) {
    score = 0.8;
  } else if (found.length === 0 && wordCount >= 200) {
    score = 0.4;
  } else {
    score = 0.6;

    if (citationDensity >= 2) score += 0.15;
    else if (citationDensity >= 1) score += 0.1;
    else if (citationDensity >= 0.5) score += 0.05;

    if (hasBibliography) score += 0.1;

    if (duplicateCitations.length === 0) score += 0.05;
    else score -= Math.min(0.1, duplicateCitations.length * 0.02);

    if (invalidCitations.length === 0) score += 0.05;
    else score -= 0.1;
  }

  score = Math.max(0, Math.min(1, score));

  return {
    citationsFound: found,
    totalCitations: found.length,
    validCitations: found.length - invalidCitations.length,
    invalidCitations,
    duplicateCitations,
    hasBibliography,
    citationDensity: Math.round(citationDensity * 100) / 100,
    score,
  };
}
