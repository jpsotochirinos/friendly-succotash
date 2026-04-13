import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Get('trackable/:trackableId')
  @RequirePermissions('folder:read')
  async getFolderTree(@Param('trackableId') trackableId: string) {
    return this.foldersService.getFolderTree(trackableId);
  }

  @Post()
  @RequirePermissions('folder:create')
  async create(
    @Body() dto: { name: string; trackableId: string; parentId?: string },
    @CurrentUser() user: any,
  ) {
    return this.foldersService.createSubfolder({
      ...dto,
      organizationId: user.organizationId,
    });
  }

  @Patch(':id')
  @RequirePermissions('folder:update')
  async rename(@Param('id') id: string, @Body('name') name: string) {
    return this.foldersService.update(id, { name } as any);
  }

  @Delete(':id')
  @RequirePermissions('folder:delete')
  async remove(@Param('id') id: string) {
    return this.foldersService.remove(id);
  }
}
