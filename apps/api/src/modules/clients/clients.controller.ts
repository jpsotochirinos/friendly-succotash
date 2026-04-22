import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @RequirePermissions('trackable:read')
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('search') search?: string,
  ) {
    return this.clientsService.findAllForOrg(
      { page, limit, sortBy, sortOrder },
      search,
    );
  }

  @Get(':id')
  @RequirePermissions('trackable:read')
  async findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Post()
  @RequirePermissions('trackable:create')
  async create(@Body() dto: CreateClientDto, @CurrentUser() user: any) {
    return this.clientsService.createForOrg(dto, user.organizationId);
  }

  @Patch(':id')
  @RequirePermissions('trackable:update')
  async update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.updateClient(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('trackable:delete')
  async remove(@Param('id') id: string) {
    await this.clientsService.remove(id);
    return { ok: true };
  }
}
