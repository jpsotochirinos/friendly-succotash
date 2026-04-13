export interface StructureCheckResult {
  templateSections: string[];
  documentSections: string[];
  matchedSections: string[];
  missingSections: string[];
  extraSections: string[];
  completeness: number;
}

export function validateStructure(
  documentHeadings: string[],
  templateHeadings: string[],
): StructureCheckResult {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');

  const templateNormalized = templateHeadings.map(normalize);
  const docNormalized = documentHeadings.map(normalize);

  const matched = templateNormalized.filter((t) =>
    docNormalized.some((d) => d.includes(t) || t.includes(d) || levenshteinSimilarity(d, t) > 0.7),
  );

  const missing = templateNormalized.filter((t) => !matched.includes(t));
  const extra = docNormalized.filter(
    (d) => !templateNormalized.some((t) => d.includes(t) || t.includes(d) || levenshteinSimilarity(d, t) > 0.7),
  );

  return {
    templateSections: templateHeadings,
    documentSections: documentHeadings,
    matchedSections: matched,
    missingSections: missing,
    extraSections: extra,
    completeness:
      templateHeadings.length > 0
        ? matched.length / templateHeadings.length
        : 1,
  };
}

function levenshteinSimilarity(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - matrix[b.length][a.length] / maxLen;
}
