import { describe, it, expect } from 'vitest';
import { serializeArrays } from './trackables';

describe('serializeArrays (trackables list params)', () => {
  it('joins array query params with commas', () => {
    expect(
      serializeArrays({
        tipo: ['case', 'process'],
        asignadoId: ['u1'],
        cursor: undefined,
      }),
    ).toEqual({
      tipo: 'case,process',
      asignadoId: 'u1',
    });
  });

  it('omits empty arrays and nullish', () => {
    expect(
      serializeArrays({
        tipo: [],
        search: '',
        limit: 50,
      }),
    ).toEqual({ limit: '50' });
  });
});
