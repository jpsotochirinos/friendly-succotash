import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AssistantThreadsService } from './assistant-threads.service';

/**
 * Purga diaria de hilos del asistente inactivos. El umbral se toma de
 * `ASSISTANT_THREAD_RETENTION_DAYS` (default 30 días). 0 desactiva la purga.
 */
@Injectable()
export class AssistantThreadsCleanupScheduler {
  private readonly logger = new Logger(AssistantThreadsCleanupScheduler.name);

  constructor(private readonly threads: AssistantThreadsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanup(): Promise<void> {
    const days = this.threads.getRetentionDays();
    if (!days || days <= 0) return;
    try {
      const deleted = await this.threads.purgeOldThreads(days);
      if (deleted > 0) {
        this.logger.log(`Purged ${deleted} assistant thread(s) older than ${days} day(s).`);
      }
    } catch (err) {
      this.logger.error(
        `Failed to purge assistant threads: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
