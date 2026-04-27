import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAnyPermission, RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CreateActivityInstanceCommentDto } from './dto/create-activity-instance-comment.dto';
import { ProcessTracksService } from './process-tracks.service';

@Controller('process-tracks')
export class ProcessTracksController {
  constructor(
    private readonly processTracks: ProcessTracksService,
  ) {}

  @Post()
  @RequirePermissions('trackable:update')
  async create(
    @Body() body: { trackableId: string; systemBlueprintId?: string },
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    if (body.systemBlueprintId) {
      return this.processTracks.createFromSystemBlueprint(
        body.trackableId,
        body.systemBlueprintId,
        user.organizationId!,
      );
    }
    return this.processTracks.createFreeStyle(body.trackableId, user.organizationId!);
  }

  @Get(':id/resolved')
  @RequirePermissions('trackable:read')
  async getResolved(
    @Param('id') id: string,
    @CurrentUser() user: { organizationId: string | null },
  ) {
    return this.processTracks.getResolvedTree(id, user.organizationId!);
  }

  @Get(':id/deadlines')
  @RequirePermissions('trackable:read')
  async listDeadlines(
    @Param('id') id: string,
    @CurrentUser() user: { organizationId: string | null },
  ) {
    return this.processTracks.listDeadlines(id, user.organizationId!);
  }

  @Get(':id/stages/:stageInstanceId/progress')
  @RequirePermissions('trackable:read')
  async stageProgress(
    @Param('id') id: string,
    @Param('stageInstanceId') stageInstanceId: string,
    @CurrentUser() user: { organizationId: string | null },
  ) {
    return this.processTracks.getStageProgress(id, stageInstanceId, user.organizationId!);
  }

  @Get(':id')
  @RequirePermissions('trackable:read')
  async get(
    @Param('id') id: string,
    @CurrentUser() user: { organizationId: string | null },
  ) {
    return this.processTracks.getOne(id, user.organizationId!);
  }

  @Patch(':id/meta')
  @RequirePermissions('trackable:update')
  async patchTrackMeta(
    @Param('id') id: string,
    @Body()
    body: {
      icon?: string;
      iconColor?: string;
      label?: string;
      metadata?: Record<string, unknown> | null;
    },
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.processTracks.patchTrackMetadata(id, user.organizationId!, body);
  }

  @Get(':id/events')
  @RequirePermissions('trackable:read')
  async events(
    @Param('id') id: string,
    @CurrentUser() user: { organizationId: string | null },
  ) {
    return this.processTracks.listEvents(id, user.organizationId!);
  }

  /** Appends a new PENDING stage at the end of the process track. */
  @Post(':id/stages')
  @RequirePermissions('trackable:update')
  async addStage(
    @Param('id') id: string,
    @Body() body: { stageTemplateCode?: string },
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.processTracks.addStageInstance(id, user.organizationId!, user.id, body);
  }

  @Post(':id/stages/:stageInstanceId/enter')
  @RequirePermissions('trackable:update')
  async enterStage(
    @Param('id') id: string,
    @Param('stageInstanceId') stageInstanceId: string,
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.processTracks.enterStage(id, stageInstanceId, user.organizationId!, user.id);
  }

  @Post(':id/stages/:stageInstanceId/exit')
  @RequirePermissions('trackable:update')
  async exitStage(
    @Param('id') id: string,
    @Param('stageInstanceId') stageInstanceId: string,
    @CurrentUser() user: { organizationId: string | null; id: string },
    @Body() body: { reason?: string },
  ) {
    return this.processTracks.exitStage(id, stageInstanceId, user.organizationId!, user.id, body?.reason);
  }

  @Post(':id/stages/:stageInstanceId/skip')
  @RequirePermissions('trackable:update')
  async skipStage(
    @Param('id') id: string,
    @Param('stageInstanceId') stageInstanceId: string,
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.processTracks.skipStage(id, stageInstanceId, user.organizationId!, user.id);
  }

  @Post(':id/stages/:stageInstanceId/advance')
  @RequirePermissions('trackable:update')
  async advanceStage(
    @Param('id') id: string,
    @Param('stageInstanceId') stageInstanceId: string,
    @Body() body: { pendingActions?: Array<{ activityId: string; action: 'inherit' | 'close' }> },
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.processTracks.advanceStage(
      id,
      stageInstanceId,
      user.organizationId!,
      user.id,
      body ?? {},
    );
  }

  @Post(':id/stages/:stageInstanceId/reopen')
  @RequirePermissions('trackable:update')
  async reopenStage(
    @Param('id') id: string,
    @Param('stageInstanceId') stageInstanceId: string,
    @Body() body: { reason: string },
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.processTracks.reopenStage(id, stageInstanceId, user.organizationId!, user.id, body);
  }

  @Post(':id/stages/:stageInstanceId/close-work')
  @RequirePermissions('trackable:update')
  async closeStageWork(
    @Param('id') id: string,
    @Param('stageInstanceId') stageInstanceId: string,
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.processTracks.closeStageWork(id, stageInstanceId, user.organizationId!, user.id);
  }

  @Post(':id/stages/:stageInstanceId/reopen-work')
  @RequirePermissions('trackable:update')
  async reopenStageWork(
    @Param('id') id: string,
    @Param('stageInstanceId') stageInstanceId: string,
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.processTracks.reopenStageWork(id, stageInstanceId, user.organizationId!, user.id);
  }

  @Patch(':id/stages/:stageInstanceId/meta')
  @RequirePermissions('trackable:update')
  async patchStageMetadata(
    @Param('id') id: string,
    @Param('stageInstanceId') stageInstanceId: string,
    @Body()
    body: {
      label?: string;
      stageColor?: string;
      responsibleUserId?: string | null;
      metadata?: Record<string, unknown> | null;
    },
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.processTracks.patchStageMetadata(
      id,
      stageInstanceId,
      user.organizationId!,
      body,
    );
  }

  @Post(':id/activities')
  @RequirePermissions('trackable:update')
  async createActivity(
    @Param('id') id: string,
    @Body()
    body: {
      stageInstanceId?: string;
      title: string;
      description?: string;
      isMandatory?: boolean;
      dueDate?: string | null;
      startDate?: string | null;
      kind?: string;
      actionType?: string;
      assignedToId?: string | null;
      reviewedById?: string | null;
      parentId?: string | null;
      location?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent' | string;
      allDay?: boolean;
      reminderMinutesBefore?: number[] | null;
      rrule?: string | null;
      isLegalDeadline?: boolean;
      accentColor?: string | null;
      calendarColor?: string | null;
      metadata?: Record<string, unknown> | null;
      secondaryAssigneeIds?: string[];
      workflowId?: string | null;
      currentStateId?: string | null;
      documentTemplateId?: string | null;
      workflowStateCategory?: string;
    },
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.processTracks.createCustomActivity(id, user.organizationId!, user.id, body);
  }

  @Get(':id/activities/:activityId/comments')
  @RequirePermissions('trackable:read')
  async listActivityComments(
    @Param('id') id: string,
    @Param('activityId') activityId: string,
    @CurrentUser() user: { organizationId: string | null },
  ) {
    return this.processTracks.listActivityComments(id, activityId, user.organizationId!);
  }

  @Post(':id/activities/:activityId/comments')
  @RequireAnyPermission('trackable:update', 'workflow_item:comment', 'workflow_item:update')
  async addActivityInstanceComment(
    @Param('id') id: string,
    @Param('activityId') activityId: string,
    @Body() dto: CreateActivityInstanceCommentDto,
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.processTracks.addActivityInstanceComment(
      id,
      activityId,
      user.organizationId!,
      user.id,
      dto.body,
    );
  }

  @Post(':id/activities/:activityId/complete')
  @RequirePermissions('trackable:update')
  async completeActivity(
    @Param('id') id: string,
    @Param('activityId') activityId: string,
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.processTracks.completeActivity(id, activityId, user.organizationId!, user.id);
  }

  @Patch(':id/activities/:activityId')
  @RequirePermissions('trackable:update')
  async patchActivity(
    @Param('id') id: string,
    @Param('activityId') activityId: string,
    @Body()
    body: {
      title?: string;
      description?: string | null;
      dueDate?: string | null;
      startDate?: string | null;
      workflowStateCategory?: string;
      stageInstanceId?: string;
      isMandatory?: boolean;
      kind?: string;
      actionType?: string;
      assignedToId?: string | null;
      reviewedById?: string | null;
      parentId?: string | null;
      location?: string | null;
      priority?: 'low' | 'normal' | 'high' | 'urgent' | string;
      allDay?: boolean;
      reminderMinutesBefore?: number[] | null;
      rrule?: string | null;
      isLegalDeadline?: boolean;
      accentColor?: string | null;
      calendarColor?: string | null;
      metadata?: Record<string, unknown> | null;
      secondaryAssigneeIds?: string[];
      workflowId?: string | null;
      currentStateId?: string | null;
      documentTemplateId?: string | null;
    },
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.processTracks.patchActivity(
      id,
      activityId,
      user.organizationId!,
      {
        title: body.title,
        description: body.description,
        dueDate: body.dueDate,
        startDate: body.startDate,
        workflowStateCategory: body.workflowStateCategory,
        stageInstanceId: body.stageInstanceId,
        isMandatory: body.isMandatory,
        kind: body.kind,
        actionType: body.actionType,
        assignedToId: body.assignedToId,
        reviewedById: body.reviewedById,
        parentId: body.parentId,
        location: body.location,
        priority: body.priority,
        allDay: body.allDay,
        reminderMinutesBefore: body.reminderMinutesBefore,
        rrule: body.rrule,
        isLegalDeadline: body.isLegalDeadline,
        accentColor: body.accentColor,
        calendarColor: body.calendarColor,
        metadata: body.metadata,
        secondaryAssigneeIds: body.secondaryAssigneeIds,
        workflowId: body.workflowId,
        currentStateId: body.currentStateId,
        documentTemplateId: body.documentTemplateId,
      },
      user.id,
    );
  }

  @Delete(':id/activities/:activityId')
  @RequirePermissions('trackable:update')
  async deleteActivity(
    @Param('id') id: string,
    @Param('activityId') activityId: string,
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.processTracks.deleteActivity(id, activityId, user.organizationId!);
  }

  @Patch(':id/deadlines/:deadlineId/override')
  @RequirePermissions('trackable:update')
  async overrideDeadline(
    @Param('id') id: string,
    @Param('deadlineId') deadlineId: string,
    @Body() body: { effectiveDate: string; reason: string },
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.processTracks.overrideEffectiveDeadline(
      id,
      deadlineId,
      user.organizationId!,
      user.id,
      body,
    );
  }

  @Post(':id/deadlines/:deadlineId/revert')
  @RequirePermissions('trackable:update')
  async revertDeadline(
    @Param('id') id: string,
    @Param('deadlineId') deadlineId: string,
    @CurrentUser() user: { organizationId: string | null; id: string },
  ) {
    return this.processTracks.revertDeadlineToLegal(id, deadlineId, user.organizationId!, user.id);
  }
}
