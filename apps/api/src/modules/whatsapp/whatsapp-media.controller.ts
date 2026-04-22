import {
  Controller,
  ForbiddenException,
  Get,
  GoneException,
  Logger,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Document } from '@tracker/db';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { plainTextOrMarkdownToHtml, renderHtmlAsDocx } from '../documents/docx-renderer.util';
import { StorageService } from '../storage/storage.service';
import { WhatsAppMediaTokenService } from './services/whatsapp-media-token.service';

@Controller('whatsapp')
export class WhatsAppMediaController {
  private readonly log = new Logger(WhatsAppMediaController.name);

  constructor(
    private readonly em: EntityManager,
    private readonly storage: StorageService,
    private readonly mediaToken: WhatsAppMediaTokenService,
  ) {}

  @Public()
  @Get('media/:id')
  async streamDocument(
    @Param('id') id: string,
    @Query('token') token: string | undefined,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const v = this.mediaToken.verify(token);
    if (!v.ok) {
      if (v.reason === 'expired') {
        throw new GoneException('Enlace expirado');
      }
      throw new ForbiddenException('Token inválido');
    }
    if (v.documentId !== id) {
      throw new ForbiddenException('Token no coincide con el documento');
    }

    const fork = this.em.fork();
    fork.setFilterParams('tenant', { organizationId: v.organizationId });
    const doc = await fork.findOne(Document, { id });
    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }
    const hasText = doc.contentText?.trim();
    if (!doc.minioKey && !hasText) {
      throw new NotFoundException('Documento no encontrado');
    }

    if (!doc.minioKey && hasText) {
      try {
        const buffer = await renderHtmlAsDocx(
          plainTextOrMarkdownToHtml(doc.contentText!),
          doc.title || 'Documento',
        );
        const base =
          (doc.title || 'documento')
            .replace(/[/\\?%*:|"<>]/g, '-')
            .trim()
            .slice(0, 180) || 'documento';
        const filename = `${base}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
        res.end(buffer);
      } catch (e) {
        this.log.warn(
          `media render docx failed doc=${id}: ${e instanceof Error ? e.message : e}`,
        );
        throw new NotFoundException('No se pudo leer el archivo');
      }
      return;
    }

    try {
      const stream = await this.storage.getStream(doc.minioKey!);
      const name = doc.filename || doc.title || 'document';
      res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(name)}"`);
      stream.on('error', (err) => {
        this.log.warn(`media stream error doc=${id}: ${err instanceof Error ? err.message : err}`);
        if (!res.headersSent) {
          res.status(500).end();
        } else {
          res.destroy(err);
        }
      });
      stream.pipe(res);
    } catch (e) {
      this.log.warn(`media getStream failed doc=${id}: ${e instanceof Error ? e.message : e}`);
      throw new NotFoundException('No se pudo leer el archivo');
    }
  }
}
