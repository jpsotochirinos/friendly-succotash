import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Get('trackable/:trackableId')
  @RequirePermissions('document:read')
  async getFolderTree(@Param('trackableId') trackableId: string) {
    return this.foldersService.getFolderTree(trackableId);
  }

  @Post()
  @RequirePermissions('document:create')
  async createFolder(
    @Body() dto: { name: string; trackableId: string; parentId?: string },
    @CurrentUser() user: any,
  ) {
    return this.foldersService.createSubfolder({
      name: dto.name,
      trackableId: dto.trackableId,
      parentId: dto.parentId,
      organizationId: user.organizationId,
    });
  }

  @Patch('reorder')
  @RequirePermissions('document:update')
  async reorderFolders(@Body() dto: { orderedIds: string[] }) {
    await this.foldersService.reorderFolders(dto.orderedIds);
    return { ok: true };
  }

  @Patch(':id')
  @RequirePermissions('document:update')
  async updateFolder(
    @Param('id') id: string,
    @Body() dto: { name?: string; emoji?: string },
  ) {
    return this.foldersService.updateFolder(id, dto);
  }
}
