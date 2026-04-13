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
  SMTP_FROM: z.string().email().default('noreply@tracker.local'),

  APP_PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  SCRAPING_DEFAULT_CRON: z.string().default('0 */6 * * *'),
  SOURCE_A_URL: z.string().url().optional(),
  SOURCE_C_URL: z.string().url().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;
