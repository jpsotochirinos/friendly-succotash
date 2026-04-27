import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAnyPermission } from '../auth/decorators/permissions.decorator';
import { WorkflowDefinitionsService } from './workflow-definitions.service';

/**
 * Read-only HTTP API for workflow definitions (used by Expediente actuaciones legacy UI).
 * Admin CRUD was removed; manage definitions via DB seeds / internal services.
 */
@Controller('workflow-definitions')
export class WorkflowDefinitionsController {
  constructor(private readonly svc: WorkflowDefinitionsService) {}

  @Get()
  @RequireAnyPermission('trackable:read', 'workflow_item:read', 'workflow:update')
  async list(@CurrentUser() user: { organizationId: string }) {
    return this.svc.list(user.organizationId);
  }

  @Get(':id')
  @RequireAnyPermission('trackable:read', 'workflow_item:read', 'workflow:update')
  async getOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.svc.getOne(user.organizationId, id);
  }
}
