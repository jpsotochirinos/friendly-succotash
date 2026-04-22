import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AssistantService } from './assistant.service';
import { AssistantChatDto } from './dto/chat.dto';
import {
  CreateAssistantThreadDto,
  MessageFeedbackDto,
  PatchAssistantThreadDto,
} from './dto/thread.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SkipActivityLog } from '../../common/interceptors/skip-activity-log.decorator';
import { AssistantThreadsService } from './assistant-threads.service';
import { AssistantSearchService, AssistantSearchSource } from './assistant-search.service';
import { AssistantAttachmentsService } from './assistant-attachments.service';
@Controller('assistant')
export class AssistantController {
  constructor(
    private readonly assistant: AssistantService,
    private readonly threads: AssistantThreadsService,
    private readonly assistantSearch: AssistantSearchService,
    private readonly attachments: AssistantAttachmentsService,
  ) {}

  @Get('tools')
  @SkipActivityLog()
  listTools(@CurrentUser() user: { permissions?: string[] }) {
    const perms = user.permissions || [];
    const tools = this.assistant.getToolsForPermissions(perms);
    return {
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        mutation: t.mutation,
      })),
    };
  }

  @Get('search')
  @SkipActivityLog()
  async searchProxy(
    @CurrentUser() user: { organizationId: string },
    @Query('source') source: string,
    @Query('q') q = '',
    @Query('trackableId') trackableId?: string,
    @Query('limit') limit?: string,
  ) {
    const lim = limit ? parseInt(limit, 10) : 20;
    const items = await this.assistantSearch.searchEntities(
      source as AssistantSearchSource,
      q,
      user.organizationId,
      { trackableId, limit: Number.isFinite(lim) ? lim : 20 },
    );
    return items;
  }

  @Get('threads/retention')
  @SkipActivityLog()
  getThreadsRetention() {
    const days = this.threads.getRetentionDays();
    return { retentionDays: days };
  }

  @Get('threads')
  @SkipActivityLog()
  async listThreads(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 20;
    const { data, total } = await this.threads.listThreads(user.organizationId, user.id, p, l);
    return {
      data: data.map((t) => ({
        id: t.id,
        title: t.title,
        lastMessageAt: t.lastMessageAt,
        updatedAt: t.updatedAt,
        pinnedTrackableId: t.pinnedTrackable?.id ?? null,
        archivedAt: t.archivedAt,
      })),
      total,
      page: p,
      limit: l,
    };
  }

  @Post('threads')
  @SkipActivityLog()
  async createThread(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateAssistantThreadDto,
  ) {
    const t = await this.threads.createThread(user.organizationId, user.id, {
      title: dto.title,
      pinnedTrackableId: dto.pinnedTrackableId,
    });
    return { id: t.id, title: t.title, createdAt: t.createdAt };
  }

  @Get('threads/:id/messages')
  @SkipActivityLog()
  async getThreadMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    const rows = await this.threads.listMessages(id, user.organizationId, user.id);
    return {
      data: rows.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls,
        toolCallId: m.toolCallId,
        toolName: m.toolName,
        attachmentIds: m.attachmentIds,
        feedback: m.feedback,
        createdAt: m.createdAt,
      })),
    };
  }

  @Patch('threads/:id')
  @SkipActivityLog()
  async patchThread(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: PatchAssistantThreadDto,
  ) {
    const t = await this.threads.updateThread(id, user.organizationId, user.id, dto);
    return {
      id: t.id,
      title: t.title,
      pinnedTrackableId: (t as any).pinnedTrackable?.id ?? null,
      archivedAt: t.archivedAt,
    };
  }

  /** Debe ir antes de `threads/:id`: el id fijo no es UUID. */
  @Delete('threads/whatsapp')
  @SkipActivityLog()
  async deleteWhatsAppThread(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.threads.deleteWhatsAppThread(user.organizationId, user.id);
  }

  @Delete('threads/:id')
  @SkipActivityLog()
  async deleteThread(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.threads.deleteThread(id, user.organizationId, user.id);
    return { ok: true };
  }

  @Patch('messages/:messageId/feedback')
  @SkipActivityLog()
  async patchMessageFeedback(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: MessageFeedbackDto,
  ) {
    await this.assistant.setMessageFeedback(user, messageId, dto.feedback);
    return { ok: true };
  }

  @Post('attachments')
  @SkipActivityLog()
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 80 * 1024 * 1024 } }))
  async uploadAttachments(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() body: { threadId?: string },
  ) {
    if (!files?.length) {
      return { data: [] };
    }
    const out = [];
    for (const file of files) {
      const meta = await this.attachments.uploadStaged(
        file,
        user.organizationId,
        user.id,
        body.threadId,
      );
      out.push(meta);
    }
    return { data: out };
  }

  @Delete('attachments/:id')
  @SkipActivityLog()
  async deleteAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.attachments.deleteStaged(id, user.organizationId, user.id);
    return { ok: true };
  }

  @Post('chat')
  @SkipActivityLog()
  async chat(
    @Body() body: AssistantChatDto,
    @CurrentUser() user: { id: string; organizationId: string; permissions?: string[] },
    @Res() res: Response,
  ) {
    await this.assistant.streamChat(
      {
        id: user.id,
        organizationId: user.organizationId,
        permissions: user.permissions || [],
      },
      body,
      res,
    );
  }
}
