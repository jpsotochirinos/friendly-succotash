import type { CaptchaSolverStrategy } from './captcha-solver.strategy';
import { GeminiCaptchaSolver } from './gemini-solver';
import { ManualCaptchaSolver } from './manual-solver';
import { TwoCaptchaSolver } from './two-captcha-solver';

export type CaptchaStrategyName = 'gemini' | 'manual' | '2captcha';

export interface CaptchaChainAttempt {
  strategy: string;
  ok: boolean;
  error?: string;
}

export function parseCaptchaStrategyOrder(env: string | undefined): CaptchaStrategyName[] {
  const raw = env || 'gemini,manual,2captcha';
  const parts = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const out: CaptchaStrategyName[] = [];
  for (const p of parts) {
    if (p === 'gemini' || p === 'manual' || p === '2captcha') {
      out.push(p);
    }
  }
  return out.length ? out : ['gemini', 'manual', '2captcha'];
}

export function buildSolvers(order: CaptchaStrategyName[]): CaptchaSolverStrategy[] {
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const geminiModel = process.env.SINOE_CAPTCHA_GEMINI_MODEL || 'gemini-2.5-flash';
  const debugDir = process.env.SINOE_CAPTCHA_DEBUG_DIR || '/tmp/sinoe-captchas';
  const twoKey = process.env.TWOCAPTCHA_API_KEY || '';

  const map: Record<CaptchaStrategyName, () => CaptchaSolverStrategy | null> = {
    gemini: () => (geminiKey ? new GeminiCaptchaSolver(geminiKey, geminiModel) : null),
    manual: () => new ManualCaptchaSolver(debugDir),
    '2captcha': () => (twoKey ? new TwoCaptchaSolver(twoKey) : null),
  };

  const list: CaptchaSolverStrategy[] = [];
  for (const name of order) {
    const factory = map[name];
    const s = factory?.() ?? null;
    if (s) list.push(s);
  }
  return list;
}

/**
 * Tries each solver in order until one returns text.
 * Records attempts for logging (no credentials).
 */
export async function solveCaptchaWithChain(
  imageBytes: Buffer,
  order: CaptchaStrategyName[],
): Promise<{ text: string; attempts: CaptchaChainAttempt[] }> {
  const solvers = buildSolvers(order);
  if (!solvers.length) {
    throw new Error('captcha-chain: no solvers configured (set GEMINI_API_KEY and/or TWOCAPTCHA_API_KEY)');
  }
  const attempts: CaptchaChainAttempt[] = [];
  let lastErr: Error | undefined;
  for (const s of solvers) {
    try {
      const text = await s.solve(imageBytes);
      attempts.push({ strategy: s.name, ok: true });
      return { text, attempts };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      attempts.push({ strategy: s.name, ok: false, error: msg });
      lastErr = e instanceof Error ? e : new Error(msg);
    }
  }
  throw lastErr ?? new Error('captcha-chain: all strategies failed');
}
