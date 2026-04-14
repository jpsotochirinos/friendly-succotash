export interface CoherenceAnalysisResult {
  score: number;
  paragraphCount: number;
  avgParagraphLength: number;
  sentenceCount: number;
  avgSentenceLength: number;
  transitionWordCount: number;
  vocabularyDiversity: number;
  issues: string[];
  suggestions: string[];
}

const TRANSITION_WORDS = [
  'sin embargo', 'no obstante', 'por lo tanto', 'en consecuencia',
  'además', 'asimismo', 'por otra parte', 'por otro lado',
  'en primer lugar', 'en segundo lugar', 'finalmente', 'en conclusión',
  'por ejemplo', 'es decir', 'en otras palabras', 'de hecho',
  'a pesar de', 'aunque', 'mientras que', 'en cambio',
  'por consiguiente', 'de este modo', 'en efecto', 'cabe destacar',
  'en resumen', 'dicho de otro modo', 'tal como', 'dado que',
  'debido a', 'puesto que', 'ya que', 'así pues',
  'de manera que', 'con respecto a', 'en relación con',
];

export async function analyzeCoherence(text: string): Promise<CoherenceAnalysisResult> {
  const issues: string[] = [];
  const suggestions: string[] = [];

  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const paragraphLengths = paragraphs.map(p => p.split(/\s+/).length);
  const avgParagraphLen = paragraphLengths.length > 0
    ? paragraphLengths.reduce((a, b) => a + b, 0) / paragraphLengths.length
    : 0;

  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
  const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
  const avgSentenceLen = sentenceLengths.length > 0
    ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
    : 0;

  const lowerText = text.toLowerCase();
  let transitionCount = 0;
  for (const tw of TRANSITION_WORDS) {
    const regex = new RegExp(`\\b${tw}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) transitionCount += matches.length;
  }

  const allWords = text.match(/\b[a-záéíóúüñ]{3,}\b/gi) || [];
  const totalWords = allWords.length;
  const uniqueWords = new Set(allWords.map(w => w.toLowerCase()));
  const vocabularyDiversity = totalWords > 0 ? uniqueWords.size / totalWords : 0;

  let sentenceVariation = 0;
  if (sentenceLengths.length > 1) {
    const mean = avgSentenceLen;
    const variance = sentenceLengths.reduce((sum, l) => sum + (l - mean) ** 2, 0) / sentenceLengths.length;
    const stdDev = Math.sqrt(variance);
    sentenceVariation = mean > 0 ? stdDev / mean : 0;
  }

  const shortParagraphs = paragraphLengths.filter(l => l < 20);
  if (shortParagraphs.length > paragraphLengths.length * 0.5 && paragraphLengths.length > 2) {
    issues.push('Varios párrafos son muy cortos; podrían necesitar más desarrollo.');
    suggestions.push('Ampliar los párrafos con menos de 20 palabras para mejorar la coherencia.');
  }

  if (avgSentenceLen > 40) {
    issues.push('Las oraciones son muy largas en promedio, lo que dificulta la lectura.');
    suggestions.push('Dividir oraciones de más de 40 palabras en oraciones más cortas.');
  }

  if (sentenceVariation < 0.15 && sentences.length > 5) {
    issues.push('Las oraciones tienen longitud muy uniforme, lo que genera un ritmo monótono.');
    suggestions.push('Variar la longitud de las oraciones para mejorar la fluidez del texto.');
  }

  if (transitionCount === 0 && paragraphs.length > 2) {
    issues.push('No se encontraron palabras de transición entre ideas.');
    suggestions.push('Usar conectores como "sin embargo", "por lo tanto", "además" para enlazar ideas.');
  } else if (paragraphs.length > 3 && transitionCount < paragraphs.length * 0.3) {
    issues.push('Pocas palabras de transición en relación al número de párrafos.');
    suggestions.push('Agregar más conectores lógicos entre párrafos para mejorar la cohesión.');
  }

  if (vocabularyDiversity < 0.3 && totalWords > 100) {
    issues.push('Vocabulario repetitivo; baja diversidad léxica.');
    suggestions.push('Usar sinónimos y variar el vocabulario para enriquecer el texto.');
  }

  let score = 0;

  // Paragraph structure (0-0.2)
  const paragraphScore = paragraphs.length >= 3 && shortParagraphs.length <= paragraphLengths.length * 0.3
    ? 0.2
    : paragraphs.length >= 2 ? 0.12 : 0.05;
  score += paragraphScore;

  // Sentence quality (0-0.25)
  let sentenceScore = 0.1;
  if (avgSentenceLen >= 10 && avgSentenceLen <= 30) sentenceScore = 0.2;
  else if (avgSentenceLen >= 8 && avgSentenceLen <= 40) sentenceScore = 0.15;
  if (sentenceVariation >= 0.2) sentenceScore += 0.05;
  score += sentenceScore;

  // Transitions (0-0.25)
  const transitionsPerParagraph = paragraphs.length > 0 ? transitionCount / paragraphs.length : 0;
  let transitionScore = 0.05;
  if (transitionsPerParagraph >= 1) transitionScore = 0.25;
  else if (transitionsPerParagraph >= 0.5) transitionScore = 0.18;
  else if (transitionsPerParagraph > 0) transitionScore = 0.1;
  score += transitionScore;

  // Vocabulary diversity (0-0.15)
  let vocabScore = 0.05;
  if (vocabularyDiversity >= 0.5) vocabScore = 0.15;
  else if (vocabularyDiversity >= 0.4) vocabScore = 0.12;
  else if (vocabularyDiversity >= 0.3) vocabScore = 0.08;
  score += vocabScore;

  // Penalty-free baseline for very short texts
  if (totalWords < 50) {
    score = Math.max(score, 0.6);
  }

  // Issue penalty
  score -= issues.length * 0.03;

  // Length bonus (longer well-structured docs)
  if (totalWords > 300 && paragraphs.length >= 4 && issues.length === 0) {
    score += 0.15;
  }

  score = Math.max(0, Math.min(1, score));

  return {
    score,
    paragraphCount: paragraphs.length,
    avgParagraphLength: Math.round(avgParagraphLen),
    sentenceCount: sentences.length,
    avgSentenceLength: Math.round(avgSentenceLen),
    transitionWordCount: transitionCount,
    vocabularyDiversity: Math.round(vocabularyDiversity * 100) / 100,
    issues,
    suggestions,
  };
}
