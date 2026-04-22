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
import { SkipActivityLog } from '../../common/interceptors/skip-activity-log.decorator';

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

  @Post('ai/complete')
  @RequirePermissions('document:read')
  @SkipActivityLog()
  async aiComplete(
    @Body() body: { messages: unknown[]; stream?: boolean; options?: Record<string, unknown> },
    @Res() res: Response,
  ) {
    return this.documentsService.aiComplete(body, res);
  }

  @Post(':id/export-docx')
  @RequirePermissions('document:read')
  async exportDocx(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename, mimeType } = await this.documentsService.downloadDocument(id);
    const isWord =
      mimeType.includes('word') ||
      mimeType.includes('wordprocessingml') ||
      filename.toLowerCase().endsWith('.docx');
    if (!isWord) {
      return res.status(400).json({
        message:
          'Este documento no es DOCX. Usá el editor para exportar o convertí el archivo antes de descargar desde el servidor.',
      });
    }
    const safeName = filename.toLowerCase().endsWith('.docx') ? filename : `${filename}.docx`;
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(safeName)}"`,
      'Content-Length': buffer.length,
    });
    return res.send(buffer);
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

  @Get(':id/preview')
  @RequirePermissions('document:read')
  async preview(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.documentsService.findOne(id);

    if (!doc.minioKey) {
      const text = doc.contentText || '';
      const html = `<html><body style="font-family:sans-serif;padding:2rem;white-space:pre-wrap">${text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</body></html>`;
      const buf = Buffer.from(html, 'utf-8');
      res.set({
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.title || 'preview')}.html"`,
        'Content-Length': buf.length,
        'Cache-Control': 'private, max-age=300',
      });
      return res.send(buf);
    }

    const { buffer, filename, mimeType } = await this.documentsService.downloadDocument(id);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'private, max-age=300',
    });
    res.send(buffer);
  }

  @Get(':id/versions')
  @RequirePermissions('document:read')
  async getVersions(@Param('id') id: string) {
    return this.documentsService.getVersions(id);
  }

  @Get(':id/workflow-history')
  @RequirePermissions('document:read')
  async getWorkflowHistory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.getWorkflowHistory(id, user.organizationId);
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

  @Get('review-queue')
  @RequirePermissions('document:read')
  async getReviewQueue(@CurrentUser() user: any) {
    return this.documentsService.findReviewQueue(user.organizationId);
  }

  @Get('trash/list')
  @RequirePermissions('document:read')
  async getTrash(@CurrentUser() user: any) {
    const days = await this.documentsService.resolveTrashRetentionDays(user.organizationId);
    await this.documentsService.purgeExpiredTrashedDocuments(user.organizationId, days);
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
    @Query('trackableId') trackableId?: string,
    @Query('isTemplate') isTemplate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const where: any = { deletedAt: null };
    if (folderId) where.folder = folderId;
    if (workflowItemId) where.workflowItem = workflowItemId;
    if (trackableId && !folderId) {
      where.folder = { trackable: trackableId };
    }
    if (isTemplate !== undefined) where.isTemplate = isTemplate === 'true';

    const populate: string[] = ['uploadedBy'];
    if (folderId || trackableId || workflowItemId) {
      populate.push('workflowItem');
    }
    if (isTemplate === 'true') {
      populate.push('folder', 'folder.trackable');
    }

    const pagination: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'ASC' | 'DESC' } = {
      page,
      limit,
    };
    if (trackableId && !folderId) {
      pagination.sortBy = 'updatedAt';
      pagination.sortOrder = 'DESC';
    }

    return this.documentsService.findAll(where, pagination, {
      populate: populate as any,
    });
  }

  @Patch(':id')
  @RequirePermissions('document:update')
  async update(
    @Param('id') id: string,
    @Body() dto: {
      title?: string;
      reviewStatus?: string;
      isTemplate?: boolean;
      tags?: string[];
      workflowItemId?: string | null;
    },
    @CurrentUser() user: any,
  ) {
    return this.documentsService.patchDocument(id, dto, user.organizationId);
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

  @Post(':id/submit-review')
  @RequirePermissions('document:update')
  async submitForReview(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.submitForReview(id, user.organizationId, user.id);
  }

  @Post(':id/link-workflow-item')
  @RequirePermissions('document:update')
  async linkWorkflowItem(
    @Param('id') id: string,
    @Body() body: { workflowItemId: string | null },
    @CurrentUser() user: any,
  ) {
    return this.documentsService.linkWorkflowItem(id, body.workflowItemId ?? null, user.organizationId);
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

  @Get(':id/evaluation-log')
  @RequirePermissions('document:read')
  async getEvaluationLog(
    @Param('id') id: string,
    @Query('evaluationId') evaluationId?: string,
  ) {
    const log = await this.documentsService.getEvaluationLog(id, evaluationId);
    if (!log) {
      return { message: 'No hay evaluaciones disponibles para este documento.' };
    }
    return log;
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
