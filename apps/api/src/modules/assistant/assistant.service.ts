import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { Response } from 'express';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { LlmService } from '../llm/llm.service';
import { buildAssistantTools, BuildToolsDeps } from './tools/build-tools';
import type { AssistantToolContext, ToolDefinition } from './tools/tool-types';
import { hasToolPermission } from './tools/tool-types';
import { getNowInConfiguredTimeZone } from './assistant-time.util';
import { applySlidingWindow } from './assistant-window.util';
import {
  type AssistantHistoryMessage,
  assistantTranscriptChanged,
  sanitizeAssistantHistory,
} from './assistant-history-sanitize.util';
import {
  attachmentIdsFromArchiveToolCall,
  pruneWorkingAttachmentIds,
} from './assistant-archive-prune.util';
import type { PendingInteractiveChoice, PendingInteractiveConfirm } from './assistant-pending.types';
import {
  buildChoiceDisplayRows,
  CHOICE_PAGE_CONTENT_SIZE,
  mapWidgetChoiceOptions,
} from './assistant-pending.util';
import type { AssistantThreadsService } from './assistant-threads.service';
import {
  publicApiBase,
  singleDocumentIdFromSearchToolResult,
} from './assistant-whatsapp-doc-share.util';

interface ChatMessage {
  role: string;
  content?: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  /** Required by Gemini OpenAI-compat; must match the function name for this tool_call_id. */
  name?: string;
  attachmentIds?: string[];
}

interface ToolCall {
  id: string;
  type?: string;
  function: { name: string; arguments: string };
}

@Injectable()
export class AssistantService {
  private readonly tools: ToolDefinition[];
  private readonly toolMap: Map<string, ToolDefinition>;

  // Future: inject CreditLedgerService from BillingModule to deduct AI credits per assistant turn (feature-flagged).

  constructor(
    private readonly llm: LlmService,
    private readonly config: ConfigService,
    private readonly toolDeps: BuildToolsDeps,
    private readonly threads: AssistantThreadsService,
    private readonly em: EntityManager,
  ) {
    this.tools = buildAssistantTools(toolDeps);
    this.toolMap = new Map(this.tools.map((t) => [t.name, t]));
  }

  getToolsForPermissions(permissions: string[]) {
    return this.tools.filter((t) =>
      hasToolPermission({ userId: '', organizationId: '', permissions }, t.requiredPermissions),
    );
  }

  toolsToOpenAiFormat(defs: ToolDefinition[]) {
    return defs.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: zodToJsonSchema(t.schema as never, {
          target: 'openApi3',
          $refStrategy: 'none',
        }) as Record<string, unknown>,
      },
    }));
  }

  private buildSystemPrompt(context?: Record<string, unknown>): string {
    const { ymd, tzLabel, weekday } = getNowInConfiguredTimeZone(this.config);
    const parts = [
      'Eres el asistente de Alega. Responde en español. Usa las herramientas cuando necesites datos reales.',
      'Cliente (CRM) vs expediente: **Cliente** = persona o empresa en la libreta de contactos (nombre, email, teléfono, documento DNI/RUC, notas). Para altas masivas, importaciones tipo CSV o «crear clientes» usa **create_client** (una llamada por persona/empresa) y **list_clients** para consultar. **Expediente** (trackable) = asunto o caso jurídico en el estudio. **create_trackable** solo cuando el usuario pida abrir/registrar un **caso, expediente o asunto**; nunca lo uses como sustituto de crear clientes. Si el usuario mezcla términos, prioriza lo que pidió: contactos → create_client; nuevo caso legal → create_trackable (y opcionalmente vincular cliente por id si lo tienes).',
      'No inventes IDs; pide aclaración si falta un trackable o expediente.',
      `Referencia temporal (${tzLabel}): «hoy» es ${weekday} ${ymd} (formato YYYY-MM-DD). Usa esta fecha para actividades de hoy, rangos que incluyan el día actual o preguntas como «qué tengo hoy»; no pidas la fecha al usuario salvo que pida explícitamente otra zona u otra convención.`,
      'Calendario visible: si el JSON de contexto incluye `calendarView` con `from` y `to` (YYYY-MM-DD), llama a **get_calendar_range** con esas fechas exactas y resume sin pedir inicio ni fin. Si el usuario habla de «el calendario que estoy viendo» o del rango visible y **no** hay `calendarView` en el contexto, no pidas fechas: usa por defecto la **semana que contiene «hoy»** (lunes a domingo en la zona de «hoy») con get_calendar_range; si prefieres acotar más, puedes usar solo «hoy» (from=to=«hoy»). Solo si el usuario pide explícitamente otro criterio (mes pasado, trimestre, etc.) o hay ambigüedad real, usa **ui_ask_choice** con opciones breves (p. ej. Hoy, Esta semana, Este mes).',
      'Asignación de tareas a personas: si el usuario pide asignar a alguien por nombre (aunque esté mal escrito), llama primero a search_organization_users con ese texto. Si hint es ask_user, muestra las opciones (nombre + email) y pregunta a cuál se refiere; no llames a create_workflow_item con assignedToId hasta que haya un único usuario claro o el usuario elija. Si hint es no_match, dilo y no inventes un UUID. Si hint es use_top_match, usa matches[0].id como assignedToId.',
      'Fechas de tareas: si el usuario indica solo fecha de vencimiento (p. ej. «para mañana») y no dice fecha de inicio, pasa dueDate en YYYY-MM-DD y puedes omitir startDate: el servidor la fija automáticamente a «hoy» en la zona configurada. Si tú pasas ambas fechas, se respetan. Si falta el año en lo que dice el usuario, usa el año de «hoy».',
      'Campos de tarea en create_workflow_item / update_workflow_item: kind (etiqueta libre: Escrito, Plazo, Actuacion, Audiencia…); actionType según el caso (p. ej. file_brief para presentar escrito, generic si no aplica otro); accentColor siempre #RRGGBB — mapea colores naturales: rosa/rosado #EC407A, rojo #EF5350, verde #66BB6A, azul #42A5F5, naranja #FFA726, morado #AB47BC, amarillo #FFCA28, gris #78909C; requiresDocument si debe exigir documento; isLegalDeadline true solo si el usuario habla de plazo legal o plazo procesal; documentTemplateId solo tras list_document_templates y elección clara.',
      'Antes de crear la tarea (salvo que el usuario ya lo haya especificado todo en el mismo mensaje): pregunta brevemente si quiere añadir subtareas después (si sí, pueden crearse como ítems hijos con parentId); si la tarea debe generar o vincular un documento (requiresDocument); y si quiere partir de una plantilla concreta — en ese caso llama list_document_templates, muestra títulos e ids, y solo entonces fija documentTemplateId. Si no quiere plantilla, no pongas documentTemplateId.',
      'Formulario «Crear actuación» (mensaje con líneas «documentTemplateId (UUID para create_workflow_item):» y «requiresDocument:»): el usuario ya eligió plantilla en la UI. Llama a create_workflow_item pasando requiresDocument y documentTemplateId exactamente como indica el mensaje; no sustituyas por list_document_templates salvo que falte el UUID o haya error de permisos.',
      'Redacción de escritos: si el usuario pide **redactar**, **preparar un escrito**, **elaborar un recurso o demanda**, etc., usa **draft_brief** (genera DOCX con cuerpo visible en el editor). **Antes**, salvo que ya indique claramente la fuente, usa **ui_ask_choice** con tres opciones: (1) **Basarse en documentos del expediente** → luego **ui_ask_search** o **search_documents** filtrando por el expediente, y en **draft_brief** con `mode=from_sources` y los UUID en `sourceDocumentIds`; (2) **Usar plantilla** → **list_document_templates**, variables `{{nombre}}`, **draft_brief** con `mode=from_template` y `templateId`; (3) **Conocimiento de la firma** → **draft_brief** con `mode=from_knowledge` (texto de documentos indexados de la organización). **create_document_with_content** solo para notas cortas o texto que el usuario dictó explícitamente; no uses una herramienta de creación «vacía» para escritos largos. Si faltan datos esenciales (partes, pretensión, hechos), **ui_ask_form** antes de **draft_brief**.',
      'Adjuntos y archivos: **nunca** elijas carpeta o expediente por tu cuenta. Si el usuario sube archivos y no indicó destino con claridad, usa **ui_ask_file_placement** (o list_folder_tree + ui_ask_choice) antes de archive_attachment / archive_attachments_batch. Si el usuario dijo explícitamente dónde archivar, resuelve folderId con list_folder_tree y archiva sin leer el contenido.',
      'No uses read_attachment / summarize_attachment si la única intención es mover o archivar archivos a carpetas indicadas.',
    ];
    if (context?.channel === 'whatsapp') {
      parts.push(
        'Canal WhatsApp: los archivos del usuario llegan como adjuntos en staging del asistente. En el historial o en la última línea del mensaje del usuario verás UUID entre corchetes — úsalos con **archive_attachment** o **read_attachment** (nunca uses el nombre del PDF como ID). No digas que no puedes ver archivos enviados por WhatsApp ni pidas «subir de nuevo» si ya hay UUID o adjunto en el hilo.',
      );
      parts.push(
        'En WhatsApp sé proactivo: cuando debas elegir expediente, carpeta, cliente o plantilla, llama a **ui_ask_choice** con opciones concretas (el usuario verá una lista con «Ver más» si hay muchas). Antes de cualquier mutación (crear, borrar, archivar, enviar mensajes, etc.), llama a **ui_ask_confirm** con un resumen claro; el usuario responderá Sí o No.',
      );
      parts.push(
        '**Documentos por WhatsApp (orden obligatorio):** Si el usuario pide **descargar**, **mandar**, **compartir** o **enviar** un documento (por nombre o título): primero llama **search_documents** con `query` usando palabras del título (p. ej. «Escrito de Alimentos») y, si el expediente es conocido (contexto o hilo), `trackableId`. Si **total === 1** y hay un solo ítem en `data`, responde con **una frase muy breve**; el servidor **adjunta el archivo** automáticamente en otro mensaje (no hace falta que escribas URL). Si hay varios resultados, **ui_ask_choice** o acota la búsqueda. Si en el historial de herramientas ya tienes el **UUID** del documento y es el correcto, puedes usar **send_document_via_whatsapp** en lugar de buscar otra vez.',
      );
      parts.push(
        '**Prohibido en WhatsApp:** decir «haz clic en el enlace», «te dejo el link», «abre el siguiente enlace» o usar Markdown `[texto](url)` **sin** una URL https completa y real — el usuario **no verá** nada clicable y quedará mal. **No inventes URLs.** Si aún no ejecutaste **search_documents** o **send_document_via_whatsapp**, no prometas ningún enlace. No pegues la URL de la app web (`FRONTEND_URL`); el adjunto o el enlace firmado lo gestiona el servidor. Tras una herramienta que devuelve `assistantHint`, respétala al redactar la respuesta al usuario.',
      );
    }
    if (context && Object.keys(context).length) {
      parts.push(`Contexto de la UI (JSON): ${JSON.stringify(context)}`);
    }
    return parts.join('\n');
  }

  async streamChat(
    user: { id: string; organizationId: string; permissions: string[] },
    body: {
      messages: unknown[];
      context?: Record<string, unknown>;
      confirmedToolCallIds?: string[];
      threadId?: string;
      attachmentIds?: string[];
      /** En WhatsApp se ocultan tools send_whatsapp_* para evitar bucles. */
      channel?: 'web' | 'whatsapp';
    },
    res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as Response & { flushHeaders?: () => void }).flushHeaders === 'function') {
      (res as Response & { flushHeaders: () => void }).flushHeaders();
    }

    const write = (obj: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    };

    const sseDone = () => {
      write({ type: 'done' });
      if (!res.writableEnded) res.end();
    };

    write({ type: 'started' });

    let threadId = body.threadId;

    const maxSteps = Math.min(
      12,
      Math.max(1, Number(this.config.get('ASSISTANT_MAX_STEPS')) || 8),
    );

    const historyWindowRaw = this.config.get<string | number>('ASSISTANT_HISTORY_WINDOW');
    const historyWindow =
      historyWindowRaw === undefined || historyWindowRaw === ''
        ? 40
        : Number(historyWindowRaw);

    const channel = body.channel ?? 'web';
    const ctx: AssistantToolContext = {
      userId: user.id,
      organizationId: user.organizationId,
      permissions: user.permissions || [],
      channel,
    };
    const available = this.getToolsForPermissions(ctx.permissions).filter(
      (t) => channel !== 'whatsapp' || !t.name.startsWith('send_whatsapp_'),
    );
    const openAiTools = this.toolsToOpenAiFormat(available);
    const allowedNames = new Set(available.map((t) => t.name));

    const confirmed = new Set(body.confirmedToolCallIds || []);

    const systemText = this.buildSystemPrompt(body.context);
    const rawMessages = (body.messages || []).map((m) => m as ChatMessage);
    const clientMessages = sanitizeAssistantHistory(
      rawMessages,
    ) as ChatMessage[];

    try {
      if (!threadId) {
        const firstUser = [...clientMessages].reverse().find((m) => m.role === 'user');
        const raw =
          typeof firstUser?.content === 'string' ? firstUser.content.trim() : '';
        const title = raw ? raw.slice(0, 80) : undefined;
        const t = await this.threads.createThread(user.organizationId, user.id, { title });
        threadId = t.id;
        write({ type: 'thread', threadId });
      } else {
        await this.threads.getThread(threadId, user.organizationId, user.id);
      }

      if (body.attachmentIds?.length && threadId) {
        await this.threads.linkAttachmentsToThread(
          body.attachmentIds,
          threadId,
          user.organizationId,
          user.id,
        );
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      write({ type: 'error', message: errMsg });
      sseDone();
      return;
    }

    if (threadId && assistantTranscriptChanged(rawMessages, clientMessages)) {
      await this.threads.replaceMessagesFromApiThread(
        threadId,
        user.organizationId,
        user.id,
        clientMessages.map((m) => ({
          role: m.role,
          content: m.content ?? null,
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id,
          name: m.name,
          attachmentIds: m.attachmentIds,
        })),
      );
    }

    const working: ChatMessage[] = [{ role: 'system', content: systemText }, ...clientMessages];

    const persistSnapshot = async () => {
      if (!threadId) return;
      await this.threads.replaceMessagesFromApiThread(
        threadId,
        user.organizationId,
        user.id,
        stripSystem(working).map((m) => ({
          role: m.role,
          content: m.content ?? null,
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id,
          name: m.name,
          attachmentIds: m.attachmentIds,
        })),
      );
    };

    try {
      for (let step = 0; step < maxSteps; step++) {
        const last = working[working.length - 1];

        if (last?.role === 'assistant' && last.tool_calls?.length) {
          const pendingMut = last.tool_calls.filter((tc) => {
            const def = this.toolMap.get(tc.function.name);
            return Boolean(def?.mutation && !confirmed.has(tc.id));
          });

          if (pendingMut.length > 0) {
            write({
              type: 'needs_confirmation',
              assistantMessage: {
                role: 'assistant',
                content: last.content ?? null,
                tool_calls: last.tool_calls,
              },
              toolCalls: last.tool_calls.map((tc) => ({
                id: tc.id,
                name: tc.function.name,
                arguments: safeParseArgs(tc.function.arguments),
              })),
            });
            await persistSnapshot();
            sseDone();
            return;
          }

          write({
            type: 'assistant_tool_calls',
            message: {
              role: 'assistant',
              content: last.content ?? null,
              tool_calls: last.tool_calls,
            },
          });

          for (const tc of last.tool_calls) {
            const stop = await this.runOneToolCall(tc, ctx, allowedNames, working, write);
            if (stop) {
              await persistSnapshot();
              sseDone();
              return;
            }
            const toolName = tc.function.name;
            if (
              threadId &&
              (toolName === 'archive_attachment' || toolName === 'archive_attachments_batch')
            ) {
              const lastToolMsg = working[working.length - 1];
              if (lastToolMsg?.role === 'tool' && typeof lastToolMsg.content === 'string') {
                try {
                  const parsed = JSON.parse(lastToolMsg.content) as { error?: unknown };
                  if (parsed && typeof parsed === 'object' && !('error' in parsed)) {
                    const archivedIds = attachmentIdsFromArchiveToolCall(tc);
                    if (archivedIds.length) {
                      await this.threads.pruneAttachmentIdsFromThread(
                        threadId,
                        user.organizationId,
                        user.id,
                        archivedIds,
                      );
                      pruneWorkingAttachmentIds(working, archivedIds);
                    }
                  }
                } catch {
                  /* ignore JSON */
                }
              }
            }
          }
          confirmed.clear();
          continue;
        }

        const windowed = applySlidingWindow(working as ChatMessage[], historyWindow);
        const forLlm = sanitizeAssistantHistory(
          windowed as ChatMessage[],
        ) as ChatMessage[];
        const data = (await this.llm.chatCompletionJson({
          messages: prepareMessagesForLlm(forLlm as ChatMessage[], channel) as unknown[],
          tools: openAiTools.length ? openAiTools : undefined,
          tool_choice: openAiTools.length ? 'auto' : undefined,
          options: {
            temperature: 0.5,
            maxTokens: Number(this.config.get('ASSISTANT_MAX_TOKENS')) || 4096,
            model: this.config.get<string>('ASSISTANT_MODEL') || undefined,
          },
        })) as {
          choices?: Array<{
            message?: ChatMessage;
          }>;
        };

        const msg = data.choices?.[0]?.message;
        if (!msg) {
          write({ type: 'error', message: 'Empty model response' });
          sseDone();
          return;
        }

        const toolCalls = msg.tool_calls || [];
        if (!toolCalls.length) {
          const text = msg.content || '';
          if (text) {
            const step = 28;
            for (let i = 0; i < text.length; i += step) {
              write({ type: 'assistant_delta', chunk: text.slice(i, i + step) });
            }
            write({ type: 'assistant_message', content: text });
            working.push({ role: 'assistant', content: text });
          }
          await persistSnapshot();
          sseDone();
          return;
        }

        working.push({
          role: 'assistant',
          content: msg.content ?? null,
          tool_calls: toolCalls,
        });
      }

      write({ type: 'error', message: 'Max assistant steps exceeded' });
      sseDone();
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      write({ type: 'error', message: errMsg });
      sseDone();
    }
  }

  /**
   * Canal WhatsApp: misma lógica que streamChat pero acumula texto (SSE simulado).
   * Listas y confirmación Sí/No se envían vía Twilio (Content Template o texto numerado).
   */
  async whatsappChat(
    user: { id: string; organizationId: string; permissions: string[] },
    userText: string,
    opts?: {
      attachmentIds?: string[];
      confirmedToolCallIds?: string[];
      toPhone?: string;
      syntheticToolMessages?: Array<{
        role: string;
        content?: string | null;
        tool_call_id?: string;
        name?: string;
      }>;
    },
  ): Promise<string> {
    /** Webhook WhatsApp es @Public: el TenantInterceptor no fija la org en el EntityManager global. */
    const prevTenant = { ...(this.em.getFilterParams('tenant') || {}) } as {
      organizationId?: string;
    };
    this.em.setFilterParams('tenant', { organizationId: user.organizationId });
    try {
      const threadId = await this.threads.ensureWhatsAppThread(user.organizationId, user.id);
      const historyRaw = await this.threads.loadApiThreadMessages(
        threadId,
        user.organizationId,
        user.id,
      );
      const history = sanitizeAssistantHistory(
        historyRaw as unknown as AssistantHistoryMessage[],
      ) as ChatMessage[];
      if (assistantTranscriptChanged(historyRaw as unknown as AssistantHistoryMessage[], history)) {
        await this.threads.replaceMessagesFromApiThread(
          threadId,
          user.organizationId,
          user.id,
          history.map((m) => ({
            role: m.role,
            content: m.content ?? null,
            tool_calls: m.tool_calls,
            tool_call_id: m.tool_call_id,
            name: m.name,
            attachmentIds: m.attachmentIds,
          })),
        );
      }

      const attachmentIds = opts?.attachmentIds;
      const userMsg: ChatMessage = {
        role: 'user',
        content: userText,
        ...(attachmentIds?.length ? { attachmentIds } : {}),
      };

      const synthetic = (opts?.syntheticToolMessages ?? []) as ChatMessage[];
      const hasUserTurn =
        userText.trim().length > 0 || (attachmentIds?.length ?? 0) > 0;
      const clientTurn: ChatMessage[] = [...synthetic, ...(hasUserTurn ? [userMsg] : [])];

      const collected: string[] = [];
      const asyncTasks: Promise<void>[] = [];
      const outbound = { interactive: false };
      let pendingWaDocId: string | null = null;

      const runInteractiveHandlers = async (obj: Record<string, unknown>) => {
        const toPhone = opts?.toPhone;
        if (!toPhone) return;

        if (obj.type === 'ui_widget') {
          const spec = obj.spec as Record<string, unknown> | undefined;
          const kind = spec?.kind;
          const tcId = typeof obj.id === 'string' ? obj.id : '';
          const toolName = typeof obj.name === 'string' ? obj.name : '';

          if (kind === 'choice' && tcId) {
            const options = spec?.options;
            if (Array.isArray(options) && options.length > 0) {
              outbound.interactive = true;
              const label = String(spec?.label ?? '');
              const hint = spec?.hint ? String(spec.hint) : '';
              const body = [label, hint].filter(Boolean).join('\n\n');
              const mapped = mapWidgetChoiceOptions(
                options as Array<{ id: string; label: string; description?: string }>,
              );
              const state: PendingInteractiveChoice = {
                kind: 'choice',
                toolCallId: tcId,
                page: 0,
                pageSize: CHOICE_PAGE_CONTENT_SIZE,
                allOptions: mapped,
              };
              await this.threads.setPendingInteractive(
                threadId,
                user.organizationId,
                user.id,
                state,
              );
              const { rows } = buildChoiceDisplayRows(state);
              await this.toolDeps.whatsappNotify.sendList(user.organizationId, toPhone, {
                body,
                buttonLabel: 'Ver opciones',
                rows,
              });
            }
            return;
          }

          if (kind === 'confirm' && tcId) {
            outbound.interactive = true;
            const label = String(spec?.label ?? '');
            const bodyText = String(spec?.body ?? '');
            const full = [label, bodyText].filter(Boolean).join('\n\n');
            const pend: PendingInteractiveConfirm = {
              kind: 'confirm',
              toolCallId: tcId,
              toolName: toolName || 'ui_ask_confirm',
              argsSummary: full,
              source: 'widget',
            };
            await this.threads.setPendingInteractive(
              threadId,
              user.organizationId,
              user.id,
              pend,
            );
            await this.toolDeps.whatsappNotify.sendButtons(user.organizationId, toPhone, {
              body: full.slice(0, 1024),
              buttons: [
                { id: 'confirm_yes', title: 'Sí' },
                { id: 'confirm_no', title: 'No' },
              ],
            });
            return;
          }

          if (kind) {
            outbound.interactive = true;
            await this.toolDeps.whatsappNotify.send(
              user.organizationId,
              toPhone,
              'Esa función no está disponible por WhatsApp. Abre Alega en el navegador para continuar.',
            );
          }
          return;
        }

        if (obj.type === 'needs_confirmation') {
          outbound.interactive = true;
          const toolCalls = obj.toolCalls as
            | Array<{ id: string; name: string; arguments: unknown }>
            | undefined;
          const firstMut = toolCalls?.find((t) => this.toolMap.get(t.name)?.mutation);
          if (!firstMut) {
            await this.toolDeps.whatsappNotify.send(
              user.organizationId,
              toPhone,
              'No pude preparar la confirmación. Abre Alega en el navegador.',
            );
            return;
          }
          const { body, argsSummary } = await this.buildWhatsappMutationConfirm(firstMut);
          const pend: PendingInteractiveConfirm = {
            kind: 'confirm',
            toolCallId: firstMut.id,
            toolName: firstMut.name,
            argsSummary,
            source: 'mutation',
          };
          await this.threads.setPendingInteractive(
            threadId,
            user.organizationId,
            user.id,
            pend,
          );
          await this.toolDeps.whatsappNotify.sendButtons(user.organizationId, toPhone, {
            body: body.slice(0, 1024),
            buttons: [
              { id: 'confirm_yes', title: 'Sí' },
              { id: 'confirm_no', title: 'No' },
            ],
          });
        }
      };

      const res = {
        setHeader: () => {},
        flushHeaders: () => {},
        get writableEnded() {
          return false;
        },
        write: (s: string) => {
          const blocks = s.split('\n\n');
          for (const block of blocks) {
            for (const line of block.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              try {
                const obj = JSON.parse(line.slice(6)) as Record<string, unknown>;
                const singleDoc = singleDocumentIdFromSearchToolResult(obj);
                if (singleDoc) pendingWaDocId = singleDoc;
                asyncTasks.push(
                  runInteractiveHandlers(obj).catch((err) => {
                    console.warn('[whatsappChat] interactive handler failed', err);
                  }),
                );
                if (obj.type === 'assistant_delta' && typeof obj.chunk === 'string') {
                  collected.push(obj.chunk);
                }
                if (obj.type === 'assistant_message' && typeof obj.content === 'string') {
                  collected.length = 0;
                  collected.push(obj.content);
                }
                if (obj.type === 'error' && typeof obj.message === 'string') {
                  collected.length = 0;
                  collected.push(`Error: ${obj.message}`);
                }
              } catch {
                /* ignore parse */
              }
            }
          }
        },
        end: () => {},
      };
      await this.streamChat(
        user,
        {
          messages: [...history, ...clientTurn],
          threadId,
          attachmentIds,
          channel: 'whatsapp',
          context: { channel: 'whatsapp' },
          confirmedToolCallIds: opts?.confirmedToolCallIds,
        },
        res as unknown as Response,
      );
      await Promise.all(asyncTasks);
      if (outbound.interactive) {
        return '';
      }
      const toPhone = opts?.toPhone;
      if (toPhone && pendingWaDocId) {
        try {
          const meta = await this.toolDeps.documents.getShareMetadataForWhatsApp(
            pendingWaDocId,
            user.organizationId,
          );
          if (meta) {
            const maxRaw = this.config.get<string | number>('WHATSAPP_MEDIA_MAX_BYTES');
            const maxBytes =
              maxRaw === undefined || maxRaw === ''
                ? 16 * 1024 * 1024
                : Number(maxRaw);
            const ttlRaw = this.config.get<string | number>('WHATSAPP_MEDIA_TTL_SECONDS');
            const ttlSec =
              ttlRaw === undefined || ttlRaw === ''
                ? 600
                : Number(ttlRaw);
            const token = this.toolDeps.whatsappMediaToken.sign({
              documentId: pendingWaDocId,
              organizationId: user.organizationId,
              ttlSec: Number.isFinite(ttlSec) ? ttlSec : 600,
            });
            const base = publicApiBase(this.config);
            const url = `${base}/api/whatsapp/media/${pendingWaDocId}?token=${encodeURIComponent(token)}`;
            const cap = (meta.filename || 'Documento').slice(0, 1600);
            if (Number.isFinite(maxBytes) && meta.bytes > maxBytes) {
              await this.toolDeps.whatsappNotify.send(
                user.organizationId,
                toPhone,
                `El archivo pesa más de lo que WhatsApp permite adjuntar. Enlace seguro (caduca pronto): ${url}`,
              );
            } else {
              await this.toolDeps.whatsappNotify.sendMedia(user.organizationId, toPhone, url, cap);
            }
          }
        } catch (e) {
          console.warn('[whatsappChat] document media send failed', e);
        }
      }
      const out = collected.join('').trim();
      return out || 'No pude generar una respuesta. Intenta de nuevo.';
    } finally {
      this.em.setFilterParams('tenant', prevTenant);
    }
  }

  async setMessageFeedback(
    user: { id: string; organizationId: string },
    messageId: string,
    feedback: 'up' | 'down' | 'none',
  ): Promise<void> {
    await this.threads.setMessageFeedback(messageId, user.organizationId, user.id, feedback);
  }

  /**
   * Texto de confirmación en WhatsApp: nombres legibles (p. ej. título de documento, no solo UUIDs).
   */
  private async buildWhatsappMutationConfirm(
    firstMut: { id: string; name: string; arguments: unknown },
  ): Promise<{ body: string; argsSummary: string }> {
    if (firstMut.name === 'send_document_via_whatsapp') {
      const documentId = parseLooseIdFromArgs(firstMut.arguments, 'documentId');
      if (documentId) {
        try {
          const doc = await this.toolDeps.documents.findOne(documentId);
          const display = (doc.title || 'Documento').trim() || 'Documento';
          const file = doc.filename?.trim();
          const showFileLine =
            file &&
            file.length > 0 &&
            file.toLowerCase() !== display.toLowerCase() &&
            !display.toLowerCase().includes(file.toLowerCase());
          const fileLine = showFileLine
            ? `\n\n_Archivo: ${file.length > 200 ? file.slice(0, 200) + '…' : file}_`
            : '';
          const argsSummary = file
            ? `Enviar por WhatsApp: «${display}» (${file})`
            : `Enviar por WhatsApp: «${display}»`;
          return {
            body:
              `¿Confirmas **enviar por WhatsApp** el documento **${display}**?` +
              fileLine +
              `\n\nElige Sí o No.`,
            argsSummary,
          };
        } catch (e) {
          console.warn('[whatsappChat] could not load document for confirm text', e);
        }
        return waConfirmSendDocGeneric();
      }
    }

    let argsSummary: string;
    try {
      argsSummary = JSON.stringify(firstMut.arguments ?? {}).slice(0, 500);
    } catch {
      argsSummary = String(firstMut.arguments).slice(0, 500);
    }
    return {
      body:
        `¿Confirmas ejecutar **${firstMut.name}**?\n\n` +
        `Detalle: ${argsSummary}\n\n` +
        'Elige Sí o No.',
      argsSummary,
    };
  }

  /** @returns true if the stream must stop (e.g. UI widget). */
  private async runOneToolCall(
    tc: ToolCall,
    ctx: AssistantToolContext,
    allowedNames: Set<string>,
    working: ChatMessage[],
    write: (obj: Record<string, unknown>) => void,
  ): Promise<boolean> {
    const def = this.toolMap.get(tc.function.name);
    if (!def || !allowedNames.has(tc.function.name)) {
      working.push({
        role: 'tool',
        name: tc.function.name,
        tool_call_id: tc.id,
        content: JSON.stringify({ error: 'Unknown or forbidden tool' }),
      } as ChatMessage);
      return false;
    }

    if (!hasToolPermission(ctx, def.requiredPermissions)) {
      working.push({
        role: 'tool',
        name: tc.function.name,
        tool_call_id: tc.id,
        content: JSON.stringify({ error: 'Forbidden: missing permission for this tool' }),
      } as ChatMessage);
      return false;
    }

    const parsedArgs = def.schema.safeParse(safeParseArgs(tc.function.arguments));
    if (!parsedArgs.success) {
      working.push({
        role: 'tool',
        name: tc.function.name,
        tool_call_id: tc.id,
        content: JSON.stringify({
          error: 'Invalid arguments',
          details: parsedArgs.error.flatten(),
        }),
      } as ChatMessage);
      return false;
    }

    write({
      type: 'tool_start',
      name: tc.function.name,
      id: tc.id,
    });

    try {
      const toolResult = await def.run(ctx, parsedArgs.data);
      if (
        toolResult &&
        typeof toolResult === 'object' &&
        (toolResult as { _uiWidget?: boolean })._uiWidget === true
      ) {
        const { _uiWidget: _w, ...spec } = toolResult as { _uiWidget?: boolean } & Record<string, unknown>;
        write({
          type: 'ui_widget',
          name: tc.function.name,
          id: tc.id,
          spec,
        });
        return true;
      }
      working.push({
        role: 'tool',
        name: tc.function.name,
        tool_call_id: tc.id,
        content: JSON.stringify(toolResult ?? null),
      } as ChatMessage);
      write({
        type: 'tool_result',
        name: tc.function.name,
        id: tc.id,
        ok: true,
        result: toolResult,
      });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      working.push({
        role: 'tool',
        name: tc.function.name,
        tool_call_id: tc.id,
        content: JSON.stringify({ error: errMsg }),
      } as ChatMessage);
      write({
        type: 'tool_result',
        name: tc.function.name,
        id: tc.id,
        ok: false,
        error: errMsg,
      });
    }
    return false;
  }
}

function parseLooseIdFromArgs(args: unknown, key: string): string {
  if (args == null) return '';
  if (typeof args === 'object' && !Array.isArray(args)) {
    const v = (args as Record<string, unknown>)[key];
    return v != null && String(v).trim() ? String(v).trim() : '';
  }
  if (typeof args === 'string') {
    try {
      const p = JSON.parse(args) as Record<string, unknown>;
      const v = p[key];
      return v != null && String(v).trim() ? String(v).trim() : '';
    } catch {
      return '';
    }
  }
  return '';
}

function waConfirmSendDocGeneric(): { body: string; argsSummary: string } {
  return {
    body:
      '¿Confirmas **enviar un documento** por este chat de WhatsApp?\n\n' +
      'Elige Sí o No.',
    argsSummary: 'Enviar documento por WhatsApp (sin título en respuesta del servidor)',
  };
}

function safeParseArgs(args: string): unknown {
  if (!args || args === 'null') return {};
  try {
    return JSON.parse(args);
  } catch {
    return {};
  }
}

function stripSystem(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((m) => m.role !== 'system');
}

/** Gemini OpenAI-compat exige string en content; el asistente con solo tool_calls suele tener content null. */
function normalizeMessageContentForProvider(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => {
    const content = m.content == null ? '' : m.content;
    return { ...m, content };
  });
}

/** El proveedor LLM no recibe `attachmentIds`; en WhatsApp inyectamos UUID en el texto para archive_attachment. */
function prepareMessagesForLlm(messages: ChatMessage[], channel: string): ChatMessage[] {
  let out = messages.map((m) => ({ ...m }));
  if (channel === 'whatsapp') {
    out = out.map((m) => {
      if (m.role !== 'user' || !m.attachmentIds?.length) return m;
      const hint = `\n\n[Adjuntos en staging — UUID para archive_attachment: ${m.attachmentIds.join(', ')}]`;
      return {
        ...m,
        content: `${m.content ?? ''}${hint}`,
      };
    });
  }
  return normalizeMessageContentForProvider(out);
}
