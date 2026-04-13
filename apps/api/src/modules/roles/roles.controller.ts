import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('role:manage')
  async findAll(@CurrentUser() user: any) {
    return this.rolesService.findAll(user.organizationId);
  }

  @Get('permissions')
  @RequirePermissions('role:manage')
  async getPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Get(':id')
  @RequirePermissions('role:manage')
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @RequirePermissions('role:manage')
  async create(
    @Body() dto: { name: string; description?: string; permissionIds: string[] },
    @CurrentUser() user: any,
  ) {
    return this.rolesService.create({
      ...dto,
      organizationId: user.organizationId,
    });
  }

  @Patch(':id')
  @RequirePermissions('role:manage')
  async update(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string; permissionIds?: string[] },
  ) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('role:manage')
  async remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
