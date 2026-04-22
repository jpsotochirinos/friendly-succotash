import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EntityManager } from '@mikro-orm/postgresql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('scraping')
export class ScrapingController {
  private queue: Queue;

  constructor(private readonly em: EntityManager) {
    this.queue = new Queue('scraping', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    });
  }

  @Post('trigger')
  @RequirePermissions('scraping:trigger')
  async triggerScraping(
    @Body() dto: {
      sourceType: 'source_a' | 'source_c' | 'sinoe';
      trackableId?: string;
      url?: string;
    },
    @CurrentUser() user: any,
  ) {
    const job = await this.queue.add(`scrape-${dto.sourceType}`, {
      sourceType: dto.sourceType,
      config:
        dto.sourceType === 'sinoe'
          ? {
              userId: user.id,
              organizationId: user.organizationId,
            }
          : {
              url: dto.url,
              trackableId: dto.trackableId,
              organizationId: user.organizationId,
            },
    });

    return { message: 'Scraping job queued', jobId: job.id };
  }

  @Get('status/:jobId')
  @RequirePermissions('scraping:trigger')
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) return { status: 'not_found' };

    const state = await job.getState();
    const progress = job.progress;

    return {
      id: job.id,
      status: state,
      progress,
      data: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  @Get('external-sources')
  @RequirePermissions('trackable:read')
  async getExternalSources(
    @Query('trackableId') trackableId?: string,
    @Query('sourceType') sourceType?: string,
  ) {
    const where: any = {};
    if (trackableId) where.trackable = trackableId;
    if (sourceType) where.sourceType = sourceType;

    return this.em.find('ExternalSource', where, {
      orderBy: { lastCheckedAt: 'DESC' } as any,
      limit: 50,
    });
  }

  @Post('cron/update')
  @RequirePermissions('org:manage')
  async updateCronSchedule(
    @Body() dto: { sourceType: string; cronPattern: string },
  ) {
    await this.queue.upsertJobScheduler(
      `${dto.sourceType}-cron`,
      { pattern: dto.cronPattern },
      {
        name: `scrape-${dto.sourceType}`,
        data: {
          sourceType: dto.sourceType,
          config: {},
        },
      },
    );

    return { message: `Cron updated to: ${dto.cronPattern}` };
  }
}
