import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  AssistantThread,
  AssistantMessage,
  AssistantAttachment,
  AssistantAttachmentStatus,
  Trackable,
} from '@tracker/db';
import { whatsappThreadNeedsRotation } from './assistant-whatsapp-idle.util';
import { pruneAttachmentIdsOnObjects } from './assistant-archive-prune.util';
import type { PendingInteractive } from './assistant-pending.types';
import { isPendingInteractive } from './assistant-pending.types';

/** Un hilo por usuario para conversación WhatsApp (misma sesión que en web assistant). */
export const WHATSAPP_ASSISTANT_THREAD_TITLE = 'WhatsApp';

/** Días por defecto antes de purgar hilos del asistente inactivos. */
export const ASSISTANT_THREAD_DEFAULT_RETENTION_DAYS = 30;

@Injectable()
export class AssistantThreadsService {
  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService,
  ) {}

  /**
   * Días de retención configurados vía `ASSISTANT_THREAD_RETENTION_DAYS`.
   * 0 o valores no numéricos desactivan la purga automática.
   */
  getRetentionDays(): number {
    const raw = this.config.get<string | number>('ASSISTANT_THREAD_RETENTION_DAYS');
    if (raw === undefined || raw === '' || raw === null) return ASSISTANT_THREAD_DEFAULT_RETENTION_DAYS;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return ASSISTANT_THREAD_DEFAULT_RETENTION_DAYS;
    return Math.floor(n);
  }

  /**
   * Purga hilos con inactividad superior a `retentionDays`. Usa el mayor de
   * `lastMessageAt` / `updatedAt` / `createdAt` como referencia. Los mensajes
   * y adjuntos asociados se eliminan por CASCADE.
   * Devuelve el número de hilos eliminados.
   */
  async purgeOldThreads(retentionDays?: number): Promise<number> {
    const days = retentionDays ?? this.getRetentionDays();
    if (!days || days <= 0) return 0;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const conn = this.em.getConnection();
    const result = (await conn.execute(
      `DELETE FROM assistant_threads
       WHERE GREATEST(
         COALESCE(last_message_at, '1970-01-01'::timestamptz),
         COALESCE(updated_at,      '1970-01-01'::timestamptz),
         COALESCE(created_at,      '1970-01-01'::timestamptz)
       ) < ?`,
      [cutoff],
    )) as unknown;
    if (typeof result === 'number') return result;
    if (result && typeof result === 'object' && 'affectedRows' in (result as Record<string, unknown>)) {
      const n = Number((result as { affectedRows?: unknown }).affectedRows);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }

  /**
   * Asegura `name` (toolName) en tool rows desde un assistant previo; omite tool sin resolución
   * (evita NULL en tool_name y Gemini `function_response.name` vacío).
   */
  private resolveToolNamesForThread(
    messages: Array<{
      role: string;
      content?: string | null;
      tool_calls?: unknown;
      tool_call_id?: string;
      name?: string;
      attachmentIds?: string[];
      feedback?: string | null;
    }>,
  ): Array<{
    role: string;
    content?: string | null;
    tool_calls?: unknown;
    tool_call_id?: string;
    name?: string;
    attachmentIds?: string[];
    feedback?: string | null;
  }> {
    const out: typeof messages = [];
    for (let i = 0; i < messages.length; i++) {
      const m = { ...messages[i]! };
      if (m.role === 'system') continue;
      if (m.role !== 'tool') {
        out.push(m);
        continue;
      }
      const tid = m.tool_call_id;
      if (!tid) {
        console.warn('[assistant-threads] skipping tool message without tool_call_id');
        continue;
      }
      const hasName = Boolean(m.name && String(m.name).trim().length > 0);
      if (hasName) {
        out.push(m);
        continue;
      }
      let resolved: string | undefined;
      for (let j = i - 1; j >= 0; j--) {
        const p = messages[j]!;
        if (p.role === 'assistant' && p.tool_calls && Array.isArray(p.tool_calls)) {
          for (const tc of p.tool_calls as Array<{
            id: string;
            function?: { name?: string; arguments?: string };
          }>) {
            if (tc.id === tid && tc.function?.name) {
              resolved = tc.function.name;
              break;
            }
          }
        }
        if (resolved) break;
      }
      if (resolved) {
        m.name = resolved;
        out.push(m);
      } else {
        console.warn(
          '[assistant-threads] skipping tool message: cannot resolve toolName (orphan or missing name)',
          tid,
        );
      }
    }
    return out;
  }

  /** MikroORM filtro global `tenant` (TenantBaseEntity): sin params falla. Rutas públicas (ej. webhook WhatsApp) no pasan TenantInterceptor. */
  private async withTenant<T>(organizationId: string, fn: () => Promise<T>): Promise<T> {
    const prev = { ...(this.em.getFilterParams('tenant') || {}) } as {
      organizationId?: string;
    };
    this.em.setFilterParams('tenant', { organizationId });
    try {
      return await fn();
    } finally {
      this.em.setFilterParams('tenant', prev);
    }
  }

  async createThread(
    organizationId: string,
    userId: string,
    dto: { title?: string; pinnedTrackableId?: string },
  ): Promise<AssistantThread> {
    return this.withTenant(organizationId, async () => {
      const thread = this.em.create(AssistantThread, {
        organization: organizationId,
        user: userId,
        title: dto.title?.trim() || undefined,
        pinnedTrackable: dto.pinnedTrackableId
          ? this.em.getReference(Trackable, dto.pinnedTrackableId)
          : undefined,
      } as any);
      await this.em.persistAndFlush(thread);
      return thread;
    });
  }

  async listThreads(
    organizationId: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: AssistantThread[]; total: number }> {
    return this.withTenant(organizationId, async () => {
      const where = { organization: organizationId, user: userId, archivedAt: null };
      const [data, total] = await this.em.findAndCount(AssistantThread, where, {
        orderBy: { lastMessageAt: 'DESC', updatedAt: 'DESC' },
        limit,
        offset: (page - 1) * limit,
        populate: ['pinnedTrackable'] as any,
      });
      return { data, total };
    });
  }

  async getThread(
    threadId: string,
    organizationId: string,
    userId: string,
  ): Promise<AssistantThread> {
    return this.withTenant(organizationId, async () => {
      const thread = await this.em.findOne(
        AssistantThread,
        { id: threadId, organization: organizationId, user: userId },
        { populate: ['pinnedTrackable'] as any },
      );
      if (!thread) throw new NotFoundException('Thread not found');
      return thread;
    });
  }

  async updateThread(
    threadId: string,
    organizationId: string,
    userId: string,
    dto: { title?: string; pinnedTrackableId?: string; clearPinnedTrackable?: boolean; archived?: boolean },
  ): Promise<AssistantThread> {
    return this.withTenant(organizationId, async () => {
      const thread = await this.getThread(threadId, organizationId, userId);
      if (dto.title !== undefined) thread.title = dto.title.trim() || undefined;
      if (dto.clearPinnedTrackable === true) {
        thread.pinnedTrackable = undefined;
      } else if (dto.pinnedTrackableId !== undefined) {
        thread.pinnedTrackable = this.em.getReference(Trackable, dto.pinnedTrackableId);
      }
      if (dto.archived === true) thread.archivedAt = new Date();
      if (dto.archived === false) thread.archivedAt = undefined;
      await this.em.flush();
      return thread;
    });
  }

  async deleteThread(threadId: string, organizationId: string, userId: string): Promise<void> {
    return this.withTenant(organizationId, async () => {
      const thread = await this.em.findOne(AssistantThread, {
        id: threadId,
        organization: organizationId,
        user: userId,
      });
      if (!thread) throw new NotFoundException('Thread not found');
      await this.em.removeAndFlush(thread);
    });
  }

  async listMessages(threadId: string, organizationId: string, userId: string) {
    return this.withTenant(organizationId, async () => {
      await this.getThread(threadId, organizationId, userId);
      return this.em.find(
        AssistantMessage,
        { thread: threadId },
        { orderBy: { createdAt: 'ASC' } },
      );
    });
  }

  /** Reutiliza un único hilo titulado «WhatsApp» por usuario/org para mantener adjuntos e historial entre mensajes. */
  async ensureWhatsAppThread(organizationId: string, userId: string): Promise<string> {
    return this.withTenant(organizationId, async () => {
      const idleHoursRaw = this.config.get<string | number>('ASSISTANT_WHATSAPP_IDLE_HOURS');
      const idleHours =
        idleHoursRaw === undefined || idleHoursRaw === ''
          ? 4
          : Number(idleHoursRaw);

      const existing = await this.em.findOne(
        AssistantThread,
        {
          organization: organizationId,
          user: userId,
          title: WHATSAPP_ASSISTANT_THREAD_TITLE,
          archivedAt: null,
        } as any,
        { orderBy: { lastMessageAt: 'DESC', updatedAt: 'DESC' } as any },
      );

      if (existing) {
        if (
          whatsappThreadNeedsRotation(
            existing.lastMessageAt,
            existing.updatedAt,
            idleHours,
          )
        ) {
          existing.archivedAt = new Date();
          await this.em.flush();
          const t = await this.createThread(organizationId, userId, {
            title: WHATSAPP_ASSISTANT_THREAD_TITLE,
          });
          return t.id;
        }
        return existing.id;
      }

      const t = await this.createThread(organizationId, userId, {
        title: WHATSAPP_ASSISTANT_THREAD_TITLE,
      });
      return t.id;
    });
  }

  /** Quita UUIDs ya archivados del transcript (evita reinyectar staging en cada turno). */
  async setPendingInteractive(
    threadId: string,
    organizationId: string,
    userId: string,
    state: PendingInteractive | null,
  ): Promise<void> {
    return this.withTenant(organizationId, async () => {
      const thread = await this.getThread(threadId, organizationId, userId);
      thread.pendingInteractive = state ?? undefined;
      await this.em.flush();
    });
  }

  async getPendingInteractive(
    threadId: string,
    organizationId: string,
    userId: string,
  ): Promise<PendingInteractive | null> {
    return this.withTenant(organizationId, async () => {
      const thread = await this.getThread(threadId, organizationId, userId);
      const p = thread.pendingInteractive;
      return isPendingInteractive(p) ? p : null;
    });
  }

  async clearPendingInteractive(
    threadId: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    return this.withTenant(organizationId, async () => {
      await this.setPendingInteractive(threadId, organizationId, userId, null);
    });
  }

  async pruneAttachmentIdsFromThread(
    threadId: string,
    orgId: string,
    userId: string,
    ids: string[],
  ): Promise<void> {
    if (!ids.length) return;
    return this.withTenant(orgId, async () => {
      await this.getThread(threadId, orgId, userId);
      const rows = await this.em.find(AssistantMessage, { thread: threadId });
      pruneAttachmentIdsOnObjects(rows, ids);
      await this.em.flush();
    });
  }

  /**
   * Borra el hilo «WhatsApp» del usuario (mensajes incluidos por CASCADE).
   * El siguiente mensaje por WhatsApp creará un hilo nuevo vía ensureWhatsAppThread.
   */
  async deleteWhatsAppThread(
    organizationId: string,
    userId: string,
  ): Promise<{ deleted: boolean; threadId?: string }> {
    return this.withTenant(organizationId, async () => {
      const existing = await this.em.findOne(
        AssistantThread,
        {
          organization: organizationId,
          user: userId,
          title: WHATSAPP_ASSISTANT_THREAD_TITLE,
          archivedAt: null,
        } as any,
        { orderBy: { lastMessageAt: 'DESC', updatedAt: 'DESC' } as any },
      );
      if (!existing) return { deleted: false };
      const id = existing.id;
      await this.em.removeAndFlush(existing);
      return { deleted: true, threadId: id };
    });
  }

  /** Transcript persistido → formato API del asistente (para reenviar al modelo). */
  async loadApiThreadMessages(
    threadId: string,
    organizationId: string,
    userId: string,
  ): Promise<
    Array<{
      role: string;
      content?: string | null;
      tool_calls?: unknown;
      tool_call_id?: string;
      name?: string;
      attachmentIds?: string[];
    }>
  > {
    return this.withTenant(organizationId, async () => {
      await this.getThread(threadId, organizationId, userId);
      const rows = await this.em.find(
        AssistantMessage,
        { thread: threadId },
        { orderBy: { createdAt: 'ASC' } },
      );
      return rows.map((r) => ({
        role: r.role,
        content: r.content ?? null,
        tool_calls: r.toolCalls as
          | Array<{
              id: string;
              type?: string;
              function: { name: string; arguments: string };
            }>
          | undefined,
        tool_call_id: r.toolCallId,
        name: r.toolName,
        attachmentIds: r.attachmentIds,
      }));
    });
  }

  /** Replace all messages for a thread with the API-visible transcript (no system). */
  async replaceMessagesFromApiThread(
    threadId: string,
    organizationId: string,
    userId: string,
    messages: Array<{
      role: string;
      content?: string | null;
      tool_calls?: unknown;
      tool_call_id?: string;
      name?: string;
      attachmentIds?: string[];
      feedback?: string | null;
    }>,
  ): Promise<void> {
    return this.withTenant(organizationId, async () => {
      await this.getThread(threadId, organizationId, userId);
      await this.em.nativeDelete(AssistantMessage, { thread: threadId });
      for (const m of this.resolveToolNamesForThread(messages)) {
        if (m.role === 'system') continue;
        const row = this.em.create(AssistantMessage, {
          thread: this.em.getReference(AssistantThread, threadId),
          role: m.role,
          content: m.content ?? null,
          toolCalls: m.tool_calls ?? undefined,
          toolCallId: m.tool_call_id,
          toolName: m.name,
          feedback: m.feedback ?? undefined,
          attachmentIds: m.attachmentIds,
        } as any);
        this.em.persist(row);
      }
      const thread = await this.em.findOneOrFail(AssistantThread, threadId);
      thread.lastMessageAt = new Date();
      await this.em.flush();
    });
  }

  async setMessageFeedback(
    messageId: string,
    organizationId: string,
    userId: string,
    feedback: 'up' | 'down' | 'none',
  ): Promise<void> {
    return this.withTenant(organizationId, async () => {
      const msg = await this.em.findOne(AssistantMessage, { id: messageId }, { populate: ['thread'] as any });
      if (!msg) throw new NotFoundException('Message not found');
      const thread = msg.thread as AssistantThread;
      await this.em.populate(thread, ['user', 'organization'] as any);
      const orgId = (thread.organization as { id: string }).id;
      const uid = (thread.user as { id: string }).id;
      if (orgId !== organizationId || uid !== userId) {
        throw new ForbiddenException();
      }
      if (msg.role !== 'assistant') throw new ForbiddenException('Feedback only on assistant messages');
      msg.feedback = feedback === 'none' ? undefined : feedback;
      await this.em.flush();
    });
  }

  async linkAttachmentsToThread(
    attachmentIds: string[],
    threadId: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    return this.withTenant(organizationId, async () => {
      await this.getThread(threadId, organizationId, userId);
      for (const id of attachmentIds) {
        const att = await this.em.findOne(AssistantAttachment, {
          id,
          organization: organizationId,
          uploadedBy: userId,
          status: AssistantAttachmentStatus.STAGED,
        });
        if (att) {
          att.thread = this.em.getReference(AssistantThread, threadId);
          this.em.persist(att);
        }
      }
      await this.em.flush();
    });
  }
}
