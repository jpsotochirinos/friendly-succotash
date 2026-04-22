import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  AssistantAttachment,
  AssistantAttachmentStatus,
  Folder,
  Trackable,
  WhatsAppActivitySuggestion,
  WhatsAppMessage,
  WhatsAppUser,
} from '@tracker/db';
import { ActivitySuggestionStatus } from '@tracker/shared';
import { AssistantAttachmentsService } from '../../assistant/assistant-attachments.service';
import { AssistantService } from '../../assistant/assistant.service';
import { AssistantThreadsService } from '../../assistant/assistant-threads.service';
import {
  buildChoiceDisplayRows,
  findChoiceOptionById,
  MORE_ROW_ID,
  resolveChoicePickId,
  resolveConfirmReply,
} from '../../assistant/assistant-pending.util';
import { DocumentsService } from '../../documents/documents.service';
import type { ParsedIncomingMessage } from '../providers/whatsapp-provider.interface';
import { WhatsAppActivityDetectorService } from './whatsapp-activity-detector.service';
import { WhatsAppMessageService } from './whatsapp-message.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { WhatsAppPermissionService } from './whatsapp-permission.service';

function parseArchivarPath(body: string): string | null {
  const m = body.match(/#archivar\s+en\s+(.+)/i);
  return m ? m[1].trim() : null;
}

function findChildFolder(
  tree: Folder[],
  parentId: string | null,
  name: string,
): Folder | undefined {
  return tree.find((f) => {
    const p = f.parent as { id?: string } | string | null | undefined;
    const pid = typeof p === 'object' && p && 'id' in p ? p.id : typeof p === 'string' ? p : null;
    const matchesParent = parentId == null ? pid == null || pid === undefined : pid === parentId;
    return (
      matchesParent
      && (f.name === name || f.name.toLowerCase() === name.toLowerCase())
    );
  });
}

/** Twilio/WhatsApp a veces envía el archivo y el texto en dos POST distintos: enlazamos el último staging reciente. */
const WHATSAPP_STAGED_ATTACHMENT_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class WhatsAppInboundService {
  private readonly logger = new Logger(WhatsAppInboundService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly messages: WhatsAppMessageService,
    private readonly notify: WhatsAppNotificationService,
    private readonly perms: WhatsAppPermissionService,
    private readonly assistant: AssistantService,
    private readonly assistantThreads: AssistantThreadsService,
    private readonly detector: WhatsAppActivityDetectorService,
    private readonly documents: DocumentsService,
    private readonly assistantAttachments: AssistantAttachmentsService,
    private readonly config: ConfigService,
  ) {}

  private async downloadTwilioMedia(url: string): Promise<{ buffer: Buffer; contentType: string }> {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID')?.trim();
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN')?.trim();
    if (!sid || !token) {
      throw new Error('Twilio credentials missing for media download');
    }
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) {
      throw new Error(`Media download failed: ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    return { buffer: buf, contentType };
  }

  private async resolveArchiveFolder(
    organizationId: string,
    pathStr: string,
  ): Promise<{ trackableId: string; folderId: string } | null> {
    const parts = pathStr
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return null;

    const em = this.em.fork();

    const head = parts[0];
    let trackableId: string | undefined;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(head)) {
      const t = await em.findOne(
        Trackable,
        { id: head, organization: organizationId } as any,
        { filters: false },
      );
      if (t) trackableId = t.id;
    } else {
      const t = await em.findOne(
        Trackable,
        {
          organization: organizationId,
          $or: [
            { expedientNumber: head },
            { title: head },
            { title: { $ilike: `%${head}%` } },
          ],
        } as any,
        { filters: false },
      );
      if (t) trackableId = t.id;
    }
    if (!trackableId) return null;

    const tree = await em.find(
      Folder,
      { trackable: trackableId, organization: organizationId } as any,
      {
        populate: ['parent'] as any,
        orderBy: { sortOrder: 'ASC', name: 'ASC' } as any,
        filters: false,
      },
    );
    const root = tree.find((f) => !f.parent);
    if (!root) return null;

    if (parts.length === 1) {
      return { trackableId, folderId: root.id };
    }

    let current: Folder = root;
    for (let i = 1; i < parts.length; i++) {
      const next = findChildFolder(tree, current.id, parts[i]);
      if (!next) return null;
      current = next;
    }
    return { trackableId, folderId: current.id };
  }

  /**
   * Adjunto en staging subido desde WhatsApp (prefijo `whatsapp-`) aún no archivado,
   * creado hace poco por el mismo usuario.
   */
  private async findRecentWhatsAppStagedAttachmentId(
    organizationId: string,
    userId: string,
  ): Promise<string | null> {
    const since = new Date(Date.now() - WHATSAPP_STAGED_ATTACHMENT_TTL_MS);
    const em = this.em.fork();
    const row = await em.findOne(
      AssistantAttachment,
      {
        organization: organizationId,
        uploadedBy: userId,
        status: AssistantAttachmentStatus.STAGED,
        createdAt: { $gte: since },
        filename: { $like: 'whatsapp-%' },
      } as any,
      { orderBy: { createdAt: 'DESC' }, filters: false },
    );
    return row?.id ?? null;
  }

  async handleParsedMessage(
    organizationId: string,
    parsed: ParsedIncomingMessage,
  ): Promise<void> {
    const saved = await this.messages.saveIncoming(organizationId, parsed);
    const waUser = await this.messages.resolveUser(organizationId, parsed.fromPhone);
    if (!waUser) {
      this.logger.warn(
        `WhatsApp: mensaje guardado pero sin respuesta: ${parsed.fromPhone} no está en whitelist (verifica el número en Ajustes→WhatsApp).`,
      );
      return;
    }

    const jwtShape = await this.notify.resolveJwtShapeForWhatsAppUser(waUser);
    if (!jwtShape) return;

    const em = this.em.fork();
    em.setFilterParams('tenant', { organizationId: organizationId });
    const pending = await em.findOne(
      WhatsAppActivitySuggestion,
      {
        suggestedTo: waUser.id,
        status: ActivitySuggestionStatus.PENDING,
      },
      { orderBy: { createdAt: 'DESC' } },
    );
    const trimmed = parsed.body.trim();
    if (pending && /^[123](\s|$)/.test(trimmed)) {
      await this.detector.handleSuggestionReply(pending, trimmed);
      return;
    }

    const mediaUrls = parsed.mediaUrls?.length ? parsed.mediaUrls : [];
    const archivarPath = parseArchivarPath(parsed.body);

    if (mediaUrls.length > 0 && archivarPath && jwtShape.permissions.includes('document:create')) {
      const target = await this.resolveArchiveFolder(organizationId, archivarPath);
      if (target) {
        try {
          const { buffer, contentType } = await this.downloadTwilioMedia(mediaUrls[0]);
          const extFromMime: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'application/pdf': '.pdf',
            'text/plain': '.txt',
          };
          const ext = extFromMime[contentType.split(';')[0].trim()] ?? '';
          const filename = `whatsapp-${parsed.externalId}${ext || ''}`;
          const file = {
            fieldname: 'file',
            originalname: filename,
            encoding: '7bit',
            mimetype: contentType.split(';')[0].trim() || 'application/octet-stream',
            size: buffer.length,
            buffer,
          } as Express.Multer.File;

          const prevTenant = { ...(this.em.getFilterParams('tenant') || {}) } as {
            organizationId?: string;
          };
          this.em.setFilterParams('tenant', { organizationId });
          try {
            await this.documents.uploadDocument(file, {
              title: filename,
              folderId: target.folderId,
              trackableId: target.trackableId,
              organizationId,
              userId: jwtShape.id,
            });
          } finally {
            this.em.setFilterParams('tenant', prevTenant);
          }
          await this.notify.send(
            organizationId,
            parsed.fromPhone,
            `Listo: archivo guardado en «${archivarPath}».`,
          );
          return;
        } catch (e) {
          this.logger.warn(`WhatsApp archivar directo falló: ${e}`);
          await this.notify.send(
            organizationId,
            parsed.fromPhone,
            `No pude archivar el archivo. Comprueba la ruta «${archivarPath}» y permisos, o abre Alega para subirlo.`,
          );
          return;
        }
      } else {
        await this.notify.send(
          organizationId,
          parsed.fromPhone,
          `No encontré expediente/carpeta para «${archivarPath}». Usa UUID del expediente o título/expediente, p. ej. #archivar en MiCaso/Contratos.`,
        );
        return;
      }
    }

    let attachmentIds: string[] | undefined;
    if (mediaUrls.length > 0 && !archivarPath) {
      try {
        const { buffer, contentType } = await this.downloadTwilioMedia(mediaUrls[0]);
        const extFromMime: Record<string, string> = {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'application/pdf': '.pdf',
          'text/plain': '.txt',
        };
        const ext = extFromMime[contentType.split(';')[0].trim()] ?? '';
        const prevA = { ...(this.em.getFilterParams('tenant') || {}) } as { organizationId?: string };
        this.em.setFilterParams('tenant', { organizationId });
        try {
          const up = await this.assistantAttachments.uploadStagedFromBuffer({
            buffer,
            filename: `whatsapp-${parsed.externalId}${ext || ''}`,
            mimeType: contentType.split(';')[0].trim() || 'application/octet-stream',
            organizationId,
            userId: jwtShape.id,
          });
          attachmentIds = [up.id];
        } finally {
          this.em.setFilterParams('tenant', prevA);
        }
      } catch (e) {
        this.logger.warn(`WhatsApp staging adjunto falló: ${e}`);
      }
    }

    /** Archivo y leyenda a veces llegan separados: si solo hay media sin texto, no llamamos al LLM hasta el siguiente mensaje. */
    if (mediaUrls.length > 0 && !archivarPath && !trimmed && attachmentIds?.length) {
      await this.notify.send(
        organizationId,
        parsed.fromPhone,
        'Archivo recibido. En el siguiente mensaje indica en qué expediente guardarlo (nombre o palabra clave, ej. testflow) o usa #archivar en Expediente/Carpeta.',
      );
      return;
    }

    let mergedAttachmentIds = attachmentIds;
    if (!mergedAttachmentIds?.length && !mediaUrls.length) {
      const linked = await this.findRecentWhatsAppStagedAttachmentId(organizationId, jwtShape.id);
      if (linked) {
        mergedAttachmentIds = [linked];
        this.logger.log(
          `WhatsApp: enlazando adjunto staging reciente ${linked} al mensaje de texto del usuario`,
        );
      }
    }

    const isGroup = Boolean(parsed.groupId);
    const waRecipient = isGroup ? (parsed.groupId as string) : parsed.fromPhone;

    const tryResolveAssistantPending = async (): Promise<boolean> => {
      const threadId = await this.assistantThreads.ensureWhatsAppThread(
        organizationId,
        jwtShape.id,
      );
      const pending = await this.assistantThreads.getPendingInteractive(
        threadId,
        organizationId,
        jwtShape.id,
      );
      const interactiveId = parsed.interactiveReply?.id;
      const t = parsed.body.trim();

      if (pending?.kind === 'choice') {
        const pick = resolveChoicePickId(interactiveId, t, pending);
        if (pick === MORE_ROW_ID) {
          pending.page += 1;
          await this.assistantThreads.setPendingInteractive(
            threadId,
            organizationId,
            jwtShape.id,
            pending,
          );
          const { rows } = buildChoiceDisplayRows(pending);
          await this.notify.sendList(organizationId, waRecipient, {
            body: `Más opciones (página ${pending.page + 1}):`,
            buttonLabel: 'Ver opciones',
            rows,
          });
          return true;
        }
        if (pick) {
          const opt = findChoiceOptionById(pending, pick);
          if (opt) {
            await this.assistantThreads.clearPendingInteractive(
              threadId,
              organizationId,
              jwtShape.id,
            );
            const reply = await this.assistant.whatsappChat(
              jwtShape,
              `Elegí: ${opt.title} (id=${opt.id})`,
              {
                attachmentIds: mergedAttachmentIds,
                toPhone: waRecipient,
              },
            );
            if (reply.trim()) {
              await this.notify.send(organizationId, waRecipient, reply);
            }
            return true;
          }
        }
      }

      if (pending?.kind === 'confirm') {
        const ans = resolveConfirmReply(interactiveId, t);
        if (ans === 'yes') {
          await this.assistantThreads.clearPendingInteractive(
            threadId,
            organizationId,
            jwtShape.id,
          );
          if (pending.source === 'mutation') {
            const reply = await this.assistant.whatsappChat(jwtShape, '', {
              confirmedToolCallIds: [pending.toolCallId],
              toPhone: waRecipient,
            });
            if (reply.trim()) {
              await this.notify.send(organizationId, waRecipient, reply);
            }
          } else {
            const reply = await this.assistant.whatsappChat(jwtShape, '', {
              toPhone: waRecipient,
              syntheticToolMessages: [
                {
                  role: 'tool',
                  name: pending.toolName,
                  tool_call_id: pending.toolCallId,
                  content: JSON.stringify({ confirmed: true }),
                },
              ],
            });
            if (reply.trim()) {
              await this.notify.send(organizationId, waRecipient, reply);
            }
          }
          return true;
        }
        if (ans === 'no') {
          await this.assistantThreads.clearPendingInteractive(
            threadId,
            organizationId,
            jwtShape.id,
          );
          if (pending.source === 'mutation') {
            const reply = await this.assistant.whatsappChat(jwtShape, 'Cancelo la acción.', {
              toPhone: waRecipient,
            });
            if (reply.trim()) {
              await this.notify.send(organizationId, waRecipient, reply);
            }
          } else {
            const reply = await this.assistant.whatsappChat(jwtShape, '', {
              toPhone: waRecipient,
              syntheticToolMessages: [
                {
                  role: 'tool',
                  name: pending.toolName,
                  tool_call_id: pending.toolCallId,
                  content: JSON.stringify({ confirmed: false }),
                },
              ],
            });
            if (reply.trim()) {
              await this.notify.send(organizationId, waRecipient, reply);
            }
          }
          return true;
        }
      }

      if (pending && t.length > 0 && !interactiveId) {
        await this.assistantThreads.clearPendingInteractive(
          threadId,
          organizationId,
          jwtShape.id,
        );
      }
      return false;
    };

    const userPrompt =
      (mergedAttachmentIds?.length
        ? 'Te envío un archivo por WhatsApp. Indica en qué expediente y carpeta archivarlo (o usa list_folder_tree). '
        : '') + parsed.body;

    if (!isGroup) {
      if (!this.perms.canUseAssistant(jwtShape)) return;
      if (await tryResolveAssistantPending()) return;
      const reply = await this.assistant.whatsappChat(jwtShape, userPrompt, {
        attachmentIds: mergedAttachmentIds,
        toPhone: waRecipient,
      });
      if (reply.trim()) {
        await this.notify.send(organizationId, waRecipient, reply);
      }
      return;
    }

    if (parsed.mentionsBot) {
      if (!this.perms.canUseAssistant(jwtShape)) return;
      if (await tryResolveAssistantPending()) return;
      const reply = await this.assistant.whatsappChat(jwtShape, userPrompt, {
        attachmentIds: mergedAttachmentIds,
        toPhone: waRecipient,
      });
      if (reply.trim()) {
        await this.notify.send(organizationId, waRecipient, reply);
      }
      return;
    }

    void this.detector.analyze(saved).catch((e) => {
      this.logger.error(`detector.analyze failed: ${e}`);
    });
  }
}
