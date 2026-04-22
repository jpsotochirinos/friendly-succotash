<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import Button from 'primevue/button';
import { makeAuthFetch } from '@/utils/makeAuthFetch';
import { useAssistantStore } from '@/stores/assistant.store';
import {
  deleteAssistantThread,
  getAssistantThreadsRetention,
} from '@/api/assistant';

interface ThreadRow {
  id: string;
  title?: string;
  lastMessageAt?: string;
  updatedAt?: string;
}

const store = useAssistantStore();
const fetchAuth = makeAuthFetch();
const threads = ref<ThreadRow[]>([]);
const loading = ref(false);
const deletingId = ref<string | null>(null);
const retentionDays = ref<number>(0);

async function load() {
  loading.value = true;
  try {
    const res = await fetchAuth('/api/assistant/threads?limit=30');
    if (!res.ok) return;
    const j = (await res.json()) as { data?: ThreadRow[] };
    threads.value = j.data ?? [];
  } catch {
    threads.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadRetention() {
  try {
    const r = await getAssistantThreadsRetention();
    retentionDays.value = Number(r.retentionDays) || 0;
  } catch {
    retentionDays.value = 0;
  }
}

onMounted(() => {
  void load();
  void loadRetention();
});

watch(
  () => store.open,
  (o) => {
    if (o) void load();
  },
);

function selectThread(id: string) {
  store.threadId = id;
  void loadMessages(id);
}

async function loadMessages(id: string) {
  const res = await fetchAuth(`/api/assistant/threads/${id}/messages`);
  if (!res.ok) return;
  const j = (await res.json()) as {
    data?: Array<{
      role: string;
      content?: string | null;
      toolCalls?: unknown;
      toolCallId?: string;
      toolName?: string;
      attachmentIds?: string[];
    }>;
  };
  const rows = j.data ?? [];
  store.apiThread = rows
    .filter((r) => r.role !== 'system')
    .map((r) => {
      const m: Record<string, unknown> = { role: r.role, content: r.content ?? null };
      if (r.toolCalls) m.tool_calls = r.toolCalls;
      if (r.toolCallId) m.tool_call_id = r.toolCallId;
      if (r.toolName) m.name = r.toolName;
      if (r.attachmentIds?.length) m.attachmentIds = r.attachmentIds;
      return m as any;
    });
  const uiRows = rows as Array<typeof rows[number] & { id?: string; feedback?: string }>;
  store.uiMessages = uiRows.map((r) => {
    if (r.role === 'user')
      return { kind: 'user' as const, text: String(r.content || ''), attachmentIds: r.attachmentIds };
    if (r.role === 'assistant')
      return {
        kind: 'assistant' as const,
        text: String(r.content || ''),
        messageId: r.id,
        feedback: (r.feedback as 'up' | 'down' | undefined) || undefined,
      };
    if (r.role === 'tool')
      return {
        kind: 'tool' as const,
        name: r.toolName || 'tool',
        ok: true,
        summary: 'Historial',
      };
    return { kind: 'system' as const, text: '' };
  });
}

async function newThread() {
  const res = await fetchAuth('/api/assistant/threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) return;
  const j = (await res.json()) as { id: string };
  store.threadId = j.id;
  store.uiMessages = [];
  store.apiThread = [];
  await load();
}

async function removeThread(t: ThreadRow, evt: Event) {
  evt.stopPropagation();
  evt.preventDefault();
  const label = (t.title && t.title.trim()) || 'este chat';
  if (!window.confirm(`¿Eliminar «${label}»? Esta acción no se puede deshacer.`)) return;
  deletingId.value = t.id;
  try {
    await deleteAssistantThread(t.id);
    threads.value = threads.value.filter((x) => x.id !== t.id);
    if (store.threadId === t.id) {
      store.threadId = null;
      store.uiMessages = [];
      store.apiThread = [];
    }
  } catch {
    /* swallow: mantener UX estable, el usuario puede reintentar */
  } finally {
    deletingId.value = null;
  }
}

/** Corta títulos verbosos tipo «Te envío un archivo por …» para la lista. */
function displayTitle(t: ThreadRow): string {
  const raw = (t.title || '').trim();
  if (!raw) return 'Chat';
  return raw.length > 38 ? `${raw.slice(0, 36).trim()}…` : raw;
}

/** Referencia temporal usable para ordenar/mostrar actividad. */
function threadTimestamp(t: ThreadRow): number {
  const v = t.lastMessageAt || t.updatedAt;
  if (!v) return 0;
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : 0;
}

/** Fecha relativa corta en español (sin deps externas). */
function relativeTime(t: ThreadRow): string {
  const ts = threadTimestamp(t);
  if (!ts) return '';
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return 'ahora';
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `hace ${w} sem`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `hace ${mo} mes${mo === 1 ? '' : 'es'}`;
  const y = Math.floor(d / 365);
  return `hace ${y} año${y === 1 ? '' : 's'}`;
}

/** Días restantes estimados antes de purga automática (para avisos por hilo). */
function daysUntilPurge(t: ThreadRow): number | null {
  if (!retentionDays.value) return null;
  const ts = threadTimestamp(t);
  if (!ts) return null;
  const ageDays = (Date.now() - ts) / (24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil(retentionDays.value - ageDays));
}

/** Avisar cuando quedan <= 3 días; umbral pragmático para no saturar la lista. */
function purgeHint(t: ThreadRow): string | null {
  const d = daysUntilPurge(t);
  if (d === null) return null;
  if (d <= 0) return 'Se eliminará en breve';
  if (d <= 3) return `Se eliminará en ${d} d`;
  return null;
}

const retentionNotice = computed<string | null>(() => {
  if (!retentionDays.value) return null;
  return `Los chats sin actividad se eliminan automáticamente tras ${retentionDays.value} días.`;
});
</script>

<template>
  <div
    class="assistant-threads flex flex-col border-r shrink-0 w-56"
    :style="{
      borderColor: 'var(--surface-border)',
      backgroundColor: 'var(--surface-sunken)',
      color: 'var(--fg-default)',
    }"
  >
    <div class="p-2 border-b" :style="{ borderColor: 'var(--surface-border)' }">
      <Button
        label="Nuevo"
        icon="pi pi-plus"
        size="small"
        class="w-full text-xs"
        outlined
        type="button"
        @click="newThread"
      />
    </div>

    <div class="flex-1 overflow-y-auto p-1.5 space-y-0.5">
      <div v-if="loading" class="px-2 py-3 text-[11px] text-[var(--fg-muted)]">Cargando…</div>
      <div
        v-else-if="!threads.length"
        class="px-2 py-3 text-[11px] text-[var(--fg-muted)] leading-snug"
      >
        Aún no tienes chats. Pulsa «Nuevo» para empezar.
      </div>

      <div
        v-for="t in threads"
        :key="t.id"
        class="assistant-thread-row group relative rounded-md"
        :class="{ 'assistant-thread-row--active': store.threadId === t.id }"
      >
        <button
          type="button"
          class="assistant-thread-row__btn w-full text-left pl-2 pr-8 py-1.5 rounded-md"
          :title="t.title || t.id"
          @click="selectThread(t.id)"
        >
          <span class="block text-[12px] font-medium truncate leading-tight">
            {{ displayTitle(t) }}
          </span>
          <span
            v-if="relativeTime(t) || purgeHint(t)"
            class="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--fg-muted)] truncate"
          >
            <span v-if="relativeTime(t)">{{ relativeTime(t) }}</span>
            <span
              v-if="purgeHint(t)"
              class="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400"
              :title="`Este chat se eliminará automáticamente en ${daysUntilPurge(t)} día(s) por inactividad.`"
            >
              <i class="pi pi-clock text-[9px]" />
              {{ purgeHint(t) }}
            </span>
          </span>
        </button>

        <button
          type="button"
          class="assistant-thread-row__delete absolute top-1 right-1 h-6 w-6 rounded-md flex items-center justify-center text-[var(--fg-muted)] hover:text-[var(--red-500,#dc2626)] hover:bg-[var(--surface-border)]/40"
          :disabled="deletingId === t.id"
          :aria-label="`Eliminar ${t.title || 'chat'}`"
          title="Eliminar chat"
          @click="(e) => removeThread(t, e)"
        >
          <i
            :class="deletingId === t.id ? 'pi pi-spinner pi-spin' : 'pi pi-trash'"
            class="text-[11px]"
          />
        </button>
      </div>
    </div>

    <div
      v-if="retentionNotice"
      class="shrink-0 border-t px-2 py-2 text-[10px] leading-snug text-[var(--fg-muted)] flex items-start gap-1.5"
      :style="{ borderColor: 'var(--surface-border)' }"
    >
      <i class="pi pi-info-circle mt-0.5 text-[10px]" />
      <span>{{ retentionNotice }}</span>
    </div>
  </div>
</template>

<style scoped>
.assistant-thread-row {
  transition: background-color 0.15s ease;
}

.assistant-thread-row__btn {
  display: block;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.assistant-thread-row:hover {
  background-color: color-mix(in srgb, var(--surface-border) 35%, transparent);
}

.assistant-thread-row--active {
  background-color: color-mix(in srgb, var(--accent) 14%, transparent);
}

.assistant-thread-row--active .assistant-thread-row__btn {
  color: var(--fg-default);
  font-weight: 500;
}

.assistant-thread-row__delete {
  opacity: 0;
  transition: opacity 0.12s ease, color 0.12s ease, background-color 0.12s ease;
}

.assistant-thread-row:hover .assistant-thread-row__delete,
.assistant-thread-row:focus-within .assistant-thread-row__delete {
  opacity: 1;
}

.assistant-thread-row__delete:focus-visible {
  opacity: 1;
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

/* En dispositivos táctiles no hay hover fiable: mostrar siempre la acción. */
@media (hover: none) {
  .assistant-thread-row__delete {
    opacity: 0.7;
  }
}
</style>
