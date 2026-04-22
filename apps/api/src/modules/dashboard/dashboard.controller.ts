import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('trackables-by-status')
  async trackablesByStatus(@CurrentUser() user: any, @Query('trackableId') trackableId?: string) {
    return this.service.getTrackablesByStatus(user.organizationId, trackableId);
  }

  @Get('workflow-items-by-status')
  async workflowItemsByStatus(@CurrentUser() user: any, @Query('trackableId') trackableId?: string) {
    if (!trackableId) {
      throw new BadRequestException('trackableId is required');
    }
    return this.service.getWorkflowItemsByStatus(user.organizationId, trackableId);
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

  @Get('home')
  async home(@CurrentUser() user: { organizationId: string; id: string }) {
    return this.service.getHomeDashboard(user.organizationId, user.id);
  }

  @Get('calendar-workflow-items')
  async calendarWorkflowItems(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (!from || !to || !iso.test(from) || !iso.test(to)) {
      throw new BadRequestException('from and to are required as YYYY-MM-DD');
    }
    const fromMs = Date.parse(`${from}T12:00:00`);
    const toMs = Date.parse(`${to}T12:00:00`);
    if (Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs > toMs) {
      throw new BadRequestException('invalid from/to range');
    }
    const maxDays = 400;
    const spanDays = (toMs - fromMs) / (24 * 60 * 60 * 1000) + 1;
    if (spanDays > maxDays) {
      throw new BadRequestException(`date range must be at most ${maxDays} days`);
    }
    return this.service.getCalendarWorkflowItems(user.organizationId, from, to);
  }

  @Get('global-actions')
  async globalActions(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('assignedTo') assignedToId?: string,
    /** @deprecated use `kind` */
    @Query('itemType') itemType?: string,
    @Query('kind') kind?: string,
    @Query('overdue') overdue?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('trackableId') trackableId?: string,
  ) {
    return this.service.getGlobalActions(user.organizationId, {
      status,
      assignedToId,
      kind: kind || itemType,
      overdue: overdue === 'true',
      page,
      limit,
      trackableId,
    });
  }
}
