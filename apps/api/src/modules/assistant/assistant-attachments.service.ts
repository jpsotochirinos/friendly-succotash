import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import { AssistantAttachment, AssistantAttachmentStatus } from '@tracker/db';
import { StorageService } from '../storage/storage.service';

const DEFAULT_MAX_MB = 25;

@Injectable()
export class AssistantAttachmentsService {
  constructor(
    private readonly em: EntityManager,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  private maxBytes(): number {
    const n = Number(this.config.get('ASSISTANT_MAX_UPLOAD_MB', DEFAULT_MAX_MB));
    const mb = Number.isFinite(n) && n > 0 ? Math.min(n, 100) : DEFAULT_MAX_MB;
    return mb * 1024 * 1024;
  }

  private assertMime(mime: string): void {
    const allowed = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ]);
    if (!allowed.has(mime)) {
      throw new BadRequestException(`Tipo de archivo no permitido: ${mime}`);
    }
  }

  async uploadStaged(
    file: Express.Multer.File,
    organizationId: string,
    userId: string,
    threadId?: string,
  ): Promise<{ id: string; filename: string; mimeType: string; size: number }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Archivo vacío');
    }
    const max = this.maxBytes();
    if (file.size > max) {
      throw new BadRequestException(`El archivo supera el máximo de ${Math.round(max / (1024 * 1024))} MB`);
    }
    this.assertMime(file.mimetype);

    const att = this.em.create(AssistantAttachment, {
      organization: organizationId,
      uploadedBy: userId,
      thread: threadId || undefined,
      status: AssistantAttachmentStatus.STAGED,
      filename: file.originalname.slice(0, 500),
      mimeType: file.mimetype.slice(0, 200),
      size: file.size,
      minioKey: 'pending',
    } as any);
    await this.em.persistAndFlush(att);

    const key = `assistant-staging/${organizationId}/${userId}/${att.id}/${Date.now()}-${file.originalname.replace(/[^\w.\-]+/g, '_')}`;
    await this.storage.upload(key, file.buffer, file.mimetype);
    att.minioKey = key;
    await this.em.flush();

    return {
      id: att.id,
      filename: att.filename,
      mimeType: att.mimeType,
      size: att.size,
    };
  }

  /** Staging desde buffer (p. ej. adjunto entrante por WhatsApp / Twilio Media). */
  async uploadStagedFromBuffer(opts: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    organizationId: string;
    userId: string;
    threadId?: string;
  }): Promise<{ id: string; filename: string; mimeType: string; size: number }> {
    const { buffer, filename, mimeType, organizationId, userId, threadId } = opts;
    if (!buffer?.length) {
      throw new BadRequestException('Archivo vacío');
    }
    const max = this.maxBytes();
    if (buffer.length > max) {
      throw new BadRequestException(`El archivo supera el máximo de ${Math.round(max / (1024 * 1024))} MB`);
    }
    this.assertMime(mimeType);

    const safeName = filename.slice(0, 500);
    const att = this.em.create(AssistantAttachment, {
      organization: organizationId,
      uploadedBy: userId,
      thread: threadId || undefined,
      status: AssistantAttachmentStatus.STAGED,
      filename: safeName,
      mimeType: mimeType.slice(0, 200),
      size: buffer.length,
      minioKey: 'pending',
    } as any);
    await this.em.persistAndFlush(att);

    const key = `assistant-staging/${organizationId}/${userId}/${att.id}/${Date.now()}-${safeName.replace(/[^\w.\-]+/g, '_')}`;
    await this.storage.upload(key, buffer, mimeType);
    att.minioKey = key;
    await this.em.flush();

    return {
      id: att.id,
      filename: att.filename,
      mimeType: att.mimeType,
      size: att.size,
    };
  }

  async deleteStaged(id: string, organizationId: string, userId: string): Promise<void> {
    const att = await this.em.findOne(AssistantAttachment, {
      id,
      organization: organizationId,
      uploadedBy: userId,
      status: AssistantAttachmentStatus.STAGED,
    });
    if (!att) throw new NotFoundException('Adjunto no encontrado');
    try {
      await this.storage.delete(att.minioKey);
    } catch {
      /* ignore */
    }
    await this.em.removeAndFlush(att);
  }

  async getStagedBuffer(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string; attachment: AssistantAttachment }> {
    const att = await this.em.findOne(AssistantAttachment, {
      id,
      organization: organizationId,
      uploadedBy: userId,
    });
    if (!att) throw new NotFoundException('Adjunto no encontrado');
    const buffer = await this.storage.download(att.minioKey);
    return { buffer, filename: att.filename, mimeType: att.mimeType, attachment: att };
  }

  async markArchived(documentId: string, attachmentId: string, organizationId: string): Promise<void> {
    const att = await this.em.findOne(AssistantAttachment, {
      id: attachmentId,
      organization: organizationId,
    });
    if (!att) return;
    att.status = AssistantAttachmentStatus.ARCHIVED;
    att.document = documentId as any;
    await this.em.flush();
  }

  async purgeStagedOlderThan(hours: number): Promise<number> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const rows = await this.em.find(AssistantAttachment, {
      status: AssistantAttachmentStatus.STAGED,
      createdAt: { $lt: cutoff },
    } as any);
    let n = 0;
    for (const att of rows) {
      try {
        await this.storage.delete(att.minioKey);
      } catch {
        /* ignore */
      }
      this.em.remove(att);
      n++;
    }
    if (n) await this.em.flush();
    return n;
  }
}
