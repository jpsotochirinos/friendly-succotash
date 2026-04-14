import nspell from 'nspell';
import { readFileSync } from 'fs';
import { join } from 'path';

let spellChecker: any = null;

async function getSpellChecker(): Promise<any> {
  if (spellChecker) return spellChecker;

  try {
    const dictModule = await import('dictionary-es');
    const dict = dictModule.default || dictModule;
    spellChecker = nspell(Buffer.from(dict.aff) as any, Buffer.from(dict.dic) as any);
  } catch {
    const affPath = join(__dirname, '../dictionaries/es.aff');
    const dicPath = join(__dirname, '../dictionaries/es.dic');
    try {
      const aff = readFileSync(affPath);
      const dic = readFileSync(dicPath);
      spellChecker = nspell({ aff, dic });
    } catch {
      console.warn('Spanish dictionary not found, spell check will be skipped');
      return null;
    }
  }

  return spellChecker;
}

export interface SpellCheckResult {
  totalWords: number;
  misspelledWords: string[];
  misspelledCount: number;
  accuracy: number;
  suggestions: Record<string, string[]>;
}

export async function checkSpelling(text: string): Promise<SpellCheckResult> {
  const checker = await getSpellChecker();

  const wordRegex = /\b[a-záéíóúüñ]{3,}\b/gi;
  const words = text.match(wordRegex) || [];
  const uniqueWords = [...new Set(words.map((w) => w.toLowerCase()))];

  if (!checker) {
    return {
      totalWords: words.length,
      misspelledWords: [],
      misspelledCount: 0,
      accuracy: 1,
      suggestions: {},
    };
  }

  const misspelled: string[] = [];
  const suggestions: Record<string, string[]> = {};

  for (const word of uniqueWords) {
    if (!checker.correct(word)) {
      misspelled.push(word);
      suggestions[word] = checker.suggest(word).slice(0, 3);
    }
  }

  return {
    totalWords: words.length,
    misspelledWords: misspelled,
    misspelledCount: misspelled.length,
    accuracy: uniqueWords.length > 0
      ? 1 - misspelled.length / uniqueWords.length
      : 1,
    suggestions,
  };
}
