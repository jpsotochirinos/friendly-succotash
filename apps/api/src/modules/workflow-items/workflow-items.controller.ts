import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { WorkflowItemsService } from './workflow-items.service';
import { WorkflowService } from '../workflow/workflow.service';
import { CreateWorkflowItemDto } from './dto/create-workflow-item.dto';
import { CreateWorkflowItemCommentDto } from './dto/create-workflow-item-comment.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAnyPermission, RequirePermissions } from '../auth/decorators/permissions.decorator';
import { WorkflowItemStatus, WorkflowStateCategory } from '@tracker/shared';

@Controller('workflow-items')
export class WorkflowItemsController {
  constructor(
    private readonly itemsService: WorkflowItemsService,
    private readonly workflowService: WorkflowService,
  ) {}

  @Post()
  @RequirePermissions('workflow_item:create')
  async create(@Body() dto: CreateWorkflowItemDto, @CurrentUser() user: any) {
    return this.itemsService.createItem(dto, user.organizationId, user.id, { creationSource: 'user' });
  }

  @Get(':id/comments')
  @RequirePermissions('workflow_item:read')
  async listComments(@Param('id') id: string, @CurrentUser() user: any) {
    return this.itemsService.listComments(id, user.organizationId);
  }

  @Post(':id/comments')
  @RequireAnyPermission('workflow_item:comment', 'workflow_item:update')
  async addComment(
    @Param('id') id: string,
    @Body() dto: CreateWorkflowItemCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.itemsService.addComment(id, user.id, user.organizationId, dto.body);
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

  @Get(':id/category-transitions')
  @RequirePermissions('workflow_item:read')
  async getCategoryTransitions(
    @Param('id') id: string,
    @Query('category') category: string,
    @CurrentUser() user: any,
  ) {
    const valid = Object.values(WorkflowStateCategory) as string[];
    if (!category || !valid.includes(category)) {
      throw new BadRequestException('Query parameter category must be a WorkflowStateCategory');
    }
    return this.workflowService.getTransitionsToCategory(
      id,
      category as WorkflowStateCategory,
      user.permissions,
    );
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
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateWorkflowItemDto>,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.itemsService.updateItem(id, dto, user.organizationId);
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
