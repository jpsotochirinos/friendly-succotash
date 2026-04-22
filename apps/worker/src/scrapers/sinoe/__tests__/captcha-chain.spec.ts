import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseCaptchaStrategyOrder, buildSolvers } from '../captcha/captcha-chain';

describe('parseCaptchaStrategyOrder', () => {
  it('parses csv order', () => {
    expect(parseCaptchaStrategyOrder('manual,gemini')).toEqual(['manual', 'gemini']);
  });

  it('filters unknown tokens', () => {
    expect(parseCaptchaStrategyOrder('gemini,foo,2captcha')).toEqual(['gemini', '2captcha']);
  });

  it('uses default when empty', () => {
    const o = parseCaptchaStrategyOrder('');
    expect(o.length).toBeGreaterThan(0);
    expect(o).toContain('gemini');
  });
});

describe('buildSolvers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns empty when no API keys for remote solvers', () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('TWOCAPTCHA_API_KEY', '');
    const solvers = buildSolvers(['gemini', '2captcha']);
    expect(solvers.length).toBe(0);
  });

  it('includes gemini when key set', () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const solvers = buildSolvers(['gemini']);
    expect(solvers.some((s) => s.name === 'gemini')).toBe(true);
  });

  it('always allows manual solver', () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('TWOCAPTCHA_API_KEY', '');
    const solvers = buildSolvers(['manual']);
    expect(solvers.some((s) => s.name === 'manual')).toBe(true);
  });
});
