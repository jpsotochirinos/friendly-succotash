/** Spanish labels for assistant tool names (confirmation UI). */
export const ASSISTANT_TOOL_LABELS: Record<string, string> = {
  get_calendar_range: 'Consultar calendario / rango de fechas',
  upcoming_deadlines: 'Ver próximos vencimientos',
  overdue_items: 'Ver tareas vencidas',
  my_pending_actions: 'Ver mis pendientes',
  list_trackables: 'Listar expedientes',
  list_clients: 'Listar clientes',
  get_trackable: 'Ver un expediente',
  create_client: 'Crear cliente',
  create_trackable: 'Crear expediente',
  update_trackable: 'Actualizar expediente',
  list_workflow_items: 'Listar tareas del expediente',
  get_workflow_item: 'Ver una tarea',
  search_organization_users: 'Buscar usuario por nombre',
  list_document_templates: 'Listar plantillas de documento',
  create_workflow_item: 'Crear tarea',
  update_workflow_item: 'Actualizar tarea',
  transition_workflow_item: 'Cambiar estado de la tarea',
  add_workflow_comment: 'Añadir comentario a la tarea',
  search_documents: 'Buscar documentos',
  list_folder_tree: 'Ver carpetas',
  create_folder: 'Crear carpeta',
  update_folder: 'Actualizar carpeta',
  create_blank_document: 'Crear documento en blanco',
  summarize_document: 'Resumir documento',
  list_notifications: 'Listar notificaciones',
  unread_notification_count: 'Contar notificaciones sin leer',
  ui_ask_choice: 'Elegir una opción',
  ui_ask_multi_choice: 'Elegir varias opciones',
  ui_ask_confirm: 'Confirmar sí/no',
  ui_ask_search: 'Buscar y elegir',
  ui_ask_form: 'Completar formulario',
  ui_ask_file_placement: 'Indicar carpeta por archivo',
  read_attachment: 'Leer adjunto',
  summarize_attachment: 'Resumir adjunto',
  extract_key_facts_attachment: 'Extraer datos del adjunto',
  archive_attachment: 'Archivar adjunto en carpeta',
  archive_attachments_batch: 'Archivar adjuntos (lote)',
  create_document_with_content: 'Crear documento con texto',
  draft_brief: 'Redactar escrito (DOCX)',
  update_document_content: 'Actualizar texto del documento',
  draft_document_from_template: 'Borrador desde plantilla',
  link_client_to_trackable: 'Vincular cliente al expediente',
  unlink_client_from_trackable: 'Quitar cliente del expediente',
  move_document: 'Mover documento',
  rename_document: 'Renombrar documento',
  delete_document: 'Eliminar documento',
  generate_email_draft: 'Borrador de email',
  export_trackable_brief: 'Exportar resumen del expediente',
};

function safeParseArgs(args: unknown): Record<string, unknown> | null {
  if (args && typeof args === 'object' && !Array.isArray(args)) return args as Record<string, unknown>;
  if (typeof args === 'string') {
    try {
      const j = JSON.parse(args) as unknown;
      return j && typeof j === 'object' && !Array.isArray(j) ? (j as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** One-line friendly description for a pending tool call (confirmation card). */
export function describePendingToolCall(tc: {
  name: string;
  arguments?: unknown;
}): string {
  const base = ASSISTANT_TOOL_LABELS[tc.name] ?? tc.name.replace(/_/g, ' ');
  const a = safeParseArgs(tc.arguments);
  if (!a) return base;

  const title = typeof a.title === 'string' ? a.title.trim() : '';
  const t = typeof a.trackableId === 'string' ? a.trackableId.slice(0, 8) : '';

  switch (tc.name) {
    case 'create_workflow_item':
      return title ? `${base}: «${title}»` : base;
    case 'update_workflow_item':
      return title ? `${base}: «${title}»` : base;
    case 'create_client': {
      const n = typeof a.name === 'string' ? a.name.trim() : '';
      return n ? `${base}: «${n}»` : base;
    }
    case 'create_trackable':
      return title ? `${base}: «${title}»` : base;
    case 'update_trackable':
      return title ? `${base}: «${title}»` : base;
    case 'create_folder':
      return typeof a.name === 'string' && a.name ? `${base}: «${a.name}»` : base;
    case 'create_blank_document':
    case 'create_document_with_content':
    case 'draft_brief':
      return title ? `${base}: «${title}»` : base;
    case 'archive_attachment':
    case 'archive_attachments_batch':
      return base;
    case 'add_workflow_comment':
      return base;
    case 'transition_workflow_item':
      return typeof a.targetStatus === 'string' ? `${base} → ${a.targetStatus}` : base;
    default:
      if (title) return `${base}: «${title}»`;
      if (t) return `${base} (ref. …${t})`;
      return base;
  }
}

/** Tool result row in chat (after execution). */
export function toolResultFriendlyLine(m: {
  name: string;
  ok: boolean;
  summary: string;
  result?: unknown;
}): string {
  const label = ASSISTANT_TOOL_LABELS[m.name] ?? m.name.replace(/_/g, ' ');
  if (m.ok && m.name === 'draft_brief' && m.result && typeof m.result === 'object') {
    const t = (m.result as { title?: string }).title;
    if (typeof t === 'string' && t.trim()) {
      return `${label} · «${t.trim()}»`;
    }
  }
  const status = m.ok
    ? m.summary === 'Completado'
      ? 'Listo'
      : m.summary
    : m.summary;
  return `${label} · ${status}`;
}
