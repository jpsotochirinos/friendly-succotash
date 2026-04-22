import { defineStore } from 'pinia';
import { ref } from 'vue';
import { makeAuthFetch } from '@/utils/makeAuthFetch';
import { useNotificationsStore } from '@/stores/notifications.store';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  name?: string;
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type?: string;
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  attachmentIds?: string[];
}

export type UiMessage =
  | { kind: 'user'; text: string; attachmentIds?: string[] }
  | { kind: 'assistant'; text: string; messageId?: string; feedback?: 'up' | 'down' }
  | { kind: 'system'; text: string }
  | {
      kind: 'pending';
      resolved?: boolean;
      toolCalls: Array<{ id: string; name: string; arguments: unknown }>;
      assistantMessage: ChatMessage;
    }
  | { kind: 'tool'; name: string; ok: boolean; summary: string; result?: unknown }
  | {
      kind: 'widget';
      id: string;
      name: string;
      spec: Record<string, unknown>;
      resolved?: boolean;
    };

const MUTATION_TOOLS = new Set([
  'create_client',
  'create_trackable',
  'update_trackable',
  'create_workflow_item',
  'update_workflow_item',
  'transition_workflow_item',
  'add_workflow_comment',
  'create_folder',
  'update_folder',
  'create_blank_document',
  'archive_attachment',
  'archive_attachments_batch',
  'create_document_with_content',
  'update_document_content',
  'draft_document_from_template',
  'draft_brief',
  'link_client_to_trackable',
  'unlink_client_from_trackable',
  'move_document',
  'rename_document',
  'delete_document',
]);

function storageKey(userId: string) {
  return `alega-assistant-thread-${userId}`;
}

export const useAssistantStore = defineStore('assistant', () => {
  const open = ref(false);
  const loading = ref(false);
  const uiMessages = ref<UiMessage[]>([]);
  const apiThread = ref<ChatMessage[]>([]);
  const threadId = ref<string | null>(null);
  const pendingAttachments = ref<Array<{ id: string; filename: string; mimeType: string; size: number }>>([]);
  const pendingConfirm = ref<{
    toolCalls: Array<{ id: string; name: string; arguments: unknown }>;
    assistantMessage: ChatMessage;
  } | null>(null);
  const badgeCount = ref(0);

  const fetchAuth = makeAuthFetch();

  function loadFromStorage(userId: string) {
    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        apiThread?: ChatMessage[];
        uiMessages?: UiMessage[];
        threadId?: string | null;
      };
      if (parsed.apiThread?.length) apiThread.value = parsed.apiThread;
      if (parsed.uiMessages?.length) uiMessages.value = parsed.uiMessages;
      if (parsed.threadId) threadId.value = parsed.threadId;
    } catch {
      /* ignore */
    }
  }

  function saveToStorage(userId: string) {
    try {
      localStorage.setItem(
        storageKey(userId),
        JSON.stringify({
          apiThread: apiThread.value,
          uiMessages: uiMessages.value,
          threadId: threadId.value,
        }),
      );
    } catch {
      /* ignore */
    }
  }

  function toggle() {
    open.value = !open.value;
  }

  function clear(userId: string) {
    uiMessages.value = [];
    apiThread.value = [];
    pendingConfirm.value = null;
    threadId.value = null;
    pendingAttachments.value = [];
    localStorage.removeItem(storageKey(userId));
  }

  async function refreshBadge() {
    try {
      const n = useNotificationsStore();
      await n.refreshUnread();
      badgeCount.value = n.unreadCount;
    } catch {
      /* ignore */
    }
  }

  function buildRouteContext(route: {
    name?: string | symbol | null;
    params: Record<string, string | string[]>;
    path: string;
  }) {
    const extra: Record<string, unknown> = {};
    try {
      const cal = sessionStorage.getItem('alega.assistant.calendar');
      if (cal) Object.assign(extra, JSON.parse(cal));
    } catch {
      /* ignore */
    }
    return {
      routeName: String(route.name ?? ''),
      path: route.path,
      params: route.params,
      ...extra,
    };
  }

  function parseSseLines(textBlock: string, onEvent: (ev: Record<string, unknown>) => void) {
    for (const line of textBlock.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const json = line.slice(5).trim();
      if (!json) continue;
      try {
        onEvent(JSON.parse(json) as Record<string, unknown>);
      } catch {
        /* ignore */
      }
    }
  }

  /** After interactive widget submit: inject tool result and continue the agent loop. */
  async function submitWidgetResponse(
    userId: string,
    route: Parameters<typeof buildRouteContext>[0],
    toolCallId: string,
    toolName: string,
    payload: unknown,
  ) {
    uiMessages.value = uiMessages.value.map((m) =>
      m.kind === 'widget' && m.id === toolCallId ? { ...m, resolved: true } : m,
    );
    apiThread.value.push({
      role: 'tool',
      name: toolName,
      tool_call_id: toolCallId,
      content: JSON.stringify(payload ?? null),
    });
    await send('', userId, route);
  }

  async function setMessageFeedback(messageId: string, feedback: 'up' | 'down' | 'none') {
    const fetchAuth = makeAuthFetch();
    await fetchAuth(`/api/assistant/messages/${messageId}/feedback`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback }),
    });
  }

  async function send(
    text: string,
    userId: string,
    route: Parameters<typeof buildRouteContext>[0],
    options?: { confirmIds?: string[] },
  ) {
    const pendingAttachIds = pendingAttachments.value.map((a) => a.id);
    const lastRole = apiThread.value[apiThread.value.length - 1]?.role;
    const toolContinuation = lastRole === 'tool';
    if (
      !text.trim() &&
      !options?.confirmIds?.length &&
      !pendingAttachIds.length &&
      !toolContinuation
    ) {
      return;
    }

    loading.value = true;
    pendingConfirm.value = null;

    if (options?.confirmIds?.length) {
      uiMessages.value = uiMessages.value.map((m) =>
        m.kind === 'pending' ? { ...m, resolved: true } : m,
      );
    }

    try {
      const attachIds = pendingAttachments.value.map((a) => a.id);
      if (!options?.confirmIds?.length && (text.trim() || attachIds.length)) {
        const userText = text.trim() || (attachIds.length ? '(Archivos adjuntos)' : '');
        uiMessages.value.push({
          kind: 'user',
          text: text.trim() || `${attachIds.length} adjunto(s)`,
          attachmentIds: attachIds.length ? [...attachIds] : undefined,
        });
        const userMsg: ChatMessage = { role: 'user', content: userText };
        if (attachIds.length) userMsg.attachmentIds = attachIds;
        apiThread.value.push(userMsg);
        pendingAttachments.value = [];
      }

      const body: Record<string, unknown> = {
        messages: apiThread.value,
        context: buildRouteContext(route),
      };
      if (threadId.value) body.threadId = threadId.value;
      if (attachIds.length && text.trim()) {
        body.attachmentIds = attachIds;
      }
      if (options?.confirmIds?.length) {
        body.confirmedToolCallIds = options.confirmIds;
      }

      const streamAbortMs = 300_000;
      const abortCtl = new AbortController();
      const abortTid = window.setTimeout(() => abortCtl.abort(), streamAbortMs);

      let res: Response;
      try {
        res = await fetchAuth('/api/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: abortCtl.signal,
        });
      } catch (e) {
        window.clearTimeout(abortTid);
        const msg =
          (e as Error).name === 'AbortError'
            ? `La solicitud superó ${Math.round(streamAbortMs / 1000)}s y se canceló.`
            : (e as Error).message;
        uiMessages.value.push({ kind: 'assistant', text: msg });
        return;
      }
      window.clearTimeout(abortTid);

      if (!res.ok) {
        uiMessages.value.push({
          kind: 'assistant',
          text: `Error ${res.status}: no se pudo contactar al asistente.`,
        });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        uiMessages.value.push({ kind: 'assistant', text: 'Sin cuerpo de respuesta.' });
        return;
      }

      const decoder = new TextDecoder();
      let carry = '';
      let assistantBuf = '';
      let sawNeedsConfirmation = false;
      let assistantCommitted = false;
      let streamAssistantIndex: number | null = null;

      const handleEvent = (ev: Record<string, unknown>) => {
        const t = ev.type as string;
        if (t === 'thread' && typeof ev.threadId === 'string') {
          threadId.value = ev.threadId as string;
        }
        if (t === 'assistant_tool_calls') {
          streamAssistantIndex = null;
          const msg = ev.message as ChatMessage | undefined;
          if (msg?.role !== 'assistant' || !msg.tool_calls?.length) return;
          const sig = [...msg.tool_calls]
            .map((tc) => tc.id)
            .sort()
            .join(',');
          const last = apiThread.value[apiThread.value.length - 1];
          if (last?.role === 'assistant' && last.tool_calls?.length) {
            const lastSig = [...last.tool_calls].map((tc) => tc.id).sort().join(',');
            if (lastSig === sig) return;
          }
          apiThread.value = [...apiThread.value, msg];
        }
        if (t === 'assistant_delta' && typeof ev.chunk === 'string') {
          const chunk = ev.chunk as string;
          assistantBuf += chunk;
          if (!sawNeedsConfirmation) {
            if (streamAssistantIndex === null) {
              uiMessages.value.push({ kind: 'assistant', text: chunk });
              streamAssistantIndex = uiMessages.value.length - 1;
            } else {
              const m = uiMessages.value[streamAssistantIndex];
              if (m && m.kind === 'assistant') {
                m.text += chunk;
              }
            }
          }
        }
        if (t === 'assistant_message' && typeof ev.content === 'string') {
          const full = ev.content as string;
          assistantBuf = full;
          if (!sawNeedsConfirmation && full) {
            if (streamAssistantIndex !== null) {
              const m = uiMessages.value[streamAssistantIndex];
              if (m && m.kind === 'assistant') {
                m.text = full;
              }
            } else {
              uiMessages.value.push({ kind: 'assistant', text: full });
            }
            apiThread.value.push({ role: 'assistant', content: full });
            assistantCommitted = true;
          }
          streamAssistantIndex = null;
        }
        if (t === 'needs_confirmation') {
          streamAssistantIndex = null;
          sawNeedsConfirmation = true;
          const am = ev.assistantMessage as ChatMessage;
          const tcs = ev.toolCalls as Array<{ id: string; name: string; arguments: unknown }>;
          pendingConfirm.value = { assistantMessage: am, toolCalls: tcs };
          apiThread.value = [...apiThread.value, am];
          uiMessages.value.push({
            kind: 'pending',
            toolCalls: tcs,
            assistantMessage: am,
          });
        }
        if (t === 'ui_widget') {
          streamAssistantIndex = null;
          const id = String(ev.id ?? '');
          const name = String(ev.name ?? '');
          const spec = (ev.spec as Record<string, unknown>) || {};
          if (id && name) {
            uiMessages.value.push({ kind: 'widget', id, name, spec });
          }
        }
        if (t === 'tool_result') {
          streamAssistantIndex = null;
          const name = String(ev.name ?? '');
          const ok = Boolean(ev.ok);
          uiMessages.value.push({
            kind: 'tool',
            name,
            ok,
            summary: ok ? 'Completado' : String(ev.error ?? 'Error'),
            result: ok ? ev.result : undefined,
          });
          if (ok && MUTATION_TOOLS.has(name)) {
            window.dispatchEvent(new CustomEvent('alega-assistant-mutation', { detail: { name } }));
          }
          const id = String(ev.id ?? '');
          const result = ev.result;
          if (id && name) {
            const content = ok
              ? JSON.stringify(result ?? null)
              : JSON.stringify({ error: String(ev.error ?? 'Error') });
            apiThread.value.push({
              role: 'tool',
              name,
              tool_call_id: id,
              content,
            });
          }
        }
        if (t === 'error') {
          streamAssistantIndex = null;
          uiMessages.value.push({
            kind: 'assistant',
            text: `Error: ${String(ev.message ?? 'desconocido')}`,
          });
        }
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          carry += decoder.decode(value, { stream: true });
          const parts = carry.split('\n\n');
          carry = parts.pop() ?? '';
          for (const block of parts) {
            parseSseLines(block, handleEvent);
          }
        }
        if (carry.trim()) {
          parseSseLines(carry, handleEvent);
        }
      } catch (e) {
        uiMessages.value.push({
          kind: 'assistant',
          text:
            (e as Error).name === 'AbortError'
              ? 'Conexión interrumpida.'
              : `Error al leer la respuesta: ${(e as Error).message}`,
        });
      }

      if (assistantBuf && !sawNeedsConfirmation && !assistantCommitted) {
        uiMessages.value.push({ kind: 'assistant', text: assistantBuf });
        apiThread.value.push({ role: 'assistant', content: assistantBuf });
      }

      saveToStorage(userId);
    } finally {
      loading.value = false;
      void refreshBadge();
    }
  }

  async function confirmPending(userId: string, route: Parameters<typeof buildRouteContext>[0]) {
    if (!pendingConfirm.value) return;
    const ids = pendingConfirm.value.toolCalls.map((t) => t.id);
    pendingConfirm.value = null;
    await send('', userId, route, { confirmIds: ids });
  }

  function cancelPending() {
    pendingConfirm.value = null;
    const last = apiThread.value[apiThread.value.length - 1];
    if (last?.role === 'assistant' && last.tool_calls?.length) {
      apiThread.value.pop();
    }
    uiMessages.value = uiMessages.value.filter((m) => m.kind !== 'pending');
  }

  function addPendingAttachment(meta: { id: string; filename: string; mimeType: string; size: number }) {
    pendingAttachments.value = [...pendingAttachments.value, meta];
  }

  function removePendingAttachment(id: string) {
    pendingAttachments.value = pendingAttachments.value.filter((a) => a.id !== id);
  }

  return {
    open,
    loading,
    uiMessages,
    apiThread,
    threadId,
    pendingAttachments,
    pendingConfirm,
    badgeCount,
    toggle,
    clear,
    send,
    confirmPending,
    cancelPending,
    loadFromStorage,
    saveToStorage,
    refreshBadge,
    buildRouteContext,
    submitWidgetResponse,
    setMessageFeedback,
    addPendingAttachment,
    removePendingAttachment,
  };
});
