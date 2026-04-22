import type { CaptchaSolverStrategy } from './captcha-solver.strategy';

/**
 * Image CAPTCHA via 2captcha HTTP API (no extra npm dep).
 * @see https://2captcha.com/2captcha-api#solving_normal_captcha
 */
export class TwoCaptchaSolver implements CaptchaSolverStrategy {
  readonly name = '2captcha';

  constructor(private readonly apiKey: string) {}

  async solve(imageBytes: Buffer): Promise<string> {
    if (!this.apiKey) {
      throw new Error('2captcha: TWOCAPTCHA_API_KEY is not set');
    }
    const body = imageBytes.toString('base64');
    const params = new URLSearchParams();
    params.set('key', this.apiKey);
    params.set('method', 'base64');
    params.set('body', body);
    params.set('json', '1');

    const inRes = await fetch('https://2captcha.com/in.php', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const inRaw = await inRes.text();
    let id: string;
    if (inRaw.trim().startsWith('OK|')) {
      id = inRaw.trim().slice(3);
    } else {
      try {
        const inJson = JSON.parse(inRaw) as { status: number; request?: string; error_text?: string };
        if (inJson.status !== 1 || !inJson.request) {
          throw new Error(inJson.error_text || inRaw);
        }
        id = inJson.request;
      } catch {
        throw new Error(`2captcha in.php: ${inRaw.slice(0, 200)}`);
      }
    }

    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 5000));
      const resUrl = `https://2captcha.com/res.php?key=${encodeURIComponent(this.apiKey)}&action=get&id=${encodeURIComponent(id)}&json=1`;
      const resRes = await fetch(resUrl);
      const resRaw = await resRes.text();
      let resJson: { status?: number; request?: string; error_text?: string };
      try {
        resJson = JSON.parse(resRaw) as { status?: number; request?: string; error_text?: string };
      } catch {
        if (resRaw.trim().startsWith('OK|')) {
          return resRaw.trim().slice(3).replace(/\s+/g, '');
        }
        throw new Error(`2captcha res parse: ${resRaw.slice(0, 200)}`);
      }
      if (resJson.status === 1 && resJson.request) {
        return String(resJson.request).trim().replace(/\s+/g, '');
      }
      if (resJson.request === 'CAPCHA_NOT_READY' || resJson.error_text === 'CAPCHA_NOT_READY') {
        continue;
      }
      if (resJson.error_text && resJson.error_text !== 'CAPCHA_NOT_READY') {
        throw new Error(`2captcha res: ${resJson.error_text}`);
      }
    }
    throw new Error('2captcha: timeout waiting for solution');
  }
}
