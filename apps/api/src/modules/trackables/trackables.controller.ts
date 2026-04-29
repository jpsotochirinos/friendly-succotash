import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
} from '@nestjs/common';
import { TrackablesService } from './trackables.service';
import { WorkflowService } from '../workflow/workflow.service';
import { CreateTrackableDto } from './dto/create-trackable.dto';
import { UpdateTrackableDto } from './dto/update-trackable.dto';
import { CreateTrackablePartyDto, UpdateTrackablePartyDto } from './dto/trackable-party.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { TrackableListingUrgency, TrackableStatus } from '@tracker/shared';

function splitMulti(v?: string | string[]): string[] | undefined {
  if (v == null) return undefined;
  const arr = Array.isArray(v) ? v : String(v).split(',');
  const out = arr.map((s) => s.trim()).filter(Boolean);
  return out.length ? out : undefined;
}

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

  @Get('list')
  @RequirePermissions('trackable:read')
  async listCursor(
    @CurrentUser() user: any,
    @Query('scope') scope?: 'active' | 'archived',
    @Query('status') status?: TrackableStatus,
    @Query('tipo') tipo?: string | string[],
    @Query('materia') materia?: string | string[],
    @Query('asignadoId') asignadoId?: string | string[],
    @Query('clienteId') clienteId?: string | string[],
    @Query('search') search?: string,
    @Query('urgencia') urgencia?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    const urg = urgencia as TrackableListingUrgency | undefined;
    const urgency =
      urg && Object.values(TrackableListingUrgency).includes(urg) ? urg : undefined;
    return this.trackablesService.findListingCursor(user.organizationId, {
      scope,
      status,
      types: splitMulti(tipo),
      matterTypes: splitMulti(materia),
      assignedToIds: splitMulti(asignadoId),
      clientIds: splitMulti(clienteId),
      search,
      urgency,
      sortBy,
      sortDir,
      cursor,
      limit,
    });
  }

  @Get('filters/options')
  @RequirePermissions('trackable:read')
  async listingFilterOptions(@CurrentUser() user: any) {
    return this.trackablesService.getListingFilterOptions(user.organizationId);
  }

  @Get('views')
  @RequirePermissions('trackable:read')
  async listViews(@CurrentUser() user: any) {
    return this.trackablesService.listSavedViews(user.organizationId, user.id);
  }

  @Post('views')
  @RequirePermissions('trackable:read')
  async createView(
    @CurrentUser() user: any,
    @Body() body: { name: string; slug?: string; config: Record<string, unknown>; isShared?: boolean },
  ) {
    return this.trackablesService.createSavedView(
      user.organizationId,
      user.id,
      body,
      Array.isArray(user.permissions) ? user.permissions : [],
    );
  }

  @Patch('views/:viewId')
  @RequirePermissions('trackable:read')
  async patchView(
    @CurrentUser() user: any,
    @Param('viewId') viewId: string,
    @Body() body: Partial<{ name: string; slug: string; config: Record<string, unknown>; isShared: boolean; isFavorite: boolean }>,
  ) {
    return this.trackablesService.updateSavedView(
      user.organizationId,
      user.id,
      viewId,
      body,
      Array.isArray(user.permissions) ? user.permissions : [],
    );
  }

  @Delete('views/:viewId')
  @RequirePermissions('trackable:read')
  async deleteView(@CurrentUser() user: any, @Param('viewId') viewId: string) {
    return this.trackablesService.deleteSavedView(user.organizationId, user.id, viewId);
  }

  @Post('bulk')
  @RequirePermissions('trackable:update')
  async bulkStub() {
    return this.trackablesService.stubBulkOperations();
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
    @Query('scope') scope?: 'active' | 'archived',
    @Query('activityFilter') activityFilter?: 'total' | 'urgentToday' | 'overdue' | 'next14Days',
  ) {
    return this.trackablesService.findByFilters(
      user.organizationId,
      { page, limit, sortBy, sortOrder },
      { scope: scope ?? 'active', status, type, assignedToId, search, activityFilter },
    );
  }

  @Get(':id/parties')
  @RequirePermissions('trackable:read')
  async listParties(@Param('id') id: string) {
    return this.trackablesService.listParties(id);
  }

  @Post(':id/parties')
  @RequirePermissions('trackable:update')
  async createParty(
    @Param('id') id: string,
    @Body() dto: CreateTrackablePartyDto,
    @CurrentUser() user: any,
  ) {
    return this.trackablesService.createParty(id, dto, user.organizationId);
  }

  @Patch(':id/parties/:partyId')
  @RequirePermissions('trackable:update')
  async updateParty(
    @Param('id') id: string,
    @Param('partyId') partyId: string,
    @Body() dto: UpdateTrackablePartyDto,
  ) {
    return this.trackablesService.updateParty(id, partyId, dto);
  }

  @Delete(':id/parties/:partyId')
  @RequirePermissions('trackable:update')
  async removeParty(@Param('id') id: string, @Param('partyId') partyId: string) {
    await this.trackablesService.removeParty(id, partyId);
    return { ok: true };
  }

  @Get(':id')
  @RequirePermissions('trackable:read')
  async findOne(@Param('id') id: string) {
    return this.trackablesService.findOneWithBlueprintData(id, {
      populate: ['createdBy', 'assignedTo', 'folders', 'client'] as any,
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
    return this.trackablesService.patchTrackable(id, dto);
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
