import type { EmailProviderId } from './types';

/**
 * Subset of process.env / ConfigService used to build providers.
 * Keys mirror env.schema in @tracker/config.
 */
export interface EmailEnv {
  EMAIL_PROVIDER?: string;
  EMAIL_FROM?: string;
  SMTP_FROM?: string;
  EMAIL_FROM_NAME?: string;
  EMAIL_REPLY_TO?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string | number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  BREVO_API_KEY?: string;
  SENDGRID_API_KEY?: string;
}

export function getEmailProviderKind(env: EmailEnv): EmailProviderId {
  const p = (env.EMAIL_PROVIDER ?? 'smtp').toLowerCase().trim();
  if (p === 'brevo' || p === 'sendinblue') return 'brevo';
  if (p === 'sendgrid') return 'sendgrid';
  return 'smtp';
}

export function resolveDefaultFrom(env: EmailEnv): string {
  return env.EMAIL_FROM || env.SMTP_FROM || 'noreply@tracker.local';
}
