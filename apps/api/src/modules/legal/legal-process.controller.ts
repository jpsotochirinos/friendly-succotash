import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LegalProcessTemplateService } from './services/legal-process-template.service';
import { LegalProcessAdvanceService } from './services/legal-process-advance.service';
import { LegalDeadlineService } from './services/legal-deadline.service';
import { InitializeLegalProcessDto } from './dto/initialize-legal-process.dto';
import { RegisterNotificationDateDto } from './dto/register-notification-date.dto';
import { AdvanceStageDto } from './dto/advance-stage.dto';
import { DeadlineTriggerType } from '@tracker/shared';

@Controller('legal/process')
@UseGuards(JwtAuthGuard)
export class LegalProcessController {
  constructor(
    private readonly templateService: LegalProcessTemplateService,
    private readonly advanceService: LegalProcessAdvanceService,
    private readonly deadlineService: LegalDeadlineService,
  ) {}

  @Get('templates')
  async listTemplates() {
    return this.templateService.getAvailableTemplates();
  }

  @Post('initialize')
  async initialize(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: InitializeLegalProcessDto,
  ) {
    return this.templateService.instantiateForTrackable(
      user.organizationId,
      dto.trackableId,
      dto.workflowDefinitionId,
    );
  }

  @Post('advance')
  async advance(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: AdvanceStageDto,
  ) {
    await this.advanceService.advanceManual(
      user.organizationId,
      dto.trackableId,
      dto.targetStateId,
      user.id,
      dto.force ?? false,
    );
    return { ok: true };
  }

  @Post('deadlines/register-notification')
  async registerNotification(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: RegisterNotificationDateDto,
  ) {
    return this.deadlineService.registerNotificationDate(
      user.organizationId,
      dto.trackableId,
      dto.workflowStateId,
      new Date(dto.notificationDate),
      DeadlineTriggerType.MANUAL,
    );
  }

  @Get('deadlines/upcoming')
  async upcomingDeadlines(
    @CurrentUser() user: { organizationId: string },
    @Query('days') days: string = '7',
  ) {
    return this.deadlineService.getUpcoming(
      user.organizationId,
      parseInt(days, 10) || 7,
    );
  }

  @Get('trackables/:id/timeline')
  async timeline(
    @CurrentUser() user: { organizationId: string },
    @Param('id') trackableId: string,
  ) {
    return this.templateService.getTimeline(user.organizationId, trackableId);
  }
}
