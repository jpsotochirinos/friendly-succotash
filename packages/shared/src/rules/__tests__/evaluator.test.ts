import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../evaluator';
import type { Cond } from '../types';

describe('evaluateCondition', () => {
  const ctx = {
    event: 'document.created',
    payload: { contentLengthDelta: 42 },
    item: { currentStateKey: 'pending', actionType: 'doc_creation' },
  };

  it('evaluates eq', () => {
    const c: Cond = { eq: ['event', 'document.created'] };
    expect(evaluateCondition(c, ctx)).toBe(true);
    expect(evaluateCondition({ eq: ['event', 'other'] }, ctx)).toBe(false);
  });

  it('evaluates nested paths', () => {
    expect(evaluateCondition({ eq: ['item.currentStateKey', 'pending'] }, ctx)).toBe(true);
    expect(evaluateCondition({ gt: ['payload.contentLengthDelta', 10] }, ctx)).toBe(true);
    expect(evaluateCondition({ gt: ['payload.contentLengthDelta', 100] }, ctx)).toBe(false);
  });

  it('evaluates all / any / not', () => {
    const all: Cond = {
      all: [{ eq: ['item.currentStateKey', 'pending'] }, { eq: ['item.actionType', 'doc_creation'] }],
    };
    expect(evaluateCondition(all, ctx)).toBe(true);

    const any: Cond = {
      any: [{ eq: ['item.currentStateKey', 'closed'] }, { eq: ['item.currentStateKey', 'pending'] }],
    };
    expect(evaluateCondition(any, ctx)).toBe(true);

    expect(evaluateCondition({ not: { eq: ['item.currentStateKey', 'pending'] } }, ctx)).toBe(false);
  });

  it('evaluates in / has / matches', () => {
    expect(evaluateCondition({ in: ['item.currentStateKey', ['pending', 'active']] }, ctx)).toBe(true);
    expect(evaluateCondition({ has: ['item.actionType'] }, ctx)).toBe(true);
    expect(evaluateCondition({ has: ['item.missing'] }, ctx)).toBe(false);
    expect(evaluateCondition({ matches: ['item.actionType', '^doc_'] }, ctx)).toBe(true);
  });
});
