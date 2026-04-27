import { describe, it, expect } from 'vitest';
import {
  normalizeSinoeMatchText,
  sinoeKeywordsMatch,
} from '../src/modules/legal/legal-process-sinoe-match.util';

describe('legal-process-sinoe-match.util', () => {
  it('normaliza tildes y mayúsculas', () => {
    expect(normalizeSinoeMatchText('  admítida  ')).toBe('ADMITIDA');
  });

  it('matchea keyword en sumilla', () => {
    expect(
      sinoeKeywordsMatch('Se dicta auto admisorio de la demanda', ['AUTO ADMISORIO']),
    ).toBe(true);
  });

  it('no matchea sin coincidencia', () => {
    expect(sinoeKeywordsMatch('Notificación de vista', ['AUTO ADMISORIO'])).toBe(false);
  });
});
