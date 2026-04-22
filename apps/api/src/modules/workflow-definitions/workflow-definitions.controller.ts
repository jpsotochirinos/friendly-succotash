import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { ActionType } from '@tracker/shared';
import { WorkflowStateCategory } from '@tracker/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { WorkflowDefinitionsService } from './workflow-definitions.service';

@Controller('workflow-definitions')
export class WorkflowDefinitionsController {
  constructor(private readonly svc: WorkflowDefinitionsService) {}

  @Get()
  @RequirePermissions('workflow:update')
  async list(@CurrentUser() user: { organizationId: string }) {
    return this.svc.list(user.organizationId);
  }

  @Post('duplicate')
  @RequirePermissions('workflow:update')
  async duplicate(
    @CurrentUser() user: { organizationId: string },
    @Body()
    body: { sourceWorkflowId: string; slug: string; name: string },
  ) {
    return this.svc.duplicateFromSystem(user.organizationId, body.sourceWorkflowId, body.slug, body.name);
  }

  @Post(':id/duplicate')
  @RequirePermissions('workflow:update')
  async duplicateOrg(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() body: { slug: string; name: string },
  ) {
    return this.svc.duplicateFromOrg(user.organizationId, id, body.slug, body.name);
  }

  @Post(':id/states')
  @RequirePermissions('workflow:update')
  async createState(
    @CurrentUser() user: { organizationId: string },
    @Param('id') workflowId: string,
    @Body()
    body: {
      key: string;
      name: string;
      category: WorkflowStateCategory;
      color?: string | null;
      sortOrder?: number;
      isInitial?: boolean;
    },
  ) {
    return this.svc.createState(user.organizationId, workflowId, body);
  }

  @Patch(':id/states/:stateId')
  @RequirePermissions('workflow:update')
  async updateState(
    @CurrentUser() user: { organizationId: string },
    @Param('id') workflowId: string,
    @Param('stateId') stateId: string,
    @Body()
    body: {
      key?: string;
      name?: string;
      category?: WorkflowStateCategory;
      color?: string | null;
      sortOrder?: number;
      isInitial?: boolean;
    },
  ) {
    return this.svc.updateState(user.organizationId, workflowId, stateId, body);
  }

  @Delete(':id/states/:stateId')
  @RequirePermissions('workflow:update')
  async deleteState(
    @CurrentUser() user: { organizationId: string },
    @Param('id') workflowId: string,
    @Param('stateId') stateId: string,
  ) {
    return this.svc.deleteState(user.organizationId, workflowId, stateId);
  }

  @Post(':id/transitions')
  @RequirePermissions('workflow:update')
  async createTransition(
    @CurrentUser() user: { organizationId: string },
    @Param('id') workflowId: string,
    @Body()
    body: { fromStateId: string; toStateId: string; name: string; requiredPermission?: string | null },
  ) {
    return this.svc.createTransition(user.organizationId, workflowId, body);
  }

  @Patch(':id/transitions/:transitionId')
  @RequirePermissions('workflow:update')
  async updateTransition(
    @CurrentUser() user: { organizationId: string },
    @Param('id') workflowId: string,
    @Param('transitionId') transitionId: string,
    @Body() body: { name?: string; requiredPermission?: string | null },
  ) {
    return this.svc.updateTransition(user.organizationId, workflowId, transitionId, body);
  }

  @Delete(':id/transitions/:transitionId')
  @RequirePermissions('workflow:update')
  async deleteTransition(
    @CurrentUser() user: { organizationId: string },
    @Param('id') workflowId: string,
    @Param('transitionId') transitionId: string,
  ) {
    return this.svc.deleteTransition(user.organizationId, workflowId, transitionId);
  }

  @Delete(':id')
  @RequirePermissions('workflow:update')
  async remove(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    await this.svc.removeWorkflow(user.organizationId, id);
    return { ok: true };
  }

  @Get(':id')
  @RequirePermissions('workflow:update')
  async getOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.svc.getOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('workflow:update')
  async patch(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string | null;
      matterType?: string | null;
      actionType?: string | null;
      appliesToAllTypes?: boolean;
    },
  ) {
    return this.svc.patchOrgWorkflow(user.organizationId, id, {
      name: body.name,
      description: body.description,
      matterType: body.matterType as any,
      actionType: body.actionType as ActionType | null,
      appliesToAllTypes: body.appliesToAllTypes,
    });
  }
}
