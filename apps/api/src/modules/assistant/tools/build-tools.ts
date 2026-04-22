import { z } from 'zod';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActionType, WorkflowItemStatus } from '@tracker/shared';
import { todayYmd } from '../assistant-time.util';
import type { DashboardService } from '../../dashboard/dashboard.service';
import type { TrackablesService } from '../../trackables/trackables.service';
import type { WorkflowItemsService } from '../../workflow-items/workflow-items.service';
import type { WorkflowService } from '../../workflow/workflow.service';
import type { DocumentsService } from '../../documents/documents.service';
import type { FoldersService } from '../../folders/folders.service';
import type { SearchService } from '../../search/search.service';
import type { NotificationsService } from '../../notifications/notifications.service';
import type { LlmService } from '../../llm/llm.service';
import type { UsersService } from '../../users/users.service';
import type { ClientsService } from '../../clients/clients.service';
import type { AssistantAttachmentsService } from '../assistant-attachments.service';
import type { WhatsAppNotificationService } from '../../whatsapp/services/whatsapp-notification.service';
import type { WhatsAppMediaTokenService } from '../../whatsapp/services/whatsapp-media-token.service';
import { publicApiBase } from '../assistant-whatsapp-doc-share.util';
import { extractAttachmentText } from '../assistant-extract-text.util';
import { stripHtmlToPlain } from '../../documents/docx-renderer.util';
import type { ToolDefinition } from './tool-types';

export interface BuildToolsDeps {
  config: ConfigService;
  dashboard: DashboardService;
  clients: ClientsService;
  trackables: TrackablesService;
  workflowItems: WorkflowItemsService;
  workflow: WorkflowService;
  documents: DocumentsService;
  folders: FoldersService;
  search: SearchService;
  notifications: NotificationsService;
  llm: LlmService;
  users: UsersService;
  assistantAttachments: AssistantAttachmentsService;
  whatsappNotify: WhatsAppNotificationService;
  whatsappMediaToken: WhatsAppMediaTokenService;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

function firstRootFolderId(folders: Awaited<ReturnType<FoldersService['getFolderTree']>>): string | null {
  const roots = folders.filter((f: { parent?: { id?: string } | null }) => !f.parent);
  if (roots.length) return roots[0].id;
  return folders[0]?.id ?? null;
}

const DRAFT_BRIEF_MAX_HTML_CHARS = 40_000;

function extractLlmMessageContent(data: Record<string, unknown>): string {
  const choices = data.choices as Array<{ message?: { content?: string | null } }> | undefined;
  return String(choices?.[0]?.message?.content ?? '');
}

function parseDraftBriefLlmJson(raw: string): { html: string; textPlain?: string } {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(s);
  if (fence) s = fence[1].trim();
  const parsed = JSON.parse(s) as { html?: unknown; textPlain?: unknown };
  const html = typeof parsed.html === 'string' ? parsed.html : '';
  if (!html) throw new Error('El modelo no devolvió "html" en el JSON');
  if (html.length > DRAFT_BRIEF_MAX_HTML_CHARS) {
    throw new Error(`HTML demasiado largo (máx ${DRAFT_BRIEF_MAX_HTML_CHARS} caracteres)`);
  }
  return {
    html,
    textPlain: typeof parsed.textPlain === 'string' ? parsed.textPlain : undefined,
  };
}

async function loadDocumentForTool(
  d: BuildToolsDeps,
  documentId: string,
  organizationId: string,
): Promise<{ id: string; title: string; contentText: string; trackableId?: string }> {
  const doc = await d.documents.findOne(documentId, {
    populate: ['organization', 'folder', 'folder.trackable'] as any,
  });
  if (!doc) throw new NotFoundException('Documento no encontrado');
  const oid = (doc as any).organization?.id ?? (doc as any).organization;
  if (String(oid) !== organizationId) throw new NotFoundException('Documento no encontrado');
  const tid = (doc as any).folder?.trackable?.id ?? (doc as any).folder?.trackable;
  return {
    id: doc.id,
    title: doc.title,
    contentText: String((doc as any).contentText ?? ''),
    trackableId: tid ? String(tid) : undefined,
  };
}

export function buildAssistantTools(d: BuildToolsDeps): ToolDefinition[] {
  return [
    {
      name: 'get_calendar_range',
      description:
        'List workflow items with start/due dates overlapping a date range (calendar). Use YYYY-MM-DD for from and to. If the UI context JSON includes `calendarView.from` and `calendarView.to`, use those first. The system message includes «hoy» in YYYY-MM-DD — use it for "today" unless the user specifies another day.',
      mutation: false,
      requiredPermissions: ['trackable:read'],
      schema: z.object({
        from: isoDate,
        to: isoDate,
      }),
      async run(ctx, raw) {
        const p = raw as { from: string; to: string };
        const { data } = await d.dashboard.getCalendarWorkflowItems(ctx.organizationId, p.from, p.to);
        return { count: (data as unknown[]).length, items: data };
      },
    },
    {
      name: 'upcoming_deadlines',
      description: 'Workflow items with due dates within the next N days (not closed).',
      mutation: false,
      requiredPermissions: ['trackable:read'],
      schema: z.object({
        days: z.number().int().min(1).max(365).optional().default(14),
        trackableId: z.string().uuid().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as { days?: number; trackableId?: string };
        return d.dashboard.getUpcomingDeadlines(ctx.organizationId, p.days ?? 14, p.trackableId);
      },
    },
    {
      name: 'overdue_items',
      description: 'Overdue open workflow items for the organization (optionally filter by trackable).',
      mutation: false,
      requiredPermissions: ['trackable:read'],
      schema: z.object({
        trackableId: z.string().uuid().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as { trackableId?: string };
        return d.dashboard.getOverdueItems(ctx.organizationId, p.trackableId);
      },
    },
    {
      name: 'my_pending_actions',
      description:
        'List workflow items assigned to the current user (global actions inbox). Use overdue=true for overdue only.',
      mutation: false,
      requiredPermissions: ['workflow_item:read'],
      schema: z.object({
        overdue: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).optional().default(40),
        trackableId: z.string().uuid().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as { overdue?: boolean; limit?: number; trackableId?: string };
        return d.dashboard.getGlobalActions(ctx.organizationId, {
          assignedToId: ctx.userId,
          overdue: p.overdue === true,
          limit: p.limit ?? 40,
          trackableId: p.trackableId,
          page: 1,
        });
      },
    },
    {
      name: 'list_trackables',
      description: 'Paginated list of trackables (expedientes) with optional filters.',
      mutation: false,
      requiredPermissions: ['trackable:read'],
      schema: z.object({
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(50).optional().default(20),
        search: z.string().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as { page?: number; limit?: number; search?: string };
        return d.trackables.findByFilters(
          ctx.organizationId,
          { page: p.page ?? 1, limit: p.limit ?? 20 },
          { search: p.search },
        );
      },
    },
    {
      name: 'get_trackable',
      description: 'Load one trackable by id with relations.',
      mutation: false,
      requiredPermissions: ['trackable:read'],
      schema: z.object({
        trackableId: z.string().uuid(),
      }),
      async run(ctx, raw) {
        const p = raw as { trackableId: string };
        return d.trackables.findOne(p.trackableId, {
          populate: ['createdBy', 'assignedTo', 'client', 'folders'] as any,
        });
      },
    },
    {
      name: 'list_clients',
      description:
        'List clients (CRM / libreta de contactos: personas y empresas). Paginated. Use search to filter by name or email.',
      mutation: false,
      requiredPermissions: ['trackable:read'],
      schema: z.object({
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(50).optional().default(20),
        search: z.string().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as { page?: number; limit?: number; search?: string };
        return d.clients.findAllForOrg(
          { page: p.page ?? 1, limit: p.limit ?? 20, sortBy: 'name', sortOrder: 'ASC' },
          p.search,
        );
      },
    },
    {
      name: 'create_client',
      description:
        'Create a client record (CRM): person or company — name, optional email, phone, document id (DNI/RUC), notes. Use when the user asks to register **clients**, **contactos**, **fichas**, or import CSV rows of people/companies. Do NOT use for opening a legal **case/expediente** (that is create_trackable).',
      mutation: true,
      requiredPermissions: ['trackable:create'],
      schema: z.object({
        name: z.string().min(1).max(500),
        email: z
          .union([z.string().email(), z.literal('')])
          .optional()
          .describe('Optional; omit or leave empty if unknown.'),
        phone: z.string().max(64).optional(),
        documentId: z.string().max(120).optional().describe('DNI, RUC, etc.'),
        notes: z.string().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as {
          name: string;
          email?: string;
          phone?: string;
          documentId?: string;
          notes?: string;
        };
        return d.clients.createForOrg(
          {
            name: p.name.trim(),
            email: p.email?.trim() || undefined,
            phone: p.phone?.trim() || undefined,
            documentId: p.documentId?.trim() || undefined,
            notes: p.notes?.trim() || undefined,
          },
          ctx.organizationId,
        );
      },
    },
    {
      name: 'create_trackable',
      description:
        'Create a new **expediente** (trackable): a legal **case/matter** in the system, optionally linked to a client later. NOT for registering CRM contacts — for new **cases** use this; for new **clients** (people/companies in the address book) use create_client.',
      mutation: true,
      requiredPermissions: ['trackable:create'],
      schema: z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        type: z.string().min(1),
      }),
      async run(ctx, raw) {
        const p = raw as { title: string; description?: string; type: string };
        return d.trackables.createTrackable(
          {
            title: p.title,
            description: p.description,
            type: p.type,
          } as any,
          ctx.userId,
          ctx.organizationId,
        );
      },
    },
    {
      name: 'update_trackable',
      description: 'Update trackable fields (partial).',
      mutation: true,
      requiredPermissions: ['trackable:update'],
      schema: z.object({
        trackableId: z.string().uuid(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as { trackableId: string; title?: string; description?: string; status?: string };
        const { trackableId, ...rest } = p;
        return d.trackables.patchTrackable(trackableId, rest as any);
      },
    },
    {
      name: 'list_workflow_items',
      description: 'List workflow items for a trackable (paginated).',
      mutation: false,
      requiredPermissions: ['workflow_item:read'],
      schema: z.object({
        trackableId: z.string().uuid(),
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(80).optional().default(30),
      }),
      async run(ctx, raw) {
        const p = raw as { trackableId: string; page?: number; limit?: number };
        return d.workflowItems.findAll(
          { trackable: p.trackableId, organization: ctx.organizationId } as any,
          { page: p.page ?? 1, limit: p.limit ?? 30 },
          { populate: ['assignedTo'] as any },
        );
      },
    },
    {
      name: 'get_workflow_item',
      description: 'Get a single workflow item by id.',
      mutation: false,
      requiredPermissions: ['workflow_item:read'],
      schema: z.object({
        workflowItemId: z.string().uuid(),
      }),
      async run(ctx, raw) {
        const p = raw as { workflowItemId: string };
        return d.workflowItems.findOne(p.workflowItemId, {
          populate: ['assignedTo', 'trackable', 'parent'] as any,
        });
      },
    },
    {
      name: 'search_organization_users',
      description:
        'Resolve a person name to a user id (typo-tolerant). Call BEFORE create_workflow_item when the user asks to assign to someone by name. Returns matches, distance (0=best), and hint: use_top_match | ask_user | no_match. If ask_user, list options and ask who they mean — do not guess assignedToId. If no_match, say no user found.',
      mutation: false,
      requiredPermissions: ['workflow_item:create'],
      schema: z.object({
        nameQuery: z.string().min(1).describe('Name or fragment the user said (may contain typos).'),
      }),
      async run(ctx, raw) {
        const p = raw as { nameQuery: string };
        return d.users.searchUsersForAssignee(ctx.organizationId, p.nameQuery);
      },
    },
    {
      name: 'list_document_templates',
      description:
        'List document templates (isTemplate) in the organization. Call before setting documentTemplateId on a task when the user wants to base a document on a template. Show id + title so the user can choose.',
      mutation: false,
      requiredPermissions: ['document:read'],
      schema: z.object({
        limit: z.number().int().min(1).max(80).optional().default(50),
      }),
      async run(ctx, raw) {
        const limit = (raw as { limit?: number }).limit ?? 50;
        const { data } = await d.search.listDocuments(ctx.organizationId, { isTemplate: true }, limit, 0);
        return {
          templates: (data as any[]).map((doc) => ({
            id: doc.id as string,
            title: doc.title as string,
            folderName: doc.folder?.name ?? null,
            trackableTitle: doc.folder?.trackable?.title ?? null,
          })),
        };
      },
    },
    {
      name: 'create_workflow_item',
      description:
        'Create a workflow item (task) under a trackable. kind = free label (e.g. Escrito, Plazo, Actuacion, Audiencia). actionType = workflow action kind. accentColor must be #RRGGBB (map common colors: rosa/rosado #EC407A, rojo #EF5350, verde #66BB6A, azul #42A5F5, naranja #FFA726, morado #AB47BC, gris #78909C). isLegalDeadline = plazo legal procesal. documentTemplateId = id from list_document_templates — the server also creates a working copy of that document in the trackable folder and links it to the task (needs at least one document folder on the matter). If dueDate is set and startDate omitted, the server sets startDate to today. For assignedToId: first call search_organization_users; only set when hint is use_top_match or user clarified.',
      mutation: true,
      requiredPermissions: ['workflow_item:create'],
      schema: z.object({
        trackableId: z.string().uuid(),
        title: z.string().min(1),
        parentId: z.string().uuid().optional(),
        kind: z
          .string()
          .optional()
          .describe('Etiqueta UI: Escrito, Plazo, Actuacion, Fase, Audiencia, etc.'),
        actionType: z
          .nativeEnum(ActionType)
          .optional()
          .describe('Tipo de acción (p. ej. file_brief para escrito, generic por defecto).'),
        dueDate: z.string().optional(),
        startDate: z.string().optional(),
        assignedToId: z.string().uuid().optional(),
        description: z.string().optional(),
        requiresDocument: z
          .boolean()
          .optional()
          .describe('Si la tarea exige documento adjunto / generación.'),
        isLegalDeadline: z
          .boolean()
          .optional()
          .describe('true = plazo legal procesal (UI distinta).'),
        accentColor: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional()
          .describe('Color de acento en tablero (#RRGGBB).'),
        documentTemplateId: z
          .string()
          .uuid()
          .optional()
          .describe(
            'Id del documento plantilla (list_document_templates o UUID explícito en el mensaje del formulario «Crear actuación»).',
          ),
      }),
      async run(ctx, raw) {
        const p = raw as Record<string, unknown>;
        let startDate = p.startDate as string | undefined;
        const dueDate = p.dueDate as string | undefined;
        if (dueDate && !startDate) {
          startDate = todayYmd(d.config);
        }
        return d.workflowItems.createItem(
          {
            trackableId: p.trackableId as string,
            title: p.title as string,
            parentId: p.parentId as string | undefined,
            kind: (p.kind as string) || 'Actuacion',
            actionType: p.actionType as ActionType | undefined,
            dueDate,
            startDate,
            assignedToId: p.assignedToId as string | undefined,
            description: p.description as string | undefined,
            requiresDocument: p.requiresDocument as boolean | undefined,
            isLegalDeadline: p.isLegalDeadline as boolean | undefined,
            accentColor: p.accentColor as string | undefined,
            documentTemplateId: p.documentTemplateId as string | undefined,
          } as any,
          ctx.organizationId,
          ctx.userId,
          { creationSource: 'assistant' },
        );
      },
    },
    {
      name: 'update_workflow_item',
      description:
        'Update a workflow item (partial). Same fields as create where applicable; accentColor #RRGGBB; actionType and kind as in create_workflow_item.',
      mutation: true,
      requiredPermissions: ['workflow_item:update'],
      schema: z.object({
        workflowItemId: z.string().uuid(),
        title: z.string().optional(),
        kind: z.string().nullable().optional(),
        actionType: z.nativeEnum(ActionType).nullable().optional(),
        dueDate: z.string().nullable().optional(),
        startDate: z.string().nullable().optional(),
        assignedToId: z.string().uuid().nullable().optional(),
        description: z.string().nullable().optional(),
        requiresDocument: z.boolean().nullable().optional(),
        isLegalDeadline: z.boolean().nullable().optional(),
        accentColor: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .nullable()
          .optional(),
        documentTemplateId: z.string().uuid().nullable().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as { workflowItemId: string } & Record<string, unknown>;
        const { workflowItemId, ...dto } = p;
        return d.workflowItems.update(workflowItemId, dto as any);
      },
    },
    {
      name: 'transition_workflow_item',
      description: 'Change workflow item status (must be a valid transition).',
      mutation: true,
      requiredPermissions: ['workflow_item:update'],
      schema: z.object({
        workflowItemId: z.string().uuid(),
        targetStatus: z.nativeEnum(WorkflowItemStatus),
      }),
      async run(ctx, raw) {
        const p = raw as { workflowItemId: string; targetStatus: WorkflowItemStatus };
        return d.workflow.transitionWorkflowItem(p.workflowItemId, p.targetStatus, {
          userId: ctx.userId,
          organizationId: ctx.organizationId,
          permissions: ctx.permissions,
        });
      },
    },
    {
      name: 'add_workflow_comment',
      description: 'Add a comment to a workflow item.',
      mutation: true,
      requiredPermissions: ['workflow_item:comment', 'workflow_item:update'],
      schema: z.object({
        workflowItemId: z.string().uuid(),
        body: z.string().min(1).max(8000),
      }),
      async run(ctx, raw) {
        const p = raw as { workflowItemId: string; body: string };
        return d.workflowItems.addComment(p.workflowItemId, ctx.userId, ctx.organizationId, p.body);
      },
    },
    {
      name: 'search_documents',
      description: 'Full-text search documents in the organization (Spanish FTS).',
      mutation: false,
      requiredPermissions: ['document:read'],
      schema: z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(30).optional().default(15),
        trackableId: z.string().uuid().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as { query: string; limit?: number; trackableId?: string };
        return d.search.searchDocuments({
          query: p.query,
          organizationId: ctx.organizationId,
          trackableId: p.trackableId,
          limit: p.limit ?? 15,
        });
      },
    },
    {
      name: 'list_folder_tree',
      description: 'List folder tree for a trackable (documents).',
      mutation: false,
      requiredPermissions: ['document:read'],
      schema: z.object({
        trackableId: z.string().uuid(),
      }),
      async run(ctx, raw) {
        const p = raw as { trackableId: string };
        return d.folders.getFolderTree(p.trackableId);
      },
    },
    {
      name: 'create_folder',
      description: 'Create a subfolder under a trackable (optionally under parent folder).',
      mutation: true,
      requiredPermissions: ['document:create'],
      schema: z.object({
        name: z.string().min(1),
        trackableId: z.string().uuid(),
        parentId: z.string().uuid().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as { name: string; trackableId: string; parentId?: string };
        return d.folders.createSubfolder({
          name: p.name,
          trackableId: p.trackableId,
          parentId: p.parentId,
          organizationId: ctx.organizationId,
        });
      },
    },
    {
      name: 'update_folder',
      description: 'Rename or update folder emoji.',
      mutation: true,
      requiredPermissions: ['document:update'],
      schema: z.object({
        folderId: z.string().uuid(),
        name: z.string().optional(),
        emoji: z.string().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as { folderId: string; name?: string; emoji?: string };
        const { folderId, ...rest } = p;
        return d.folders.updateFolder(folderId, rest);
      },
    },
    {
      name: 'create_blank_document',
      description:
        'Create a blank document in a folder. If folderId is omitted, uses the first root folder of the trackable.',
      mutation: true,
      requiredPermissions: ['document:create'],
      schema: z.object({
        title: z.string().min(1),
        trackableId: z.string().uuid(),
        folderId: z.string().uuid().optional(),
        workflowItemId: z.string().uuid().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as {
          title: string;
          trackableId: string;
          folderId?: string;
          workflowItemId?: string;
        };
        let folderId: string | undefined = p.folderId;
        if (!folderId) {
          const tree = await d.folders.getFolderTree(p.trackableId);
          const root = firstRootFolderId(tree);
          if (!root) {
            throw new BadRequestException('No folder found for trackable; create a folder first.');
          }
          folderId = root;
        }
        return d.documents.createBlankDocument({
          title: p.title,
          folderId,
          trackableId: p.trackableId,
          workflowItemId: p.workflowItemId,
          organizationId: ctx.organizationId,
          userId: ctx.userId,
        });
      },
    },
    {
      name: 'summarize_document',
      description: 'Summarize document text content (uses AI). Requires document:read.',
      mutation: false,
      requiredPermissions: ['document:read'],
      schema: z.object({
        documentId: z.string().uuid(),
      }),
      async run(ctx, raw) {
        const p = raw as { documentId: string };
        const doc = await d.documents.findOne(p.documentId);
        const orgId = (doc as any).organization?.id ?? (doc as any).organization;
        if (orgId && orgId !== ctx.organizationId) {
          throw new NotFoundException('Document not found');
        }
        const text = (doc as any).contentText as string | undefined;
        if (!text || !text.trim()) {
          return { summary: null, message: 'No text content indexed for this document yet.' };
        }
        const clipped = text.length > 14000 ? `${text.slice(0, 14000)}\n…` : text;
        const out = await d.llm.chatCompletionJson({
          messages: [
            {
              role: 'user',
              content: `Resume el siguiente documento legal/operativo en español en 5-10 viñetas claras. Documento:\n\n${clipped}`,
            },
          ],
          options: { temperature: 0.4, maxTokens: 1200 },
        });
        const content =
          (out as any).choices?.[0]?.message?.content ??
          (out as any).choices?.[0]?.message?.parts?.[0]?.text;
        return { summary: typeof content === 'string' ? content : JSON.stringify(content) };
      },
    },
    {
      name: 'list_notifications',
      description: 'List notifications for the current user.',
      mutation: false,
      requiredPermissions: null,
      schema: z.object({
        unreadOnly: z.boolean().optional(),
        limit: z.number().int().min(1).max(50).optional().default(20),
      }),
      async run(ctx, raw) {
        const p = raw as { unreadOnly?: boolean; limit?: number };
        return d.notifications.listInbox(ctx.userId, ctx.organizationId, ctx.permissions, {
          page: 1,
          limit: p.limit ?? 20,
          unreadOnly: p.unreadOnly,
        });
      },
    },
    {
      name: 'unread_notification_count',
      description: 'Count unread notifications for the current user.',
      mutation: false,
      requiredPermissions: null,
      schema: z.object({}),
      async run(ctx) {
        const count = await d.notifications.getUnreadCount(
          ctx.userId,
          ctx.organizationId,
          ctx.permissions,
        );
        return { count };
      },
    },

    /* —— UI widgets (no mutation): emit interactive panel in the client —— */
    {
      name: 'ui_ask_choice',
      description:
        'Muestra al usuario un selector único (lista). Úsalo cuando necesites una decisión sin asumir carpeta ni expediente.',
      mutation: false,
      requiredPermissions: null,
      schema: z.object({
        label: z.string(),
        hint: z.string().optional(),
        options: z.array(z.object({ id: z.string(), label: z.string(), description: z.string().optional() })).min(1),
      }),
      async run(_ctx, raw) {
        const p = raw as Record<string, unknown>;
        return { _uiWidget: true, kind: 'choice', ...p };
      },
    },
    {
      name: 'ui_ask_multi_choice',
      description: 'Muestra selección múltiple con límites min/max.',
      mutation: false,
      requiredPermissions: null,
      schema: z.object({
        label: z.string(),
        hint: z.string().optional(),
        options: z.array(z.object({ id: z.string(), label: z.string() })).min(1),
        min: z.number().int().min(0).optional().default(1),
        max: z.number().int().min(1).optional().default(10),
      }),
      async run(_ctx, raw) {
        return { _uiWidget: true, kind: 'multi_choice', ...(raw as object) };
      },
    },
    {
      name: 'ui_ask_confirm',
      description: 'Pregunta sí/no con texto de contexto.',
      mutation: false,
      requiredPermissions: null,
      schema: z.object({
        label: z.string(),
        body: z.string(),
        confirmLabel: z.string().optional(),
        cancelLabel: z.string().optional(),
      }),
      async run(_ctx, raw) {
        return { _uiWidget: true, kind: 'confirm', ...(raw as object) };
      },
    },
    {
      name: 'ui_ask_search',
      description:
        'Panel de búsqueda en vivo (el cliente llama GET /assistant/search). Indica source: trackables|clients|folders|templates|users|workflow_items.',
      mutation: false,
      requiredPermissions: null,
      schema: z.object({
        label: z.string(),
        source: z.enum(['trackables', 'clients', 'folders', 'templates', 'users', 'workflow_items']),
        hint: z.string().optional(),
        trackableId: z.string().uuid().optional().describe('Requerido para folders y workflow_items'),
      }),
      async run(_ctx, raw) {
        return { _uiWidget: true, kind: 'search', ...(raw as object) };
      },
    },
    {
      name: 'ui_ask_form',
      description: 'Formulario corto (campos texto, textarea, fecha, número, checkbox, dropdown).',
      mutation: false,
      requiredPermissions: null,
      schema: z.object({
        label: z.string(),
        fields: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            type: z.enum(['text', 'textarea', 'date', 'number', 'checkbox', 'dropdown']),
            required: z.boolean().optional(),
            options: z.array(z.object({ id: z.string(), label: z.string() })).optional(),
          }),
        ),
      }),
      async run(_ctx, raw) {
        return { _uiWidget: true, kind: 'form', ...(raw as object) };
      },
    },
    {
      name: 'ui_ask_file_placement',
      description:
        'Matriz para elegir expediente/carpeta/título por cada adjunto. No asumas carpetas: úsalo cuando falte destino.',
      mutation: false,
      requiredPermissions: null,
      schema: z.object({
        label: z.string(),
        attachmentIds: z.array(z.string().uuid()).min(1),
        hint: z.string().optional(),
      }),
      async run(_ctx, raw) {
        return { _uiWidget: true, kind: 'file_placement', ...(raw as object) };
      },
    },

    {
      name: 'read_attachment',
      description:
        'Extrae texto de un adjunto del asistente (PDF/DOCX/texto). Para imágenes devuelve aviso; no sustituye análisis visual.',
      mutation: false,
      requiredPermissions: null,
      schema: z.object({
        attachmentId: z.string().uuid(),
      }),
      async run(ctx, raw) {
        const p = raw as { attachmentId: string };
        const { buffer, filename, mimeType } = await d.assistantAttachments.getStagedBuffer(
          p.attachmentId,
          ctx.organizationId,
          ctx.userId,
        );
        const { text, note } = await extractAttachmentText(buffer, mimeType, filename);
        return { text: text.slice(0, 120_000), note, filename, mimeType };
      },
    },
    {
      name: 'summarize_attachment',
      description: 'Resume el texto extraíble de un adjunto (vía read_attachment internamente).',
      mutation: false,
      requiredPermissions: null,
      schema: z.object({
        attachmentId: z.string().uuid(),
        maxBullets: z.number().int().min(3).max(20).optional().default(8),
      }),
      async run(ctx, raw) {
        const p = raw as { attachmentId: string; maxBullets?: number };
        const { buffer, filename, mimeType } = await d.assistantAttachments.getStagedBuffer(
          p.attachmentId,
          ctx.organizationId,
          ctx.userId,
        );
        const { text, note } = await extractAttachmentText(buffer, mimeType, filename);
        if (!text?.trim()) return { summary: null, note: note || 'Sin texto' };
        const clipped = text.length > 14000 ? `${text.slice(0, 14000)}\n…` : text;
        const out = await d.llm.chatCompletionJson({
          messages: [
            {
              role: 'user',
              content: `Resume en ${p.maxBullets ?? 8} viñetas en español:\n\n${clipped}`,
            },
          ],
          options: { temperature: 0.35, maxTokens: 1200 },
        });
        const content =
          (out as any).choices?.[0]?.message?.content ??
          (out as any).choices?.[0]?.message?.parts?.[0]?.text;
        return { summary: typeof content === 'string' ? content : JSON.stringify(content) };
      },
    },
    {
      name: 'extract_key_facts_attachment',
      description: 'Extrae hechos clave (JSON) de un adjunto de texto.',
      mutation: false,
      requiredPermissions: null,
      schema: z.object({
        attachmentId: z.string().uuid(),
      }),
      async run(ctx, raw) {
        const p = raw as { attachmentId: string };
        const { buffer, filename, mimeType } = await d.assistantAttachments.getStagedBuffer(
          p.attachmentId,
          ctx.organizationId,
          ctx.userId,
        );
        const { text, note } = await extractAttachmentText(buffer, mimeType, filename);
        if (!text?.trim()) return { facts: null, note: note || 'Sin texto' };
        const clipped = text.length > 12000 ? `${text.slice(0, 12000)}\n…` : text;
        const out = await d.llm.chatCompletionJson({
          messages: [
            {
              role: 'user',
              content: `Del siguiente texto, devuelve SOLO un JSON con claves: parties, dates, amounts, requests (array de strings). Texto:\n\n${clipped}`,
            },
          ],
          options: { temperature: 0.2, maxTokens: 2000 },
        });
        const content =
          (out as any).choices?.[0]?.message?.content ??
          (out as any).choices?.[0]?.message?.parts?.[0]?.text;
        return { facts: typeof content === 'string' ? content : JSON.stringify(content) };
      },
    },

    {
      name: 'archive_attachment',
      description: 'Archiva un adjunto del chat en una carpeta del expediente (subida a documentos).',
      mutation: true,
      requiredPermissions: ['document:create'],
      schema: z.object({
        attachmentId: z.string().uuid(),
        trackableId: z.string().uuid(),
        folderId: z.string().uuid(),
        title: z.string().optional(),
        workflowItemId: z.string().uuid().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as {
          attachmentId: string;
          trackableId: string;
          folderId: string;
          title?: string;
          workflowItemId?: string;
        };
        const { buffer, filename, mimeType } = await d.assistantAttachments.getStagedBuffer(
          p.attachmentId,
          ctx.organizationId,
          ctx.userId,
        );
        const file = {
          buffer,
          originalname: filename,
          mimetype: mimeType,
          size: buffer.length,
        } as Express.Multer.File;
        const doc = await d.documents.uploadDocument(file, {
          title: (p.title || filename).slice(0, 500),
          folderId: p.folderId,
          trackableId: p.trackableId,
          workflowItemId: p.workflowItemId,
          organizationId: ctx.organizationId,
          userId: ctx.userId,
        });
        await d.assistantAttachments.markArchived(doc.id, p.attachmentId, ctx.organizationId);
        return { documentId: doc.id, title: doc.title };
      },
    },
    {
      name: 'archive_attachments_batch',
      description: 'Archiva varios adjuntos en batch (misma confirmación).',
      mutation: true,
      requiredPermissions: ['document:create'],
      schema: z.object({
        entries: z.array(
          z.object({
            attachmentId: z.string().uuid(),
            trackableId: z.string().uuid(),
            folderId: z.string().uuid(),
            title: z.string().optional(),
            workflowItemId: z.string().uuid().optional(),
          }),
        ),
      }),
      async run(ctx, raw) {
        const p = raw as {
          entries: Array<{
            attachmentId: string;
            trackableId: string;
            folderId: string;
            title?: string;
            workflowItemId?: string;
          }>;
        };
        const results: unknown[] = [];
        for (const e of p.entries) {
          const { buffer, filename, mimeType } = await d.assistantAttachments.getStagedBuffer(
            e.attachmentId,
            ctx.organizationId,
            ctx.userId,
          );
          const file = {
            buffer,
            originalname: filename,
            mimetype: mimeType,
            size: buffer.length,
          } as Express.Multer.File;
          const doc = await d.documents.uploadDocument(file, {
            title: (e.title || filename).slice(0, 500),
            folderId: e.folderId,
            trackableId: e.trackableId,
            workflowItemId: e.workflowItemId,
            organizationId: ctx.organizationId,
            userId: ctx.userId,
          });
          await d.assistantAttachments.markArchived(doc.id, e.attachmentId, ctx.organizationId);
          results.push({ documentId: doc.id, title: doc.title, attachmentId: e.attachmentId });
        }
        return { results };
      },
    },

    {
      name: 'create_document_with_content',
      description:
        'Crea un documento breve con texto (notas o cuerpo corto). Para **escritos legales** con cuerpo completo usa **draft_brief**.',
      mutation: true,
      requiredPermissions: ['document:create'],
      schema: z.object({
        title: z.string().min(1),
        trackableId: z.string().uuid(),
        folderId: z.string().uuid().optional(),
        bodyMarkdown: z.string().optional(),
        workflowItemId: z.string().uuid().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as {
          title: string;
          trackableId: string;
          folderId?: string;
          bodyMarkdown?: string;
          workflowItemId?: string;
        };
        let folderId = p.folderId;
        if (!folderId) {
          const tree = await d.folders.getFolderTree(p.trackableId);
          const root = firstRootFolderId(tree);
          if (!root) throw new BadRequestException('No hay carpetas en el expediente');
          folderId = root;
        }
        return d.documents.createBlankDocument({
          title: p.title,
          folderId,
          trackableId: p.trackableId,
          workflowItemId: p.workflowItemId,
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          initialContentText: p.bodyMarkdown,
        });
      },
    },
    {
      name: 'draft_brief',
      description:
        'Redacta un escrito con cuerpo visible en el editor (genera DOCX). Requiere userInstructions. Modos: from_sources (IDs de documentos del mismo expediente), from_template (plantilla con {{vars}}), from_knowledge (texto de documentos indexados de la organización).',
      mutation: true,
      requiredPermissions: ['document:create'],
      schema: z
        .object({
          title: z.string().min(1),
          trackableId: z.string().uuid(),
          folderId: z.string().uuid().optional(),
          workflowItemId: z.string().uuid().optional(),
          mode: z.enum(['from_sources', 'from_template', 'from_knowledge']),
          sourceDocumentIds: z.array(z.string().uuid()).max(5).optional(),
          templateId: z.string().uuid().optional(),
          variables: z.record(z.string(), z.string()).optional(),
          userInstructions: z.string().min(1),
          style: z.enum(['formal_legal_pe', 'neutral']).optional(),
        })
        .refine(
          (v) => v.mode !== 'from_sources' || (v.sourceDocumentIds && v.sourceDocumentIds.length > 0),
          { message: 'sourceDocumentIds requerido para from_sources', path: ['sourceDocumentIds'] },
        )
        .refine((v) => v.mode !== 'from_template' || Boolean(v.templateId), {
          message: 'templateId requerido para from_template',
          path: ['templateId'],
        }),
      async run(ctx, raw) {
        const p = raw as {
          title: string;
          trackableId: string;
          folderId?: string;
          workflowItemId?: string;
          mode: 'from_sources' | 'from_template' | 'from_knowledge';
          sourceDocumentIds?: string[];
          templateId?: string;
          variables?: Record<string, string>;
          userInstructions: string;
          style?: 'formal_legal_pe' | 'neutral';
        };
        let folderId = p.folderId;
        if (!folderId) {
          const tree = await d.folders.getFolderTree(p.trackableId);
          const root = firstRootFolderId(tree);
          if (!root) throw new BadRequestException('No hay carpetas en el expediente');
          folderId = root;
        }

        const styleNote =
          p.style === 'neutral'
            ? 'Tono neutro y claro, sin exceso de formalismo jurídico.'
            : 'Tono formal de escrito jurídico en español (Perú): demandas, recursos, escritos de fiscalía u órganos administrativos cuando aplique.';

        let contextBlock = '';
        const usedSources: string[] = [];
        let usedTemplate = false;
        let usedKnowledgeCount = 0;

        if (p.mode === 'from_sources') {
          for (const id of (p.sourceDocumentIds ?? []).slice(0, 5)) {
            const doc = await loadDocumentForTool(d, id, ctx.organizationId);
            if (doc.trackableId && doc.trackableId !== p.trackableId) {
              throw new BadRequestException(
                `El documento fuente «${doc.title}» no pertenece al expediente indicado`,
              );
            }
            const body = doc.contentText.slice(0, 4000);
            contextBlock += `### ${doc.title} (id: ${doc.id})\n${body}\n\n---\n\n`;
            usedSources.push(id);
          }
        } else if (p.mode === 'from_template') {
          const src = await loadDocumentForTool(d, p.templateId!, ctx.organizationId);
          let text = src.contentText;
          for (const [k, v] of Object.entries(p.variables ?? {})) {
            text = text.split(`{{${k}}}`).join(String(v));
          }
          contextBlock = `### Texto base (plantilla)\n${text.slice(0, 20_000)}`;
          usedTemplate = true;
        } else {
          const q = `${p.title}\n${p.userInstructions}`;
          const kb = await d.documents.retrieveOrgKnowledge(ctx.organizationId, q, {
            trackableId: p.trackableId,
            limit: 5,
          });
          usedKnowledgeCount = kb.length;
          contextBlock = kb
            .map((row, i) => `### Referencia ${i + 1}: ${row.title}\n${row.snippet}`)
            .join('\n\n');
        }

        const systemPrompt = `Eres redactor legal para un estudio en Perú. ${styleNote}
Redacta el documento solicitado usando el contexto proporcionado cuando exista. No inventes números de expediente, fechas concretas ni citas legales que no aparezcan en el contexto; si falta un dato, escribe [por completar].
Devuelve ÚNICAMENTE un objeto JSON (sin texto antes ni después, sin bloques markdown) con esta forma exacta:
{"html":"<fragmento HTML>","textPlain":"<mismo contenido en texto plano para índice>"}
El campo html debe ser solo un fragmento (sin etiquetas html ni body): usa h2, h3, p, ul, ol, li, strong, em, br.
El campo textPlain debe ser el mismo contenido sin etiquetas, en párrafos separados por saltos de línea dobles.`;

        const userContent = `Título del documento: ${p.title}\n\nInstrucciones del usuario:\n${p.userInstructions}\n\n---\nContexto / fuentes:\n${contextBlock || '(sin contexto adicional — redacta según instrucciones y buenas prácticas.)'}`;

        const data = (await d.llm.chatCompletionJson({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent.slice(0, 120_000) },
          ],
          options: {
            temperature: 0.35,
            maxTokens: 8192,
            timeoutMs: 120_000,
            model: d.config.get<string>('ASSISTANT_MODEL') || undefined,
          },
        })) as Record<string, unknown>;

        let parsed: { html: string; textPlain?: string };
        try {
          parsed = parseDraftBriefLlmJson(extractLlmMessageContent(data));
        } catch (err) {
          throw new BadRequestException(
            err instanceof Error ? err.message : 'No se pudo interpretar la respuesta del modelo',
          );
        }

        const plain =
          parsed.textPlain?.trim() ||
          stripHtmlToPlain(parsed.html).slice(0, 500_000);

        const doc = await d.documents.createDocumentFromHtml({
          title: p.title,
          html: parsed.html,
          folderId,
          trackableId: p.trackableId,
          workflowItemId: p.workflowItemId,
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          contentTextOverride: plain,
          assistantDraft: {
            mode: p.mode,
            extra: {
              sourceDocumentIds: usedSources,
              templateId: p.templateId,
              usedKnowledgeCount,
            },
          },
        });

        return {
          documentId: doc.id,
          title: doc.title,
          openPath: `/documents/${doc.id}/edit`,
          usedSources,
          usedTemplate,
          usedKnowledgeCount,
        };
      },
    },
    {
      name: 'update_document_content',
      description: 'Actualiza el texto indexado de un documento (reemplazar o anexar).',
      mutation: true,
      requiredPermissions: ['document:update'],
      schema: z.object({
        documentId: z.string().uuid(),
        contentText: z.string(),
        mode: z.enum(['replace', 'append']),
      }),
      async run(ctx, raw) {
        const p = raw as { documentId: string; contentText: string; mode: 'replace' | 'append' };
        return d.documents.updateDocumentContentText(p.documentId, ctx.organizationId, {
          contentText: p.contentText,
          mode: p.mode,
        });
      },
    },
    {
      name: 'draft_document_from_template',
      description: 'Copia una plantilla a un expediente y sustituye {{variables}} en el texto.',
      mutation: true,
      requiredPermissions: ['document:create'],
      schema: z.object({
        templateId: z.string().uuid(),
        targetTrackableId: z.string().uuid(),
        variables: z.record(z.string(), z.string()).optional(),
        title: z.string().optional(),
        workflowItemId: z.string().uuid().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as {
          templateId: string;
          targetTrackableId: string;
          variables?: Record<string, string>;
          title?: string;
          workflowItemId?: string;
        };
        const tree = await d.folders.getFolderTree(p.targetTrackableId);
        const folderId = firstRootFolderId(tree);
        if (!folderId) throw new BadRequestException('No hay carpetas en el expediente');
        const src = await d.documents.findOne(p.templateId);
        let text = String((src as any).contentText || '');
        for (const [k, v] of Object.entries(p.variables || {})) {
          text = text.split(`{{${k}}}`).join(String(v));
        }
        const copy = await d.documents.copyAsTemplate(
          p.templateId,
          folderId,
          p.workflowItemId,
          ctx.userId,
          ctx.organizationId,
          p.targetTrackableId,
        );
        if (p.title) {
          await d.documents.patchDocument(copy.id, { title: p.title }, ctx.organizationId);
        }
        await d.documents.updateDocumentContentText(copy.id, ctx.organizationId, { contentText: text, mode: 'replace' });
        return { documentId: copy.id, title: (await d.documents.findOne(copy.id)).title };
      },
    },

    {
      name: 'link_client_to_trackable',
      description: 'Vincula un cliente CRM a un expediente.',
      mutation: true,
      requiredPermissions: ['trackable:update'],
      schema: z.object({
        trackableId: z.string().uuid(),
        clientId: z.string().uuid(),
      }),
      async run(ctx, raw) {
        const p = raw as { trackableId: string; clientId: string };
        return d.trackables.patchTrackable(p.trackableId, { clientId: p.clientId } as any);
      },
    },
    {
      name: 'unlink_client_from_trackable',
      description: 'Quita el cliente vinculado al expediente.',
      mutation: true,
      requiredPermissions: ['trackable:update'],
      schema: z.object({
        trackableId: z.string().uuid(),
      }),
      async run(ctx, raw) {
        const p = raw as { trackableId: string };
        return d.trackables.patchTrackable(p.trackableId, { clientId: null } as any);
      },
    },
    {
      name: 'move_document',
      description: 'Mueve un documento a otra carpeta del mismo expediente.',
      mutation: true,
      requiredPermissions: ['document:update'],
      schema: z.object({
        documentId: z.string().uuid(),
        targetFolderId: z.string().uuid(),
      }),
      async run(ctx, raw) {
        const p = raw as { documentId: string; targetFolderId: string };
        return d.documents.moveDocumentToFolder(p.documentId, p.targetFolderId, ctx.organizationId);
      },
    },
    {
      name: 'rename_document',
      description: 'Renombra el título de un documento.',
      mutation: true,
      requiredPermissions: ['document:update'],
      schema: z.object({
        documentId: z.string().uuid(),
        title: z.string().min(1),
      }),
      async run(ctx, raw) {
        const p = raw as { documentId: string; title: string };
        return d.documents.patchDocument(p.documentId, { title: p.title }, ctx.organizationId);
      },
    },
    {
      name: 'delete_document',
      description: 'Mueve un documento a la papelera (soft delete).',
      mutation: true,
      requiredPermissions: ['document:update'],
      schema: z.object({
        documentId: z.string().uuid(),
      }),
      async run(ctx, raw) {
        const p = raw as { documentId: string };
        await d.documents.softRemove(p.documentId);
        return { ok: true };
      },
    },
    {
      name: 'generate_email_draft',
      description: 'Genera borrador de correo (asunto + cuerpo) según propósito.',
      mutation: false,
      requiredPermissions: null,
      schema: z.object({
        purpose: z.string().min(1),
        to: z.string().optional(),
        trackableId: z.string().uuid().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as { purpose: string; to?: string; trackableId?: string };
        let ctxLine = '';
        if (p.trackableId) {
          const t = await d.trackables.findOne(p.trackableId);
          ctxLine = `Expediente: ${(t as any).title}\n`;
        }
        const out = await d.llm.chatCompletionJson({
          messages: [
            {
              role: 'user',
              content: `Escribe un borrador de email profesional en español.\n${ctxLine}Propósito: ${p.purpose}\nDestinatario: ${p.to || '(no indicado)'}\nDevuelve JSON con keys subject, body (markdown).`,
            },
          ],
          options: { temperature: 0.45, maxTokens: 1500 },
        });
        const content =
          (out as any).choices?.[0]?.message?.content ??
          (out as any).choices?.[0]?.message?.parts?.[0]?.text;
        return { draft: typeof content === 'string' ? content : JSON.stringify(content) };
      },
    },
    {
      name: 'send_whatsapp_to_me',
      description:
        'Envía un mensaje de texto al WhatsApp personal del usuario (número verificado en Alega). Solo desde la app web.',
      mutation: true,
      requiredPermissions: ['whatsapp:send_to_self'],
      schema: z.object({
        text: z.string().min(1).max(3800),
      }),
      async run(ctx, raw) {
        const p = raw as { text: string };
        const to = await d.whatsappNotify.findVerifiedPhoneForUser(ctx.organizationId, ctx.userId);
        if (!to) {
          return { ok: false, error: 'No hay WhatsApp verificado para tu usuario.' };
        }
        await d.whatsappNotify.send(ctx.organizationId, to, p.text);
        return { ok: true };
      },
    },
    {
      name: 'send_trackable_summary_via_whatsapp',
      description:
        'Genera un resumen del expediente y lo envía al WhatsApp del usuario. Solo desde la app web.',
      mutation: true,
      requiredPermissions: ['trackable:read', 'whatsapp:send_to_self'],
      schema: z.object({
        trackableId: z.string().uuid(),
      }),
      async run(ctx, raw) {
        const p = raw as { trackableId: string };
        const to = await d.whatsappNotify.findVerifiedPhoneForUser(ctx.organizationId, ctx.userId);
        if (!to) {
          return { ok: false, error: 'No hay WhatsApp verificado para tu usuario.' };
        }
        const tr = await d.trackables.findOne(p.trackableId, {
          populate: ['client', 'assignedTo', 'createdBy'] as any,
        });
        const items = await d.workflowItems.findAll(
          { trackable: p.trackableId, organization: ctx.organizationId } as any,
          { page: 1, limit: 40 },
          {},
        );
        const lines: string[] = [];
        lines.push(`# ${(tr as any).title}`);
        lines.push(`Estado: ${(tr as any).status}`);
        if ((tr as any).description) lines.push(`\n## Descripción\n${(tr as any).description}`);
        lines.push('\n## Tareas recientes');
        for (const wi of (items as any).data || []) {
          const sk = wi.stateKey ?? wi.status;
          lines.push(`- ${wi.title} (${sk})`);
        }
        const markdown = lines.join('\n');
        await d.whatsappNotify.send(
          ctx.organizationId,
          to,
          `📁 Resumen expediente\n\n${markdown}`,
        );
        return { ok: true };
      },
    },
    {
      name: 'send_document_via_whatsapp',
      description:
        'Envía el documento al WhatsApp del usuario (o a otro con WhatsApp verificado si tienes whatsapp:send_to_others). En la app web manda un enlace a Alega; en el canal WhatsApp adjunta el archivo o un enlace firmado si es muy grande.',
      mutation: true,
      requiredPermissions: ['document:read', 'whatsapp:send_to_self'],
      schema: z.object({
        documentId: z.string().uuid(),
        targetUserId: z.string().uuid().optional(),
      }),
      async run(ctx, raw) {
        const p = raw as { documentId: string; targetUserId?: string };
        if (p.targetUserId && !ctx.permissions.includes('whatsapp:send_to_others')) {
          throw new ForbiddenException('No tienes permiso para enviar WhatsApp a otros usuarios.');
        }
        const uid = p.targetUserId ?? ctx.userId;
        const to = await d.whatsappNotify.findVerifiedPhoneForUser(ctx.organizationId, uid);
        if (!to) {
          return {
            ok: false,
            error: p.targetUserId
              ? 'Ese usuario no tiene WhatsApp verificado.'
              : 'No hay WhatsApp verificado para tu usuario.',
          };
        }
        const doc = await loadDocumentForTool(d, p.documentId, ctx.organizationId);

        if (ctx.channel === 'whatsapp') {
          // kind minio: archivo; kind rendered: solo contentText, DOCX en GET /api/whatsapp/media
          const meta = await d.documents.getShareMetadataForWhatsApp(p.documentId, ctx.organizationId);
          if (!meta) {
            return { ok: false, error: 'No se pudo resolver el archivo del documento.' };
          }
          const maxRaw = d.config.get<string | number>('WHATSAPP_MEDIA_MAX_BYTES');
          const maxBytes =
            maxRaw === undefined || maxRaw === '' ? 16 * 1024 * 1024 : Number(maxRaw);
          const ttlRaw = d.config.get<string | number>('WHATSAPP_MEDIA_TTL_SECONDS');
          const ttlSec = ttlRaw === undefined || ttlRaw === '' ? 600 : Number(ttlRaw);
          let token: string;
          try {
            token = d.whatsappMediaToken.sign({
              documentId: p.documentId,
              organizationId: ctx.organizationId,
              ttlSec: Number.isFinite(ttlSec) ? ttlSec : 600,
            });
          } catch {
            return {
              ok: false,
              error:
                'Falta configurar WHATSAPP_MEDIA_SECRET para enviar archivos por WhatsApp.',
            };
          }
          const base = publicApiBase(d.config);
          const url = `${base}/api/whatsapp/media/${p.documentId}?token=${encodeURIComponent(token)}`;
          const caption = (meta.filename || doc.title || 'Documento').slice(0, 1600);
          if (Number.isFinite(maxBytes) && meta.bytes > maxBytes) {
            await d.whatsappNotify.send(
              ctx.organizationId,
              to,
              `El archivo pesa más de lo que WhatsApp permite adjuntar. Enlace seguro (caduca pronto): ${url}`,
            );
            return {
              ok: true,
              channel: 'whatsapp' as const,
              sent: 'link' as const,
              assistantHint:
                'Ya se envió un mensaje de WhatsApp con el enlace https completo. Responde una frase corta (p. ej. que revise el mensaje anterior). No digas «haz clic» sin URL ni inventes enlaces.',
            };
          }
          await d.whatsappNotify.sendMedia(ctx.organizationId, to, url, caption);
          return {
            ok: true,
            channel: 'whatsapp' as const,
            sent: 'media' as const,
            assistantHint:
              'El archivo ya se envió como adjunto por WhatsApp. Responde una frase muy breve (p. ej. «Te lo acabo de enviar por aquí»). Prohibido mencionar enlaces, «haz clic» o links a la app web.',
          };
        }

        const base = (d.config.get<string>('FRONTEND_URL') || 'http://localhost:5173').replace(
          /\/?$/,
          '',
        );
        const path = doc.trackableId ? `${base}/trackables/${doc.trackableId}` : base;
        const msg = `📄 ${doc.title}\n\n${path}\n\n(id documento: ${doc.id})`;
        await d.whatsappNotify.send(ctx.organizationId, to, msg);
        return { ok: true };
      },
    },
    {
      name: 'export_trackable_brief',
      description: 'Genera un resumen estructurado del expediente (markdown).',
      mutation: false,
      requiredPermissions: ['trackable:read'],
      schema: z.object({
        trackableId: z.string().uuid(),
      }),
      async run(ctx, raw) {
        const p = raw as { trackableId: string };
        const tr = await d.trackables.findOne(p.trackableId, {
          populate: ['client', 'assignedTo', 'createdBy'] as any,
        });
        const items = await d.workflowItems.findAll(
          { trackable: p.trackableId, organization: ctx.organizationId } as any,
          { page: 1, limit: 40 },
          {},
        );
        const lines: string[] = [];
        lines.push(`# ${(tr as any).title}`);
        lines.push(`Estado: ${(tr as any).status}`);
        if ((tr as any).description) lines.push(`\n## Descripción\n${(tr as any).description}`);
        lines.push('\n## Tareas recientes');
        for (const wi of (items as any).data || []) {
          const sk = wi.stateKey ?? wi.status;
          lines.push(`- ${wi.title} (${sk})`);
        }
        return { markdown: lines.join('\n') };
      },
    },
  ];
}
