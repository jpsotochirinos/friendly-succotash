export interface ReferenceCheckResult {
  referencesFound: string[];
  totalReferences: number;
  validFormat: number;
  invalidFormat: string[];
  outdatedReferences: string[];
  formatScore: number;
}

const REFERENCE_PATTERNS = [
  /([A-ZÁÉÍÓÚÑ][a-záéíóúüñ]+(?:\s(?:et\s+al\.?|y|&)\s*[A-ZÁÉÍÓÚÑ][a-záéíóúüñ]+)*)\s*\((\d{4})\)/g,
  /(?:Ley|D\.?S\.?|R\.?M\.?|D\.?L\.?)\s*(?:N[°ºo]\.?\s*)(\d[\d-]*)/gi,
  /https?:\/\/[^\s,)]+/g,
];

const CURRENT_YEAR = new Date().getFullYear();
const MAX_REFERENCE_AGE = 10;

export function validateReferences(text: string): ReferenceCheckResult {
  const allRefs: string[] = [];
  const invalidFormat: string[] = [];
  const outdated: string[] = [];

  for (const pattern of REFERENCE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      allRefs.push(match[0]);
    }
  }

  const yearPattern = /\((\d{4})\)/g;
  let yearMatch;
  while ((yearMatch = yearPattern.exec(text)) !== null) {
    const year = parseInt(yearMatch[1], 10);
    if (year < CURRENT_YEAR - MAX_REFERENCE_AGE && year > 1900) {
      outdated.push(`Reference year ${year} (${yearMatch[0]})`);
    }
  }

  const parenthesesBalance = (text.match(/\(/g) || []).length ===
    (text.match(/\)/g) || []).length;
  if (!parenthesesBalance) {
    invalidFormat.push('Unbalanced parentheses in references');
  }

  const validCount = allRefs.length - invalidFormat.length;

  return {
    referencesFound: allRefs,
    totalReferences: allRefs.length,
    validFormat: validCount,
    invalidFormat,
    outdatedReferences: outdated,
    formatScore: allRefs.length > 0 ? validCount / allRefs.length : 1,
  };
}
