import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
} from '@nestjs/common';
import { TrackablesService } from './trackables.service';
import { WorkflowService } from '../workflow/workflow.service';
import { CreateTrackableDto } from './dto/create-trackable.dto';
import { UpdateTrackableDto } from './dto/update-trackable.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { TrackableStatus } from '@tracker/shared';

@Controller('trackables')
export class TrackablesController {
  constructor(
    private readonly trackablesService: TrackablesService,
    private readonly workflowService: WorkflowService,
  ) {}

  @Post()
  @RequirePermissions('trackable:create')
  async create(
    @Body() dto: CreateTrackableDto,
    @CurrentUser() user: any,
  ) {
    return this.trackablesService.createTrackable(
      dto, user.id, user.organizationId,
    );
  }

  @Get()
  @RequirePermissions('trackable:read')
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('status') status?: TrackableStatus,
    @Query('type') type?: string,
    @Query('assignedTo') assignedToId?: string,
    @Query('search') search?: string,
  ) {
    return this.trackablesService.findByFilters(
      user.organizationId,
      { page, limit, sortBy, sortOrder },
      { status, type, assignedToId, search },
    );
  }

  @Get(':id')
  @RequirePermissions('trackable:read')
  async findOne(@Param('id') id: string) {
    return this.trackablesService.findOne(id, {
      populate: ['createdBy', 'assignedTo', 'folders'] as any,
    });
  }

  @Get(':id/tree')
  @RequirePermissions('trackable:read')
  async getWorkflowTree(@Param('id') id: string) {
    return this.workflowService.getWorkflowTree(id);
  }

  @Patch(':id')
  @RequirePermissions('trackable:update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTrackableDto,
  ) {
    return this.trackablesService.update(id, dto as any);
  }

  @Patch(':id/transition')
  @RequirePermissions('trackable:update')
  async transition(
    @Param('id') id: string,
    @Body('status') targetStatus: TrackableStatus,
    @CurrentUser() user: any,
  ) {
    return this.workflowService.transitionTrackable(id, targetStatus, {
      userId: user.id,
      organizationId: user.organizationId,
      permissions: user.permissions,
    });
  }

  @Delete(':id')
  @RequirePermissions('trackable:delete')
  async remove(@Param('id') id: string) {
    return this.trackablesService.remove(id);
  }
}
