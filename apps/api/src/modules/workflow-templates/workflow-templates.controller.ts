import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { WorkflowTemplatesService } from './workflow-templates.service';
import { CreateWorkflowTemplateDto } from './dto/create-workflow-template.dto';
import { InstantiateWorkflowTemplateDto } from './dto/instantiate-workflow-template.dto';
import { CreateWorkflowTemplateItemDto } from './dto/create-workflow-template-item.dto';
import { UpdateWorkflowTemplateItemDto } from './dto/update-workflow-template-item.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { MatterType } from '@tracker/shared';

@Controller('workflow-templates')
export class WorkflowTemplatesController {
  constructor(private readonly service: WorkflowTemplatesService) {}

  @Get()
  @RequirePermissions('workflow_template:read')
  async list(
    @CurrentUser() user: { organizationId: string },
    @Query('q') q?: string,
    @Query('matterType') matterType?: MatterType,
    @Query('includeSystem') includeSystem?: string,
  ) {
    return this.service.list(user.organizationId, {
      q,
      matterType,
      includeSystem: includeSystem !== 'false',
    });
  }

  @Post()
  @RequirePermissions('workflow_template:manage')
  async create(
    @Body() dto: CreateWorkflowTemplateDto,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.service.create(dto, user.organizationId);
  }

  @Patch(':id')
  @RequirePermissions('workflow_template:manage')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateWorkflowTemplateDto>,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.service.update(id, dto, user.organizationId);
  }

  @Delete(':id')
  @RequirePermissions('workflow_template:manage')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { organizationId: string },
  ) {
    await this.service.remove(id, user.organizationId);
    return { success: true };
  }

  @Post(':id/instantiate')
  @RequirePermissions('workflow_item:create')
  async instantiate(
    @Param('id') id: string,
    @Body() body: InstantiateWorkflowTemplateDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.service.instantiate(
      id,
      body.trackableId,
      user.organizationId,
      body.startDate,
      user.id,
    );
  }

  @Post(':id/items')
  @RequirePermissions('workflow_template:manage')
  async createItem(
    @Param('id') id: string,
    @Body() dto: CreateWorkflowTemplateItemDto,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.service.createItem(id, user.organizationId, dto);
  }

  @Patch(':id/items/:itemId')
  @RequirePermissions('workflow_template:manage')
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateWorkflowTemplateItemDto,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.service.updateItem(id, itemId, user.organizationId, dto);
  }

  @Delete(':id/items/:itemId')
  @RequirePermissions('workflow_template:manage')
  async removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: { organizationId: string },
  ) {
    await this.service.removeItem(id, itemId, user.organizationId);
    return { success: true };
  }

  @Get(':id')
  @RequirePermissions('workflow_template:read')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.service.findOne(id, user.organizationId);
  }
}
