import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_NAME: z.string().default('tracker_db'),
  DATABASE_USER: z.string().default('tracker_user'),
  DATABASE_PASSWORD: z.string().default('tracker_pass'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET: z.string().default('tracker-storage'),
  MINIO_USE_SSL: z.coerce.boolean().default(false),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  MAGIC_LINK_SECRET: z.string().min(16),
  MAGIC_LINK_EXPIRES_IN: z.string().default('15m'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().default('noreply@tracker.local'),

  EMAIL_PROVIDER: z.enum(['smtp', 'brevo', 'sendgrid', 'sendinblue']).default('smtp'),
  /** Overrides SMTP_FROM for From when set (Brevo/SendGrid friendly). */
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  EMAIL_REPLY_TO: z.string().email().optional(),
  BREVO_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),

  APP_PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  /** @deprecated Prefer TWILIO_WEBHOOK_BASE_URL; misma idea: URL pública (ngrok) para firmas Twilio. */
  APP_URL_NGROK: z.string().url().optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  SCRAPING_DEFAULT_CRON: z.string().default('0 */6 * * *'),
  SOURCE_A_URL: z.string().url().optional(),
  SOURCE_C_URL: z.string().url().optional(),

  /** 32-byte AES key (hex 64 chars or base64) for SINOE credential envelopes. Required to store credentials in production. */
  SINOE_CREDENTIALS_KEY: z.string().optional(),
  SINOE_BASE_URL: z.string().url().optional(),
  SINOE_SCRAPE_CRON: z.string().default('0 */4 * * *'),
  /** false / 0 / off: el worker no programa el cron de dispatch SINOE. */
  SINOE_SCRAPE_ENABLED: z.string().optional(),

  WHATSAPP_PROVIDER: z.enum(['twilio', 'dialog360', 'meta']).default('twilio'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().default('whatsapp:+14155238886'),
  /** Base URL pública (ej. ngrok) donde Twilio hace POST a /api/whatsapp/webhook; la firma usa esta URL. Si omites, se usa APP_URL. */
  TWILIO_WEBHOOK_BASE_URL: z.string().url().optional(),
  DIALOG360_API_KEY: z.string().optional(),
  DIALOG360_WEBHOOK_URL: z.string().url().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  WHATSAPP_FAILOVER_THRESHOLD: z.coerce.number().default(3),
  WHATSAPP_FAILOVER_RECOVERY_MS: z.coerce.number().default(300_000),

  WHATSAPP_BRIEFING_CRON: z.string().default('0 * * * *'),
  WHATSAPP_ACTIVITY_CLEANUP_CRON: z.string().default('5 2 * * *'),

  /** RFC 3161 TSA HTTP endpoint (FreeTSA or compatible). */
  TSA_URL: z.string().url().default('https://freetsa.org/tsr'),
  /** Public app URL for verification QR and external sign links. */
  APP_PUBLIC_URL: z.string().url().default('http://localhost:5173'),
  SIGNATURE_EXTERNAL_TOKEN_EXPIRY_HOURS: z.coerce.number().default(72),
  SIGNATURE_OTP_EXPIRY_MINUTES: z.coerce.number().default(10),
  SIGNATURE_OTP_MAX_ATTEMPTS: z.coerce.number().default(3),
  /**
   * When true, also sends the OTP to WhatsApp if a number is resolvable
   * (internal signer: verified WhatsApp user; external: externalPhone).
   */
  SIGNATURE_OTP_WHATSAPP_ENABLED: z.coerce.boolean().default(true),
  /**
   * Gotenberg base URL (e.g. http://localhost:3001) for DOCX→PDF in the worker.
   * When set, the worker uses HTTP (`/forms/libreoffice/convert`) instead of spawning LibreOffice.
   */
  GOTENBERG_URL: z.string().url().optional(),
  /** CLI for `soffice` / `libreoffice` when GOTENBERG_URL is not set. */
  LIBREOFFICE_BIN: z.string().default('libreoffice'),
  /** Cron for expiring pending signature requests (BullMQ scheduler pattern). */
  SIGNATURE_EXPIRE_CRON: z.string().default('0 1 * * *'),
});

export type EnvConfig = z.infer<typeof envSchema>;
