import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('user:create')
  async create(@Body() dto: any, @CurrentUser() user: any) {
    return this.usersService.createUser({
      ...dto,
      organizationId: user.organizationId,
    });
  }

  @Get()
  @RequirePermissions('user:read')
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.usersService.findAll({}, { page, limit }, { populate: ['role'] as any });
  }

  @Get(':id')
  @RequirePermissions('user:read')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id, { populate: ['role'] as any });
  }

  @Patch(':id')
  @RequirePermissions('user:update')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('user:delete')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
