import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('trackables-by-status')
  async trackablesByStatus(@CurrentUser() user: any, @Query('trackableId') trackableId?: string) {
    return this.service.getTrackablesByStatus(user.organizationId, trackableId);
  }

  @Get('upcoming-deadlines')
  async upcomingDeadlines(
    @CurrentUser() user: any,
    @Query('days') days?: number,
    @Query('trackableId') trackableId?: string,
  ) {
    return this.service.getUpcomingDeadlines(user.organizationId, days || 14, trackableId);
  }

  @Get('overdue')
  async overdue(@CurrentUser() user: any, @Query('trackableId') trackableId?: string) {
    return this.service.getOverdueItems(user.organizationId, trackableId);
  }

  @Get('workload')
  async workload(@CurrentUser() user: any, @Query('trackableId') trackableId?: string) {
    return this.service.getWorkloadByUser(user.organizationId, trackableId);
  }

  @Get('progress')
  async progress(@CurrentUser() user: any, @Query('trackableId') trackableId?: string) {
    return this.service.getProgressByTrackable(user.organizationId, trackableId);
  }

  @Get('recent-activity')
  async recentActivity(@CurrentUser() user: any, @Query('limit') limit?: number) {
    return this.service.getRecentActivity(user.organizationId, limit || 20);
  }

  @Get('global-actions')
  async globalActions(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('assignedTo') assignedToId?: string,
    @Query('itemType') itemType?: string,
    @Query('overdue') overdue?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('trackableId') trackableId?: string,
  ) {
    return this.service.getGlobalActions(user.organizationId, {
      status,
      assignedToId,
      itemType,
      overdue: overdue === 'true',
      page,
      limit,
      trackableId,
    });
  }
}
