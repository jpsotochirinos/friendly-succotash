import type { Cond } from './types';

export type EvaluationContext = Record<string, unknown>;

function getPath(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) return undefined;
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/**
 * Safe condition evaluator — no eval(), only explicit operators.
 */
export function evaluateCondition(cond: Cond, ctx: EvaluationContext): boolean {
  if ('all' in cond && Array.isArray(cond.all)) {
    return cond.all.every((c) => evaluateCondition(c, ctx));
  }
  if ('any' in cond && Array.isArray(cond.any)) {
    return cond.any.some((c) => evaluateCondition(c, ctx));
  }
  if ('not' in cond && cond.not) {
    return !evaluateCondition(cond.not, ctx);
  }
  if ('eq' in cond && Array.isArray(cond.eq) && cond.eq.length === 2) {
    const [path, expected] = cond.eq;
    return getPath(ctx, path) === expected;
  }
  if ('neq' in cond && Array.isArray(cond.neq) && cond.neq.length === 2) {
    const [path, expected] = cond.neq;
    return getPath(ctx, path) !== expected;
  }
  if ('in' in cond && Array.isArray(cond.in) && cond.in.length === 2) {
    const [path, list] = cond.in;
    const v = getPath(ctx, path);
    return Array.isArray(list) && list.includes(v);
  }
  if ('gt' in cond && Array.isArray(cond.gt) && cond.gt.length === 2) {
    const [path, n] = cond.gt;
    const v = getPath(ctx, path);
    return typeof v === 'number' && typeof n === 'number' && v > n;
  }
  if ('lt' in cond && Array.isArray(cond.lt) && cond.lt.length === 2) {
    const [path, n] = cond.lt;
    const v = getPath(ctx, path);
    return typeof v === 'number' && typeof n === 'number' && v < n;
  }
  if ('gte' in cond && Array.isArray(cond.gte) && cond.gte.length === 2) {
    const [path, n] = cond.gte;
    const v = getPath(ctx, path);
    return typeof v === 'number' && typeof n === 'number' && v >= n;
  }
  if ('lte' in cond && Array.isArray(cond.lte) && cond.lte.length === 2) {
    const [path, n] = cond.lte;
    const v = getPath(ctx, path);
    return typeof v === 'number' && typeof n === 'number' && v <= n;
  }
  if ('has' in cond && Array.isArray(cond.has) && cond.has.length === 1) {
    const v = getPath(ctx, cond.has[0]);
    return v !== undefined && v !== null && v !== '';
  }
  if ('matches' in cond && Array.isArray(cond.matches) && cond.matches.length === 2) {
    const [path, pattern] = cond.matches;
    const v = getPath(ctx, path);
    if (typeof v !== 'string' || typeof pattern !== 'string') return false;
    try {
      return new RegExp(pattern).test(v);
    } catch {
      return false;
    }
  }
  return false;
}
