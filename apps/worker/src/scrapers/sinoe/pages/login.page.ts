import type { Page } from 'playwright';
import { solveCaptchaWithChain, parseCaptchaStrategyOrder } from '../captcha/captcha-chain';
import { isSinoeVerboseLog, safeUrlForLog, sinoeLogInfo, sinoeLogWarn, sinoeTime } from '../sinoe-logger';

export interface LoginCredentials {
  username: string;
  password: string;
}

const MAX_ATTEMPTS = 3;

/** Client ids en login.xhtml (PrimeFaces/JSF); el portal usa "Capcha" en el id. */
const LOGIN_CAPTCHA_IMG_ID = 'frmLogin:imgCapcha';
const LOGIN_CAPTCHA_IMG_TITLE = 'Imagen captcha';
const LOGIN_CAPTCHA_INPUT_ID = 'frmLogin:txtCapcha';

/** Placeholders del formulario en login.xhtml. */
const LOGIN_PLACEHOLDER_USER = 'Usuario';
const LOGIN_PLACEHOLDER_PASSWORD = 'Contraseña';

/**
 * El login muestra a veces un modal "COMUNICADO" (PrimeFaces) con un solo botón
 * "Aceptar" que tapa usuario/contraseña/CAPTCHA hasta cerrarse.
 */
/** Selectores típicos PrimeFaces / mensajes globales en login PJ. */
const LOGIN_ERROR_LOCATORS = [
  '.ui-messages-error',
  '.ui-message-error',
  '.ui-message-error-summary',
  '.ui-message-error-detail',
  '.ui-growl-item',
  '.ui-growl-message',
  '.ui-growl-item-message',
  '[role="alert"]',
  '.ui-messages',
  'div.ui-message',
  'span.ui-messages-error-summary',
  'span.ui-messages-error-detail',
];

/** El portal pone la nota de accesibilidad en `[role="alert"]`; no es mensaje de error de login. */
function isAccessibilityBannerOnly(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').toLowerCase();
  if (!t.includes('accesibilidad')) return false;
  if (/usuario|clave|contraseña|captcha|inv[aá]lid|incorrect|error|sesi[oó]n|bloquead|fall/i.test(text)) {
    return false;
  }
  return /control-f11|control-f10|lector de pantalla/i.test(text);
}

async function collectLoginPageFeedback(page: Page): Promise<{ joined: string; parts: string[] }> {
  const parts: string[] = [];
  for (const sel of LOGIN_ERROR_LOCATORS) {
    const loc = page.locator(sel);
    const n = await loc.count().catch(() => 0);
    for (let i = 0; i < Math.min(n, 4); i++) {
      const raw = await loc.nth(i).innerText().catch(() => '');
      const one = raw.replace(/\s+/g, ' ').trim();
      if (one.length > 0 && !isAccessibilityBannerOnly(one)) {
        parts.push(`${sel}[${i}]: ${one.slice(0, 400)}`);
      }
    }
  }
  const joined = parts.join(' | ');
  return { joined, parts };
}

function looksLikeLoginFailureMessage(text: string): boolean {
  return /usuario|clave|contraseña|captcha|c[oó]digo|inv[aá]lid|incorrect|error|verif|intente|sesi[oó]n|bloquead|fall/i.test(
    text,
  );
}

const MIN_CAPTCHA_BYTES = 80;

/**
 * El CAPTCHA es una imagen dinámica (PrimeFaces `dynamiccontent.properties`); a veces el
 * screenshot corre antes de que el `<img>` decodifique → PNG vacío. Esperamos decode y, si
 * hace falta, descargamos el mismo `src` por HTTP con la sesión del browser.
 */
async function captureCaptchaPng(page: Page): Promise<Buffer> {
  let img = page.locator(`[id="${LOGIN_CAPTCHA_IMG_ID}"]`);
  if ((await img.count()) === 0) {
    img = page.getByTitle(LOGIN_CAPTCHA_IMG_TITLE, { exact: true });
  }

  await img.waitFor({ state: 'visible', timeout: 20_000 });

  try {
    await page.waitForFunction(
      (id: string) => {
        const el = document.getElementById(id);
        if (!el || el.tagName !== 'IMG') return false;
        const im = el as HTMLImageElement;
        return im.complete && im.naturalWidth > 0 && im.naturalHeight > 0;
      },
      LOGIN_CAPTCHA_IMG_ID,
      { timeout: 25_000 },
    );
  } catch {
    sinoeLogWarn('login: captcha img not decoded in time (will try screenshot + HTTP fetch)');
  }

  await page.waitForTimeout(120);

  const meta = await img.evaluate((el: HTMLImageElement) => ({
    w: el.naturalWidth,
    h: el.naturalHeight,
    complete: el.complete,
    src: el.currentSrc || el.src,
  }));

  sinoeLogInfo('login: captcha img', {
    naturalWidth: meta.w,
    naturalHeight: meta.h,
    complete: meta.complete,
    srcSample: meta.src ? safeUrlForLog(meta.src) : '(no src)',
  });

  let bytes = await img.screenshot({ type: 'png' });

  const fetchSrc = async (): Promise<Buffer | null> => {
    const src = await img.getAttribute('src');
    if (!src) return null;
    const abs = new URL(src, page.url()).href;
    try {
      const res = await page.request.get(abs);
      if (!res.ok()) {
        sinoeLogWarn('login: captcha GET not ok', { status: res.status() });
        return null;
      }
      return Buffer.from(await res.body());
    } catch (e) {
      sinoeLogWarn('login: captcha GET failed', { err: e instanceof Error ? e.message : String(e) });
      return null;
    }
  };

  if (bytes.length < MIN_CAPTCHA_BYTES || meta.w === 0) {
    sinoeLogWarn('login: captcha screenshot tiny or undecoded, using HTTP body', {
      pngBytes: bytes.length,
    });
    const fromHttp = await fetchSrc();
    if (fromHttp && fromHttp.length >= MIN_CAPTCHA_BYTES) {
      sinoeLogInfo('login: captcha bytes from HTTP', { length: fromHttp.length });
      return fromHttp;
    }
  } else {
    const fromHttp = await fetchSrc();
    if (fromHttp && fromHttp.length > bytes.length + 200) {
      sinoeLogInfo('login: preferring larger captcha from HTTP', {
        pngBytes: bytes.length,
        httpBytes: fromHttp.length,
      });
      return fromHttp;
    }
  }

  if (bytes.length < MIN_CAPTCHA_BYTES) {
    const last = await fetchSrc();
    if (last && last.length >= MIN_CAPTCHA_BYTES) {
      sinoeLogInfo('login: captcha bytes from HTTP (last resort)', { length: last.length });
      return last;
    }
    throw new Error(
      `SINOE login: captcha image too small or missing (png=${bytes.length} bytes; natural ${meta.w}x${meta.h})`,
    );
  }

  return bytes;
}

async function dismissSinoeLoginOverlays(page: Page): Promise<void> {
  const inDialog = page
    .locator('.ui-dialog, [role="dialog"]')
    .filter({ hasText: /COMUNICADO/i })
    .getByRole('button', { name: /^Aceptar$/i })
    .first();

  try {
    await inDialog.waitFor({ state: 'visible', timeout: 8000 });
    await inDialog.click();
    sinoeLogInfo('login: dismissed COMUNICADO modal (Aceptar)');
    await page.locator('.ui-widget-overlay').first().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(200);
    return;
  } catch {
    // Modal distinto o ya cerrado: probar Aceptar visible en página.
  }

  const fallback = page.getByRole('button', { name: /^Aceptar$/i }).first();
  try {
    await fallback.waitFor({ state: 'visible', timeout: 2000 });
    await fallback.click();
    sinoeLogInfo('login: dismissed overlay (Aceptar, fallback)');
    await page.waitForTimeout(200);
  } catch {
    // Sin anuncio: flujo normal.
  }
}

/**
 * Flujo de login SINOE (PrimeFaces/JSF). Selectores centralizados para ajustar
 * cuando cambie el portal PJ.
 */
export async function performLogin(
  page: Page,
  creds: LoginCredentials,
  loginUrl: string,
): Promise<void> {
  const order = parseCaptchaStrategyOrder(process.env.SINOE_CAPTCHA_STRATEGY);
  let lastFeedback = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    sinoeLogInfo(`login: attempt ${attempt}/${MAX_ATTEMPTS}`, { url: safeUrlForLog(loginUrl) });
    await sinoeTime(`login.attempt.${attempt}.goto`, async () => {
      await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    });

    await dismissSinoeLoginOverlays(page);

    const userBox = page
      .getByPlaceholder(LOGIN_PLACEHOLDER_USER, { exact: true })
      .or(page.locator('input[type="text"]').first());
    const passBox = page
      .getByPlaceholder(LOGIN_PLACEHOLDER_PASSWORD, { exact: true })
      .or(page.locator('input[type="password"]').first());
    await userBox.waitFor({ state: 'visible', timeout: 20_000 });
    await userBox.fill(creds.username);
    await passBox.fill(creds.password);

    const captchaBytes = await sinoeTime(`login.attempt.${attempt}.captcha.capture`, () =>
      captureCaptchaPng(page),
    );
    sinoeLogInfo('login: captcha payload for solver', { byteLength: captchaBytes.length });

    const { text: captchaText } = await sinoeTime(`login.attempt.${attempt}.captcha.solve`, () =>
      solveCaptchaWithChain(captchaBytes, order),
    );
    if (isSinoeVerboseLog()) {
      sinoeLogInfo('login: captcha solved (length only)', { length: captchaText.length });
    }

    const captchaField = page
      .locator(`[id="${LOGIN_CAPTCHA_INPUT_ID}"]`)
      .or(page.locator('input[id*="Capcha" i], input[id*="captcha" i], input[name*="captcha" i]'))
      .first();
    const textInputs = page.locator('input[type="text"]');
    if (await captchaField.count()) {
      await captchaField.fill(captchaText);
    } else if ((await textInputs.count()) >= 2) {
      await textInputs.nth(1).fill(captchaText);
    } else {
      const ph = page.getByPlaceholder(/código|captcha|imagen/i).first();
      if (await ph.count()) {
        await ph.fill(captchaText);
      } else {
        throw new Error('SINOE login: no captcha text field found (adjust selectors)');
      }
    }

    const submit = page.getByRole('button', { name: /ingresar|entrar|iniciar/i }).first();
    if (await submit.count()) {
      await submit.click();
    } else {
      await page.locator('input[type="submit"]').first().click();
    }

    sinoeLogInfo('login: submitted, waiting for navigation or messages');

    const leftLogin = await sinoeTime(`login.attempt.${attempt}.submit-wait`, async () => {
      await Promise.race([
        page.waitForURL((u) => !/login\.xhtml/i.test(u.pathname + u.search), { timeout: 25_000 }),
        page.waitForLoadState('load', { timeout: 25_000 }),
      ]).catch(() => undefined);

      await page.waitForLoadState('load', { timeout: 15_000 }).catch(() => undefined);
      await page.waitForTimeout(1200);

      let u = page.url();
      if (!/login\.xhtml/i.test(u)) return true;
      await page.waitForTimeout(1500);
      u = page.url();
      if (!/login\.xhtml/i.test(u)) return true;
      return false;
    });

    if (leftLogin) {
      const url = page.url();
      const title = await page.title().catch(() => '');
      sinoeLogInfo('login: success (left login page)', {
        path: safeUrlForLog(url),
        title: title.slice(0, 120),
      });
      return;
    }

    const feedback = await collectLoginPageFeedback(page);
    lastFeedback = feedback.joined.slice(0, 4000);
    const title = await page.title().catch(() => '');

    const errLegacy = await page
      .locator('.ui-messages-error, .ui-message-error, [class*="error"]')
      .first()
      .textContent()
      .catch(() => null);

    sinoeLogWarn('login: still on login.xhtml', {
      path: safeUrlForLog(page.url()),
      title: title.slice(0, 120),
      feedbackPreview: lastFeedback.slice(0, 800) || '(no message nodes matched)',
      legacyErrorSnippet: errLegacy ? errLegacy.replace(/\s+/g, ' ').trim().slice(0, 300) : null,
    });

    if (isSinoeVerboseLog() && feedback.parts.length) {
      sinoeLogInfo('login: feedback detail', { parts: feedback.parts });
    }

    const errBlob = [errLegacy, feedback.joined].filter(Boolean).join(' ');
    if (looksLikeLoginFailureMessage(errBlob)) {
      sinoeLogWarn(`login: retry — matched failure text (${attempt}/${MAX_ATTEMPTS})`);
      continue;
    }

    sinoeLogWarn('login: no recognizable error text (CAPTCHA wrong, silent fail, or new UI)', {
      hint: 'Check feedbackPreview above; set SINOE_DEBUG=true for full parts',
    });
  }

  throw new Error(
    `SINOE login failed after ${MAX_ATTEMPTS} attempts. Last feedback: ${lastFeedback.slice(0, 1500) || '(empty)'}`,
  );
}
