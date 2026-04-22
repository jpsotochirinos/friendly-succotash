<template>
  <div v-if="user" class="pointer-events-none fixed inset-0 z-[100] flex flex-col justify-end items-end p-4 sm:p-6">
    <Transition name="fade-scale">
      <div
        v-if="store.open"
        class="pointer-events-auto flex flex-row w-full max-w-4xl h-[min(560px,78vh)] rounded-2xl border shadow-2xl overflow-hidden"
        :style="{
          borderColor: 'var(--surface-border)',
          backgroundColor: 'var(--surface-raised)',
        }"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDropFiles"
      >
        <AssistantThreadsSidebar />
        <div class="flex flex-col flex-1 min-w-0 min-h-0">
        <div
          class="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b"
          :style="{ borderColor: 'var(--surface-border)' }"
        >
          <div class="min-w-0">
            <div class="text-sm font-semibold text-[var(--fg-default)]">Asistente Alega</div>
            <div class="text-xs text-[var(--fg-muted)]">Acciones según tus permisos</div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <Button
              icon="pi pi-trash"
              text
              rounded
              type="button"
              aria-label="Limpiar conversación"
              title="Limpiar conversación"
              @click="onClear"
            />
            <Button icon="pi pi-times" text rounded type="button" aria-label="Cerrar" @click="store.toggle()" />
          </div>
        </div>

        <div ref="scrollRef" class="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
          <div
            v-if="!store.uiMessages.length"
            class="text-sm text-[var(--fg-muted)] rounded-lg p-3"
            :style="{ backgroundColor: 'var(--surface-sunken)' }"
          >
            Pregunta por tus expedientes, tareas, calendario o documentos. Las acciones que cambian datos requieren
            confirmación.
          </div>
          <template v-for="(m, idx) in store.uiMessages" :key="idx">
            <div
              v-if="m.kind === 'user'"
              class="ml-8 rounded-xl px-3 py-2 text-sm text-white"
              style="background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 75%, #1e3a5f))"
            >
              <p class="m-0 whitespace-pre-wrap">{{ m.text }}</p>
              <p v-if="m.attachmentIds?.length" class="m-0 mt-1 text-[10px] opacity-90">
                {{ m.attachmentIds.length }} adjunto(s)
              </p>
            </div>
            <div
              v-else-if="m.kind === 'assistant'"
              class="mr-6 rounded-xl px-3 py-2 text-sm whitespace-pre-wrap border"
              :style="{
                borderColor: 'var(--surface-border)',
                backgroundColor: 'var(--surface-sunken)',
                color: 'var(--fg-default)',
              }"
            >
              {{ m.text }}
              <div v-if="m.messageId" class="flex justify-end gap-0 mt-1 opacity-80">
                <Button
                  icon="pi pi-thumbs-up"
                  text
                  rounded
                  type="button"
                  :class="{ 'text-[var(--accent)]': m.feedback === 'up' }"
                  :disabled="store.loading"
                  @click="onFeedback(m.messageId!, 'up')"
                />
                <Button
                  icon="pi pi-thumbs-down"
                  text
                  rounded
                  type="button"
                  :class="{ 'text-[var(--accent)]': m.feedback === 'down' }"
                  :disabled="store.loading"
                  @click="onFeedback(m.messageId!, 'down')"
                />
              </div>
            </div>
            <div
              v-else-if="m.kind === 'system'"
              class="mr-6 rounded-xl px-3 py-2 text-sm whitespace-pre-wrap border"
              :style="{
                borderColor: 'var(--surface-border)',
                backgroundColor: 'var(--surface-sunken)',
                color: 'var(--fg-default)',
              }"
            >
              {{ m.text }}
            </div>
            <div
              v-else-if="m.kind === 'pending'"
              class="mr-6 rounded-xl px-3 py-2 text-sm border border-amber-500/40"
              :class="{ 'opacity-90': m.resolved }"
              :style="{ backgroundColor: 'var(--surface-sunken)', color: 'var(--fg-default)' }"
            >
              <p class="m-0 mb-2 font-medium">Confirmar acción</p>
              <ul class="m-0 pl-4 list-disc text-xs space-y-1.5 text-[var(--fg-default)]">
                <li v-for="tc in m.toolCalls" :key="tc.id" class="leading-snug">
                  {{ describePendingToolCall(tc) }}
                </li>
              </ul>
              <p v-if="m.resolved" class="m-0 mt-2 text-[11px] text-[var(--fg-muted)]">Confirmación enviada.</p>
              <div class="flex gap-2 mt-3">
                <Button
                  label="Confirmar"
                  size="small"
                  type="button"
                  :loading="store.loading && m.resolved"
                  :disabled="m.resolved || store.loading"
                  @click="onConfirm"
                />
                <Button
                  label="Cancelar"
                  size="small"
                  text
                  type="button"
                  :disabled="m.resolved || store.loading"
                  @click="store.cancelPending()"
                />
              </div>
            </div>
            <div
              v-else-if="m.kind === 'tool'"
              class="text-xs px-2 py-1 rounded-md mr-8"
              :style="{
                backgroundColor: 'var(--surface-sunken)',
                color: m.ok ? 'var(--fg-muted)' : 'var(--red-500, #c00)',
              }"
            >
              <i :class="m.ok ? 'pi pi-check' : 'pi pi-times'" class="mr-1" />
              <template v-if="m.ok && m.name === 'draft_brief' && draftBriefOpenHref(m)">
                <span class="block mb-1">{{ toolResultFriendlyLine(m) }}</span>
                <RouterLink
                  :to="draftBriefOpenHref(m)!"
                  class="inline-flex items-center gap-1 text-[var(--accent)] font-medium hover:underline"
                >
                  <i class="pi pi-file-edit text-[10px]" />
                  Abrir documento
                </RouterLink>
              </template>
              <template v-else>
                {{ toolResultFriendlyLine(m) }}
              </template>
            </div>
            <AssistantWidget
              v-else-if="m.kind === 'widget'"
              :tool-call-id="m.id"
              :tool-name="m.name"
              :spec="m.spec"
              :resolved="m.resolved"
              :disabled="store.loading"
              @submit="(p) => onWidgetSubmit(m, p)"
            />
          </template>
          <div v-if="store.loading" class="text-xs text-[var(--fg-muted)] flex items-center gap-2">
            <i class="pi pi-spinner animate-spin" />
            Pensando…
          </div>
        </div>

        <div
          class="shrink-0 border-t p-3 space-y-2 min-h-0"
          :style="{ borderColor: 'var(--surface-border)' }"
        >
          <input
            ref="fileInputRef"
            type="file"
            class="hidden"
            multiple
            @change="onFileInput"
          />
          <div
            v-if="store.pendingAttachments.length"
            class="flex flex-wrap gap-1 text-[10px]"
          >
            <span
              v-for="a in store.pendingAttachments"
              :key="a.id"
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 border"
              :style="{ borderColor: 'var(--surface-border)' }"
            >
              {{ a.filename }}
              <button type="button" class="opacity-70 hover:opacity-100" @click="store.removePendingAttachment(a.id)">×</button>
            </span>
          </div>
          <div class="flex gap-2">
            <Button
              type="button"
              icon="pi pi-paperclip"
              size="small"
              text
              rounded
              title="Adjuntar archivos"
              :disabled="store.loading"
              @click="fileInputRef?.click()"
            />
            <span v-if="dragOver" class="text-[10px] text-[var(--accent)] self-center">Suelta para adjuntar</span>
          </div>
          <AssistantQuickActionBar :disabled="store.loading" @send="onQuickSend" />
          <!-- Contenedor con tope de altura: el textarea de Prime es el propio <textarea>, no un wrapper. -->
          <div
            class="assistant-draft-shell rounded-lg border overflow-hidden"
            :style="{ borderColor: 'var(--surface-border)' }"
          >
            <Textarea
              v-model="draft"
              :auto-resize="false"
              class="w-full text-sm assistant-chat-draft border-0 shadow-none"
              rows="2"
              placeholder="Escribe una pregunta o instrucción…"
              :disabled="store.loading"
              @keydown.enter.exact.prevent="onSend"
              @paste="onPaste"
            />
          </div>
          <div class="flex justify-between items-center gap-2">
            <span class="text-[11px] text-[var(--fg-muted)] truncate">{{ route.name?.toString() }} · Ctrl+K</span>
            <Button
              label="Enviar"
              icon="pi pi-send"
              size="small"
              type="button"
              :disabled="store.loading || (!draft.trim() && !store.pendingAttachments.length)"
              @click="onSend"
            />
          </div>
        </div>
        </div>
      </div>
    </Transition>

    <div class="pointer-events-auto relative mt-3 flex flex-col items-end gap-1.5">
      <Transition name="fab-hint">
        <div
          v-if="showIntroHint"
          class="assistant-intro-hint mb-0.5 max-w-[13rem] rounded-xl border px-3 py-2 text-left"
          :style="{
            borderColor: 'var(--surface-border)',
            backgroundColor: 'var(--surface-raised)',
            color: 'var(--fg-default)',
          }"
          role="status"
        >
          <div class="assistant-intro-hint__title text-sm font-semibold tracking-tight">Alega AI</div>
          <div class="assistant-intro-hint__sub text-[11px] leading-snug text-[var(--fg-muted)] mt-0.5">
            Consultas sobre expedientes, tareas y documentos.
          </div>
        </div>
      </Transition>
      <button
        type="button"
        class="assistant-fab h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 focus-visible:outline focus-visible:ring-2 ring-offset-2"
        :class="{ 'assistant-fab--bounce': playIntroBounce, 'assistant-fab--shine': sparkleShine }"
        style="background: linear-gradient(145deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #0f172a))"
        :aria-expanded="store.open"
        :aria-label="store.open ? 'Cerrar asistente' : 'Abrir asistente Alega'"
        @animationend="onFabAnimationEnd"
        @click="store.toggle()"
      >
        <i
          class="pi pi-sparkles text-xl relative z-[1] block transition-transform duration-300"
          :class="{ 'assistant-sparkle-icon--shine': sparkleShine }"
          aria-hidden="true"
        />
      <span
        v-if="store.badgeCount > 0"
        class="absolute top-0 right-0 min-w-[1.25rem] h-5 px-1 rounded-full text-[11px] font-bold flex items-center justify-center bg-red-600 text-white"
      >
        {{ store.badgeCount > 9 ? '9+' : store.badgeCount }}
      </span>
    </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import { useAssistantStore } from '@/stores/assistant.store';
import { useAuthStore } from '@/stores/auth.store';
import { storeToRefs } from 'pinia';
import { describePendingToolCall, toolResultFriendlyLine } from './assistant-tool-labels';
import AssistantQuickActionBar from './AssistantQuickActionBar.vue';
import AssistantWidget from './AssistantWidget.vue';
import AssistantThreadsSidebar from './AssistantThreadsSidebar.vue';
import { makeAuthFetch } from '@/utils/makeAuthFetch';
import type { UiMessage } from '@/stores/assistant.store';

const store = useAssistantStore();
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);
const route = useRoute();

/** Link to open DOCX from draft_brief tool result. */
function draftBriefOpenHref(m: UiMessage): string | null {
  if (m.kind !== 'tool' || m.name !== 'draft_brief' || !m.ok || !m.result || typeof m.result !== 'object') {
    return null;
  }
  const r = m.result as { openPath?: string; documentId?: string };
  if (typeof r.openPath === 'string' && r.openPath.startsWith('/')) return r.openPath;
  if (typeof r.documentId === 'string') return `/documents/${r.documentId}/edit`;
  return null;
}

const draft = ref('');
const scrollRef = ref<HTMLElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const dragOver = ref(false);
const fetchAuth = makeAuthFetch();

/** Burbuja «Alega AI» una vez por sesión de pestaña. */
const showIntroHint = ref(false);
const INTRO_HINT_KEY = 'alega-ai-fab-intro-hint';

const playIntroBounce = ref(true);
const sparkleShine = ref(false);

let badgeTimer: ReturnType<typeof setInterval> | null = null;
/** IDs de temporizadores del navegador (number en DOM). */
let introHintTimer: number | null = null;
let sparkleInterval: number | null = null;

function onFabAnimationEnd(e: AnimationEvent) {
  if (e.animationName === 'assistant-fab-bounce') {
    playIntroBounce.value = false;
  }
}

function triggerSparkleShine() {
  if (store.open) return;
  sparkleShine.value = true;
  window.setTimeout(() => {
    sparkleShine.value = false;
  }, 2600);
}

function scrollPanelToBottom(behavior: ScrollBehavior = 'smooth') {
  const el = scrollRef.value;
  if (!el) return;
  el.scrollTo({ top: el.scrollHeight, behavior });
}

function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    store.toggle();
  }
}

async function uploadFiles(files: FileList | File[]) {
  const uid = user.value?.id;
  if (!uid) return;
  const fd = new FormData();
  for (const f of Array.from(files)) {
    fd.append('files', f);
  }
  if (store.threadId) fd.append('threadId', store.threadId);
  const res = await fetchAuth('/api/assistant/attachments', { method: 'POST', body: fd });
  if (!res.ok) return;
  const j = (await res.json()) as {
    data?: Array<{ id: string; filename: string; mimeType: string; size: number }>;
  };
  for (const a of j.data ?? []) {
    store.addPendingAttachment(a);
  }
}

async function onFileInput(ev: Event) {
  const t = ev.target as HTMLInputElement;
  if (t.files?.length) await uploadFiles(t.files);
  t.value = '';
}

async function onPaste(ev: ClipboardEvent) {
  const items = ev.clipboardData?.files;
  if (items?.length) {
    ev.preventDefault();
    await uploadFiles(items);
  }
}

async function onDropFiles(ev: DragEvent) {
  dragOver.value = false;
  const files = ev.dataTransfer?.files;
  if (files?.length) await uploadFiles(files);
}

function onWidgetSubmit(m: UiMessage, payload: unknown) {
  if (m.kind !== 'widget') return;
  const uid = user.value?.id;
  if (!uid) return;
  void store.submitWidgetResponse(uid, route, m.id, m.name, payload);
}

async function onFeedback(messageId: string, dir: 'up' | 'down') {
  try {
    await store.setMessageFeedback(messageId, dir);
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown);
  if (user.value?.id) {
    store.loadFromStorage(user.value.id);
  }
  void store.refreshBadge();
  badgeTimer = setInterval(() => {
    void store.refreshBadge();
  }, 120_000);

  try {
    if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(INTRO_HINT_KEY)) {
      showIntroHint.value = true;
      introHintTimer = window.setTimeout(() => {
        showIntroHint.value = false;
        sessionStorage.setItem(INTRO_HINT_KEY, '1');
      }, 5200);
    }
  } catch {
    /* ignore */
  }

  sparkleInterval = window.setInterval(triggerSparkleShine, 3 * 60 * 1000);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
  if (badgeTimer) clearInterval(badgeTimer);
  if (introHintTimer) clearTimeout(introHintTimer);
  if (sparkleInterval) clearInterval(sparkleInterval);
});

watch(
  () => user.value?.id,
  (id) => {
    if (id) store.loadFromStorage(id);
  },
);

watch(
  () => store.uiMessages.length,
  async () => {
    await nextTick();
    scrollPanelToBottom('smooth');
  },
);

watch(
  () => store.open,
  async (open) => {
    if (!open) return;
    await nextTick();
    requestAnimationFrame(() => {
      scrollPanelToBottom('auto');
      requestAnimationFrame(() => scrollPanelToBottom('auto'));
    });
  },
);

watch(
  () => store.loading,
  async (loading) => {
    if (loading) {
      await nextTick();
      scrollPanelToBottom('smooth');
    }
  },
);

function onSend() {
  const uid = user.value?.id;
  if (!uid) return;
  if (!draft.value.trim() && !store.pendingAttachments.length) return;
  const text = draft.value;
  draft.value = '';
  void store.send(text, uid, route);
}

function onQuickSend(text: string) {
  const uid = user.value?.id;
  if (!uid || !text.trim()) return;
  void store.send(text.trim(), uid, route);
}

function onConfirm() {
  const uid = user.value?.id;
  if (!uid) return;
  void store.confirmPending(uid, route);
}

function onClear() {
  const uid = user.value?.id;
  if (!uid) return;
  if (confirm('¿Borrar el historial del asistente?')) {
    store.clear(uid);
  }
}
</script>

<style scoped>
/*
 * El componente Textarea de PrimeVue 4 renderiza un <textarea> raíz (no hay textarea hijo).
 * Antes usábamos .assistant-chat-draft :deep(textarea) y no aplicaba a nada → crecimiento sin tope.
 * El shell limita la altura y hace scroll; el campo no debe expandir el panel del chat.
 */
.assistant-draft-shell {
  max-height: min(11.5rem, 32vh);
}

:deep(.assistant-chat-draft) {
  display: block;
  min-height: 2.5rem !important;
  max-height: min(11.5rem, 32vh) !important;
  resize: none !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  box-shadow: none !important;
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

/* Entrada del FAB al cargar */
@keyframes assistant-fab-bounce {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.08);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.assistant-fab--bounce {
  animation: assistant-fab-bounce 0.88s cubic-bezier(0.34, 1.45, 0.64, 1) both;
}

/* Brillo periódico (cada ~5 min) en botón + icono */
@keyframes assistant-fab-shine-glow {
  0%,
  100% {
    box-shadow:
      0 10px 25px -5px rgb(0 0 0 / 0.25),
      0 0 0 0 color-mix(in srgb, var(--accent) 40%, transparent);
  }
  40% {
    box-shadow:
      0 12px 28px -4px rgb(0 0 0 / 0.3),
      0 0 0 4px color-mix(in srgb, var(--accent) 45%, transparent),
      0 0 24px 2px color-mix(in srgb, white 35%, var(--accent));
  }
  70% {
    box-shadow:
      0 10px 25px -5px rgb(0 0 0 / 0.25),
      0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent);
  }
}

@keyframes assistant-sparkle-glint {
  0%,
  100% {
    filter: brightness(1);
    transform: scale(1) rotate(0deg);
  }
  25% {
    filter: brightness(1.45) drop-shadow(0 0 8px rgba(255, 255, 255, 0.85));
    transform: scale(1.12) rotate(-6deg);
  }
  50% {
    filter: brightness(1.25) drop-shadow(0 0 14px rgba(200, 230, 255, 0.95));
    transform: scale(1.08) rotate(4deg);
  }
  75% {
    filter: brightness(1.35) drop-shadow(0 0 6px rgba(255, 255, 255, 0.75));
    transform: scale(1.1) rotate(-2deg);
  }
}

.assistant-fab--shine {
  animation: assistant-fab-shine-glow 2.5s ease-in-out;
}

.assistant-sparkle-icon--shine {
  animation: assistant-sparkle-glint 2.5s ease-in-out;
}

/* Burbuja «Alega AI» (una vez por sesión) */
.fab-hint-enter-active {
  transition: opacity 0.45s ease, transform 0.45s cubic-bezier(0.34, 1.3, 0.64, 1);
}
.fab-hint-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.fab-hint-enter-from {
  opacity: 0;
  transform: translateX(12px) translateY(6px) scale(0.92);
}
.fab-hint-leave-to {
  opacity: 0;
  transform: translateX(8px) scale(0.96);
}

.assistant-intro-hint {
  pointer-events: none;
  /* Elevación fuerte para separar del contenido detrás (mapas, tablas, etc.) */
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 0.06),
    0 2px 4px rgb(0 0 0 / 0.04),
    0 12px 28px -6px rgb(0 0 0 / 0.18),
    0 28px 56px -12px rgb(0 0 0 / 0.22);
}

:global(html.dark) .assistant-intro-hint {
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 0.1),
    0 2px 8px rgb(0 0 0 / 0.45),
    0 16px 36px -8px rgb(0 0 0 / 0.55),
    0 32px 64px -16px rgb(0 0 0 / 0.5);
}

.assistant-intro-hint__title {
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
}

:global(html.dark) .assistant-intro-hint__title {
  text-shadow: 0 1px 3px rgb(0 0 0 / 0.55);
}

.assistant-intro-hint__sub {
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
}

:global(html.dark) .assistant-intro-hint__sub {
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.45);
}
</style>
