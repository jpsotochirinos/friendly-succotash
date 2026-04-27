#!/usr/bin/env node
/**
 * Prueba de envío transaccional vía Brevo usando el mismo stack que la API.
 *
 * Uso (desde la raíz del monorepo):
 *   pnpm test:brevo-email tu@correo.com
 *
 * Requiere en .env: EMAIL_PROVIDER=brevo, BREVO_API_KEY, y EMAIL_FROM o SMTP_FROM
 * con un remitente autorizado en Brevo. Node 20+ (carga .env vía pnpm).
 */
import { createEmailProviderFromProcessEnv } from '../packages/email/dist/index.js';

const to = process.argv[2];
if (!to || !to.includes('@')) {
  console.error('Uso: pnpm test:brevo-email <email-destino>');
  process.exit(1);
}

const p = (process.env.EMAIL_PROVIDER ?? 'smtp').toLowerCase();
if (p !== 'brevo' && p !== 'sendinblue') {
  console.error(
    `EMAIL_PROVIDER es "${p}". Pon EMAIL_PROVIDER=brevo (o sendinblue) y BREVO_API_KEY en .env`,
  );
  process.exit(1);
}
if (!String(process.env.BREVO_API_KEY ?? '').trim()) {
  console.error('Falta BREVO_API_KEY en el entorno (.env).');
  process.exit(1);
}

const provider = createEmailProviderFromProcessEnv(process.env);
const from =
  process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@tracker.local';
const result = await provider.sendMail({
  to: { email: to },
  subject: 'Prueba Alega — Brevo',
  html: `<p>Mensaje de prueba enviado con <code>${provider.id}</code> desde el script <code>scripts/test-brevo-email.mjs</code>.</p>`,
  text: `Prueba Alega — Brevo (${provider.id})`,
});

console.log('OK', JSON.stringify(result, null, 0));
