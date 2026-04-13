import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
} from '@nestjs/common';
import { WorkflowItemsService } from './workflow-items.service';
import { WorkflowService } from '../workflow/workflow.service';
import { CreateWorkflowItemDto } from './dto/create-workflow-item.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { WorkflowItemStatus } from '@tracker/shared';

@Controller('workflow-items')
export class WorkflowItemsController {
  constructor(
    private readonly itemsService: WorkflowItemsService,
    private readonly workflowService: WorkflowService,
  ) {}

  @Post()
  @RequirePermissions('workflow_item:create')
  async create(@Body() dto: CreateWorkflowItemDto, @CurrentUser() user: any) {
    return this.itemsService.createItem(dto, user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('workflow_item:read')
  async findOne(@Param('id') id: string) {
    return this.itemsService.findOne(id, {
      populate: ['assignedTo', 'reviewedBy', 'children', 'parent', 'trackable'] as any,
    });
  }

  @Get(':id/descendants')
  @RequirePermissions('workflow_item:read')
  async getDescendants(@Param('id') id: string) {
    return this.itemsService.getDescendants(id);
  }

  @Get(':id/transitions')
  @RequirePermissions('workflow_item:read')
  async getAvailableTransitions(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflowService.getAvailableTransitions(id, user.permissions);
  }

  @Patch('reorder')
  @RequirePermissions('workflow_item:update')
  async reorder(
    @Body('items') items: Array<{ id: string; sortOrder: number; parentId?: string }>,
  ) {
    await this.itemsService.reorder(items);
    return { success: true };
  }

  @Patch(':id')
  @RequirePermissions('workflow_item:update')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateWorkflowItemDto>) {
    return this.itemsService.update(id, dto as any);
  }

  @Patch(':id/transition')
  async transition(
    @Param('id') id: string,
    @Body('status') targetStatus: WorkflowItemStatus,
    @CurrentUser() user: any,
  ) {
    return this.workflowService.transitionWorkflowItem(id, targetStatus, {
      userId: user.id,
      organizationId: user.organizationId,
      permissions: user.permissions,
    });
  }

  @Delete(':id')
  @RequirePermissions('workflow_item:delete')
  async remove(@Param('id') id: string) {
    return this.itemsService.remove(id);
  }
}
