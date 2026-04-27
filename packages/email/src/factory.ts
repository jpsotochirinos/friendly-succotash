import { getEmailProviderKind, type EmailEnv } from './env';
import { BrevoProvider } from './providers/brevo.provider';
import { SendGridProvider } from './providers/sendgrid.provider';
import { SmtpProvider } from './providers/smtp.provider';
import type { IEmailProvider } from './types';

/**
 * Picks the concrete Strategy (SMTP, Brevo, SendGrid) from `EMAIL_PROVIDER`.
 * Alias: `sendinblue` is treated as Brevo.
 */
export function createEmailProvider(env: EmailEnv): IEmailProvider {
  const kind = getEmailProviderKind(env);
  switch (kind) {
    case 'brevo':
      return new BrevoProvider(env);
    case 'sendgrid':
      return new SendGridProvider(env);
    default:
      return new SmtpProvider(env);
  }
}

/**
 * Shallow read of `process.env` for worker scripts (non-Nest).
 */
export function createEmailProviderFromProcessEnv(
  e: NodeJS.ProcessEnv = process.env,
): IEmailProvider {
  return createEmailProvider(e as unknown as EmailEnv);
}
