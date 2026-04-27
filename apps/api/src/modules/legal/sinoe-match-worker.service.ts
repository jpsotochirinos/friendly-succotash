import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Worker } from 'bullmq';
import { LegalProcessSinoeMatcherService } from './services/legal-process-sinoe-matcher.service';

/**
 * @deprecated On the API, this consumer is **opt-in**: set `ENABLE_LEGACY_SINOE_CONSUMER=true` to register it.
 * Default: use `apps/worker` (`sinoe-match.processor.ts` + `sinoe-match-job.handler.js`).
 * If you enable this, set `DISABLE_SINOE_MATCH_WORKER=true` to force-disable (kill switch) without unregistering the class.
 */
@Injectable()
export class SinoeMatchWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SinoeMatchWorkerService.name);
  private worker?: Worker;

  constructor(private readonly matcher: LegalProcessSinoeMatcherService) {}

  onModuleInit(): void {
    if (process.env.DISABLE_SINOE_MATCH_WORKER === 'true') {
      this.logger.warn('SINOE match worker disabled (DISABLE_SINOE_MATCH_WORKER)');
      return;
    }
    this.worker = new Worker(
      'sinoe-match',
      async (job) => {
        const { organizationId, notificationId } = job.data as {
          organizationId: string;
          notificationId: string;
        };
        await this.matcher.processJob(organizationId, notificationId);
      },
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT) || 6379,
        },
      },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.warn(`sinoe-match job ${job?.id} failed: ${err?.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
