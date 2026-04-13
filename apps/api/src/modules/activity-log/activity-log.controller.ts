import { Controller, Get, Query, Param } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ActivityLog } from '@tracker/db';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('activity-log')
export class ActivityLogController {
  constructor(private readonly em: EntityManager) {}

  @Get()
  @RequirePermissions('trackable:read')
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('trackableId') trackableId?: string,
    @Query('entityType') entityType?: string,
  ) {
    const where: any = {};
    if (trackableId) where.trackable = trackableId;
    if (entityType) where.entityType = entityType;

    const offset = (page - 1) * limit;
    const [items, total] = await this.em.findAndCount(ActivityLog, where, {
      orderBy: { createdAt: 'DESC' } as any,
      limit,
      offset,
      populate: ['user'] as any,
    });

    return { data: items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  @Get('trackable/:trackableId')
  @RequirePermissions('trackable:read')
  async findByTrackable(
    @Param('trackableId') trackableId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const offset = (page - 1) * limit;
    const [items, total] = await this.em.findAndCount(
      ActivityLog,
      { trackable: trackableId },
      { orderBy: { createdAt: 'DESC' } as any, limit, offset, populate: ['user'] as any },
    );

    return { data: items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
