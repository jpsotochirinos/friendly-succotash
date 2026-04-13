import { Controller, Get, Query, Param } from '@nestjs/common';
import { SearchService } from './search.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('documents')
  @RequirePermissions('document:read')
  async searchDocuments(
    @CurrentUser() user: any,
    @Query('q') query: string,
    @Query('isTemplate') isTemplate?: string,
    @Query('trackableId') trackableId?: string,
    @Query('excludeDocId') excludeDocId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.searchService.searchDocuments({
      query: query || '',
      organizationId: user.organizationId,
      isTemplate: isTemplate !== undefined ? isTemplate === 'true' : undefined,
      trackableId,
      excludeDocId,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get('documents/:id/similar')
  @RequirePermissions('document:read')
  async findSimilar(
    @Param('id') documentId: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.findSimilarDocuments(
      documentId,
      user.organizationId,
      limit ? Number(limit) : 10,
    );
  }

  @Get('templates')
  @RequirePermissions('document:read')
  async getTemplates(@CurrentUser() user: any) {
    return this.searchService.getTemplates(user.organizationId);
  }

  @Get('all-documents')
  @RequirePermissions('document:read')
  async listAll(
    @CurrentUser() user: any,
    @Query('isTemplate') isTemplate?: string,
    @Query('tag') tag?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.searchService.listDocuments(
      user.organizationId,
      {
        isTemplate: isTemplate !== undefined ? isTemplate === 'true' : undefined,
        tag,
      },
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
  }
}
