import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UploadedFile, UseInterceptors, Res, StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { SaveEditorContentDto } from './dto/save-editor.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @RequirePermissions('document:create')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: {
      title: string;
      folderId: string;
      trackableId: string;
      workflowItemId?: string;
      isTemplate?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.documentsService.uploadDocument(file, {
      title: dto.title,
      folderId: dto.folderId,
      trackableId: dto.trackableId,
      workflowItemId: dto.workflowItemId,
      organizationId: user.organizationId,
      userId: user.id,
      isTemplate: dto.isTemplate === 'true',
    });
  }

  @Post('create-blank')
  @RequirePermissions('document:create')
  async createBlankDocument(
    @Body() dto: {
      title: string;
      folderId: string;
      trackableId: string;
      workflowItemId?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.documentsService.createBlankDocument({
      ...dto,
      organizationId: user.organizationId,
      userId: user.id,
    });
  }

  @Post(':id/version')
  @RequirePermissions('document:update')
  @UseInterceptors(FileInterceptor('file'))
  async uploadNewVersion(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.createNewVersion(
      id, file, user.id, user.organizationId,
    );
  }

  @Post(':id/copy')
  @RequirePermissions('document:create')
  async copyAsTemplate(
    @Param('id') sourceId: string,
    @Body() dto: { targetFolderId: string; targetWorkflowItemId?: string; trackableId: string },
    @CurrentUser() user: any,
  ) {
    return this.documentsService.copyAsTemplate(
      sourceId,
      dto.targetFolderId,
      dto.targetWorkflowItemId,
      user.id,
      user.organizationId,
      dto.trackableId,
    );
  }

  @Post(':id/export-docx')
  @RequirePermissions('document:read')
  async exportDocx(
    @Param('id') id: string,
    @Body('editorContent') editorContent: Record<string, unknown>,
    @Res() res: Response,
  ) {
    res.json({ message: 'Export handled client-side via SuperDoc' });
  }

  @Get(':id/download')
  @RequirePermissions('document:read')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename, mimeType } = await this.documentsService.downloadDocument(id);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get(':id/versions')
  @RequirePermissions('document:read')
  async getVersions(@Param('id') id: string) {
    return this.documentsService.getVersions(id);
  }

  @Get(':id/editor-content')
  @RequirePermissions('document:read')
  async getEditorContent(@Param('id') id: string) {
    const doc = await this.documentsService.findOne(id);
    if (doc.minioKey) {
      const buffer = await this.documentsService.downloadDocumentBuffer(id);
      return {
        documentId: id,
        title: doc.title,
        filename: doc.filename,
        reviewStatus: doc.reviewStatus,
        buffer: buffer.toString('base64'),
        mimeType: doc.mimeType,
      };
    }
    return { documentId: id, title: doc.title, reviewStatus: doc.reviewStatus };
  }

  @Get('trash/list')
  @RequirePermissions('document:read')
  async getTrash(@CurrentUser() user: any) {
    return this.documentsService.findTrashed(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('document:read')
  async findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id, {
      populate: ['folder', 'workflowItem', 'uploadedBy', 'evaluations'] as any,
    });
  }

  @Get()
  @RequirePermissions('document:read')
  async findAll(
    @Query('folderId') folderId?: string,
    @Query('workflowItemId') workflowItemId?: string,
    @Query('isTemplate') isTemplate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const where: any = { deletedAt: null };
    if (folderId) where.folder = folderId;
    if (workflowItemId) where.workflowItem = workflowItemId;
    if (isTemplate !== undefined) where.isTemplate = isTemplate === 'true';

    return this.documentsService.findAll(where, { page, limit }, {
      populate: ['uploadedBy'] as any,
    });
  }

  @Patch(':id')
  @RequirePermissions('document:update')
  async update(
    @Param('id') id: string,
    @Body() dto: { title?: string; reviewStatus?: string; isTemplate?: boolean; tags?: string[] },
  ) {
    return this.documentsService.update(id, dto as any);
  }

  @Patch(':id/editor-content')
  @RequirePermissions('document:update')
  async saveEditorContent(
    @Param('id') id: string,
    @Body() dto: SaveEditorContentDto,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.saveEditorContent(id, dto, user.id, user.organizationId);
  }

  @Post(':id/evaluate')
  @RequirePermissions('document:update')
  async evaluate(@Param('id') id: string) {
    return this.documentsService.enqueueEvaluation(id);
  }

  @Get(':id/evaluations')
  @RequirePermissions('document:read')
  async getEvaluations(@Param('id') id: string) {
    return this.documentsService.getEvaluations(id);
  }

  @Delete(':id')
  @RequirePermissions('document:delete')
  async remove(@Param('id') id: string) {
    return this.documentsService.softRemove(id);
  }

  @Post(':id/restore')
  @RequirePermissions('document:update')
  async restore(@Param('id') id: string) {
    return this.documentsService.restore(id);
  }

  @Delete(':id/permanent')
  @RequirePermissions('document:delete')
  async permanentRemove(@Param('id') id: string) {
    return this.documentsService.permanentRemove(id);
  }
}
