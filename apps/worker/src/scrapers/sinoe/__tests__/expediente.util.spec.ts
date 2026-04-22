import { describe, it, expect } from 'vitest';
import { normalizeExpediente } from '../expediente.util';

describe('normalizeExpediente', () => {
  it('trims and collapses spaces', () => {
    expect(normalizeExpediente('  12345-2024-0-1234-  ')).toBe('12345-2024-0-1234-');
  });
});
