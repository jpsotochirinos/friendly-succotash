import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LegalProcessSinoeMatcherService } from './modules/legal/services/legal-process-sinoe-matcher.service';

let app: INestApplicationContext;

/**
 * Used by `apps/worker` BullMQ `sinoe-match` so matching runs outside the API process.
 * Requires API dist built (`pnpm --filter @tracker/api build`) when the worker loads from `api/dist/`.
 */
export async function runSinoeMatchFromWorker(data: {
  organizationId: string;
  notificationId: string;
}): Promise<boolean> {
  // Never register the opt-in API BullMQ consumer inside this process (would double-consume the queue).
  process.env.DISABLE_SINOE_MATCH_WORKER = 'true';
  if (!app) {
    app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  }
  const matcher = app.get(LegalProcessSinoeMatcherService);
  return matcher.processJob(data.organizationId, data.notificationId);
}
