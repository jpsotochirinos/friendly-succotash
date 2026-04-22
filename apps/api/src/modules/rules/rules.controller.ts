import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CreateWorkflowRuleDto } from './dto/create-workflow-rule.dto';
import { WorkflowRulesAdminService } from './workflow-rules-admin.service';

@Controller('workflow-rules')
export class RulesController {
  constructor(private readonly rules: WorkflowRulesAdminService) {}

  @Get()
  @RequirePermissions('workflow:update')
  async list(@CurrentUser() user: { organizationId: string }) {
    return this.rules.list(user.organizationId);
  }

  @Post()
  @RequirePermissions('workflow:update')
  async create(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: CreateWorkflowRuleDto,
  ) {
    return this.rules.create(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions('workflow:update')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { organizationId: string },
    @Body() dto: Partial<CreateWorkflowRuleDto>,
  ) {
    return this.rules.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('workflow:update')
  async remove(@Param('id') id: string, @CurrentUser() user: { organizationId: string }) {
    await this.rules.remove(user.organizationId, id);
    return { ok: true };
  }
}
