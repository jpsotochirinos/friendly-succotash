import type { ConfigService } from '@nestjs/config';
import type { EmailEnv } from '@tracker/email';

export function buildEmailEnvFromConfig(cfg: ConfigService): EmailEnv {
  return {
    EMAIL_PROVIDER: cfg.get<string>('EMAIL_PROVIDER') ?? undefined,
    EMAIL_FROM: cfg.get<string>('EMAIL_FROM') ?? undefined,
    SMTP_FROM: cfg.get<string>('SMTP_FROM') ?? undefined,
    EMAIL_FROM_NAME: cfg.get<string>('EMAIL_FROM_NAME') ?? undefined,
    EMAIL_REPLY_TO: cfg.get<string>('EMAIL_REPLY_TO') ?? undefined,
    SMTP_HOST: cfg.get<string>('SMTP_HOST') ?? undefined,
    SMTP_PORT: cfg.get('SMTP_PORT') as number | string | undefined,
    SMTP_USER: cfg.get<string>('SMTP_USER') ?? undefined,
    SMTP_PASS: cfg.get<string>('SMTP_PASS') ?? undefined,
    BREVO_API_KEY: cfg.get<string>('BREVO_API_KEY') ?? undefined,
    SENDGRID_API_KEY: cfg.get<string>('SENDGRID_API_KEY') ?? undefined,
  };
}
