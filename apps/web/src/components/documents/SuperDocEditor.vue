<template>
  <div class="flex flex-col h-full">
    <!-- Top bar -->
    <div class="flex items-center justify-between px-4 py-2 border-b bg-white dark:bg-gray-800 shrink-0">
      <div class="flex items-center gap-3">
        <Button icon="pi pi-arrow-left" text rounded size="small" @click="emit('back')" />
        <input
          v-model="documentTitle"
          class="font-semibold text-lg bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none dark:text-gray-100 px-1 py-0.5 min-w-[200px]"
          :readonly="readOnly"
          @change="onTitleChange"
        />
        <StatusBadge v-if="reviewStatus" :status="reviewStatus" />
        <Tag v-if="hasUnsavedChanges" value="Sin guardar" severity="warn" />
      </div>

      <div class="flex items-center gap-2">
        <SelectButton
          v-if="canEdit"
          v-model="editingMode"
          :options="modeOptions"
          option-label="label"
          option-value="value"
          @change="onModeChange"
        />
        <Tag v-else value="Solo lectura" severity="secondary" />

        <Divider v-if="canEdit" layout="vertical" />

        <template v-if="canEdit">
          <Button
            :icon="showAiPanel ? 'pi pi-times' : 'pi pi-sparkles'"
            :label="showAiPanel ? 'Cerrar Alega' : 'Asistente Alega'"
            size="small"
            :severity="showAiPanel ? 'secondary' : 'help'"
            :outlined="!showAiPanel"
            :disabled="!aiReady"
            @click="showAiPanel = !showAiPanel"
          />

          <Divider layout="vertical" />
        </template>

        <Button
          v-if="canEdit"
          label="Guardar"
          icon="pi pi-save"
          size="small"
          :loading="saving"
          @click="saveDocument"
        />
        <Button label="Exportar DOCX" icon="pi pi-download" size="small" outlined @click="exportDocument" />
        <Button
          v-if="canEdit && (canRequestSignatures)"
          label="Solicitar firmas"
          icon="pi pi-pencil"
          size="small"
          severity="help"
          outlined
          @click="showSignatureDialog = true"
        />
        <Button
          v-if="
            canEdit &&
            (reviewStatus === 'draft' || reviewStatus === 'revision_needed') &&
            !hasUnsavedChanges
          "
          label="Enviar a revisión"
          icon="pi pi-send"
          size="small"
          severity="info"
          :loading="submitting"
          @click="submitForReview"
        />
      </div>
    </div>

    <SignatureRequestComposerDialog
      v-model:modelValue="showSignatureDialog"
      :document-id="documentId"
      :title="documentTitle || 'Documento'"
    />

    <!-- SuperDoc built-in toolbar -->
    <div id="sd-toolbar" class="border-b shrink-0" />

    <!-- Editor + AI panel -->
    <div class="flex flex-1 min-h-0">
      <div id="sd-editor" class="flex-1 min-h-0" />

      <Transition name="ai-panel">
        <div v-if="canEdit && showAiPanel" class="w-96 border-l bg-white dark:bg-gray-800 flex flex-col shrink-0">
          <!-- Header -->
          <div class="flex items-center gap-2 px-3 py-2 border-b bg-purple-50 dark:bg-purple-950">
            <i class="pi pi-sparkles text-purple-600" />
            <span class="font-semibold text-sm text-purple-800 dark:text-purple-200">Asistente Alega</span>
            <span class="ml-auto text-xs text-purple-400">Cambios atribuidos a Alega</span>
          </div>

          <div class="px-3 py-2 border-b bg-gray-50 dark:bg-gray-900/50 flex flex-col gap-1.5 shrink-0">
            <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Modo</span>
            <SelectButton
              v-model="aiAssistantMode"
              :options="aiAssistantModeOptions"
              option-label="label"
              option-value="value"
              :disabled="aiRunning"
              class="w-full [&_.p-button]:text-xs [&_.p-button]:py-1.5"
            />
            <p class="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
              <template v-if="aiAssistantMode === 'chat'">
                Respuesta en el panel; puedes insertarla en el documento cuando quieras.
              </template>
              <template v-else>
                Aplica cambios sugeridos sobre texto que ya exista en el documento (no sirve para redactar solo desde el chat).
              </template>
            </p>
          </div>

          <!-- Messages -->
          <div ref="messagesContainer" class="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0">
            <div v-if="aiMessages.length === 0" class="text-center text-gray-400 text-sm mt-8 px-4">
              <i class="pi pi-sparkles text-2xl block mb-2 text-purple-300" />
              <p class="mb-3">Escribe una instruccion o usa una accion rapida.</p>
              <p class="text-xs text-gray-300">Las ediciones se insertan como cambios sugeridos que puedes aceptar o rechazar.</p>
            </div>

            <template v-for="(msg, i) in aiMessages" :key="i">
              <div
                v-if="msg.role === 'user'"
                class="rounded-lg px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100 self-end ml-8 max-w-full min-w-0 max-h-[min(45vh,14rem)] overflow-y-auto break-words whitespace-pre-wrap"
              >
                {{ msg.content }}
              </div>

              <div v-else class="self-start mr-8 flex flex-col gap-2 min-w-0 max-w-full">
                <div class="rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 max-h-[min(55vh,18rem)] overflow-y-auto break-words">
                  <div v-if="msg.loading" class="flex gap-1 items-center h-4">
                    <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay:0ms" />
                    <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay:150ms" />
                    <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay:300ms" />
                  </div>
                  <span v-else class="whitespace-pre-wrap">{{ msg.content }}</span>
                </div>

                <!-- Insert options for pending content -->
                <div v-if="msg.pendingText && !msg.inserted" class="flex flex-wrap gap-1">
                  <span class="text-xs text-gray-400 w-full mb-1">Insertar en el documento?</span>
                  <button
                    class="text-xs px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-40"
                    :disabled="aiRunning"
                    @click="insertPendingText(msg, 'end')"
                  >Al final</button>
                  <button
                    class="text-xs px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-40"
                    :disabled="aiRunning"
                    @click="insertPendingText(msg, 'start')"
                  >Al inicio</button>
                  <button
                    class="text-xs px-2 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-40"
                    :disabled="aiRunning"
                    @click="insertPendingText(msg, 'cursor')"
                  >En el cursor</button>
                  <button
                    class="text-xs px-2 py-1 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors"
                    @click="msg.inserted = true"
                  >No insertar</button>
                </div>
                <div v-if="msg.inserted" class="text-xs text-green-600 flex items-center gap-1">
                  <i class="pi pi-check-circle" /> Insertado como cambio sugerido
                </div>
              </div>
            </template>
          </div>

          <!-- Quick actions -->
          <div class="px-3 py-2 border-t">
            <p class="text-xs text-gray-400 mb-1.5">Acciones rapidas</p>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="qa in quickActions"
                :key="qa.label"
                :title="qa.description"
                class="text-xs px-2 py-1 rounded-full border transition-colors disabled:opacity-40"
                :class="qa.type === 'edit'
                  ? 'border-orange-200 text-orange-700 hover:bg-orange-50'
                  : 'border-purple-200 text-purple-700 hover:bg-purple-50'"
                :disabled="aiRunning"
                @click="runQuickAction(qa)"
              >
                <i :class="qa.icon" class="mr-1 text-[10px]" />{{ qa.label }}
              </button>
            </div>
            <p class="text-xs text-gray-300 mt-1.5">
              <span class="text-orange-400">Naranja</span> = edita directamente &middot;
              <span class="text-purple-400">Morado</span> = muestra en chat primero
            </p>
          </div>

          <!-- Input: altura acotada para pegados largos (scroll interno) -->
          <div class="p-3 border-t flex gap-2 items-end min-w-0 shrink-0">
            <Textarea
              v-model="aiPrompt"
              rows="2"
              class="flex-1 min-w-0 text-sm resize-none max-h-[min(45vh,12rem)] overflow-y-auto"
              :placeholder="aiAssistantMode === 'chat'
                ? 'Pregunta o instruccion... (Ctrl+Enter)'
                : 'Instruccion para editar el texto del documento... (Ctrl+Enter)'"
              :disabled="aiRunning"
              auto-resize
              @keydown.enter.ctrl="sendAiPrompt"
            />
            <Button
              icon="pi pi-send"
              size="small"
              class="shrink-0"
              :loading="aiRunning"
              :disabled="!aiPrompt.trim()"
              @click="sendAiPrompt"
            />
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { SuperDoc } from 'superdoc';
import 'superdoc/style.css';
import { AIActions, createAIProvider, EditorAdapter } from '@superdoc-dev/ai';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Divider from 'primevue/divider';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import StatusBadge from '@/components/common/StatusBadge.vue';
import SignatureRequestComposerDialog from '@/components/signatures/SignatureRequestComposerDialog.vue';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/api/client';
import { makeAuthFetch } from '@/utils/makeAuthFetch';

interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
  pendingText?: string;
  inserted?: boolean;
}

const props = withDefaults(
  defineProps<{ documentId: string; canEdit?: boolean }>(),
  { canEdit: true },
);

const readOnly = computed(() => !props.canEdit);

const emit = defineEmits<{
  saved: [documentId: string];
  exported: [documentId: string];
  statusChanged: [documentId: string, newStatus: string];
  back: [];
}>();

const toast = useToast();
const authStore = useAuthStore();
const showSignatureDialog = ref(false);
const canRequestSignatures = computed(() => {
  const p = authStore.user?.permissions ?? [];
  return p.includes('signature:create') || p.includes('signature:sign');
});
const documentTitle = ref('');
const reviewStatus = ref('');
const hasUnsavedChanges = ref(false);
const saving = ref(false);
const submitting = ref(false);
const editingMode = ref<'editing' | 'suggesting' | 'viewing'>('editing');

const showAiPanel = ref(false);
const aiReady = ref(false);
const aiRunning = ref(false);
const aiPrompt = ref('');
const aiMessages = ref<AiMessage[]>([]);
const messagesContainer = ref<HTMLElement | null>(null);

const AI_ASSISTANT_MODE_KEY = 'alega-superdoc-ai-mode';
type AiAssistantMode = 'chat' | 'edit';

function loadAiAssistantMode(): AiAssistantMode {
  if (typeof localStorage === 'undefined') return 'chat';
  try {
    const v = localStorage.getItem(AI_ASSISTANT_MODE_KEY);
    if (v === 'chat' || v === 'edit') return v;
  } catch {
    /* ignore */
  }
  return 'chat';
}

const aiAssistantMode = ref<AiAssistantMode>(loadAiAssistantMode());

watch(aiAssistantMode, (m) => {
  try {
    localStorage.setItem(AI_ASSISTANT_MODE_KEY, m);
  } catch {
    /* ignore */
  }
});

const aiAssistantModeOptions: { label: string; value: AiAssistantMode }[] = [
  { label: 'Chat', value: 'chat' },
  { label: 'Editar documento', value: 'edit' },
];

const quickActions = [
  {
    label: 'Mejorar redaccion',
    icon: 'pi pi-pencil',
    type: 'edit',
    action: 'tracked',
    prompt: 'Mejora la redaccion y estilo del documento completo',
    description: 'Aplica mejoras directamente como cambios sugeridos',
  },
  {
    label: 'Corregir ortografia',
    icon: 'pi pi-check',
    type: 'edit',
    action: 'tracked',
    prompt: 'Corrige todos los errores ortograficos y gramaticales del documento',
    description: 'Aplica correcciones directamente como cambios sugeridos',
  },
  {
    label: 'Resumir',
    icon: 'pi pi-align-left',
    type: 'analyze',
    action: 'chat',
    prompt: 'Resume el documento destacando los puntos mas importantes',
    description: 'Muestra el resumen en el chat y te permite insertarlo',
  },
  {
    label: 'Agregar conclusion',
    icon: 'pi pi-plus-circle',
    type: 'analyze',
    action: 'chat',
    prompt: 'Escribe una conclusion adecuada para este documento',
    description: 'Muestra la conclusion en el chat y te permite insertarla',
  },
  {
    label: 'Revisar coherencia',
    icon: 'pi pi-comments',
    type: 'edit',
    action: 'comment',
    prompt: 'Revisa la coherencia y estructura del documento y agrega comentarios sobre los problemas encontrados',
    description: 'Agrega comentarios en el documento',
  },
  {
    label: 'Analizar riesgos',
    icon: 'pi pi-exclamation-triangle',
    type: 'analyze',
    action: 'chat',
    prompt: 'Analiza el documento e identifica clausulas de riesgo, puntos criticos o acciones requeridas',
    description: 'Muestra el analisis en el chat',
  },
];

let superdoc: any = null;
let aiActions: any = null;

const modeOptions = [
  { label: 'Editar', value: 'editing' },
  { label: 'Sugerir', value: 'suggesting' },
  { label: 'Ver', value: 'viewing' },
];

onMounted(async () => {
  await loadDocument();
});

watch(
  () => props.canEdit,
  (v) => {
    if (!v) {
      editingMode.value = 'viewing';
      showAiPanel.value = false;
      superdoc?.setDocumentMode?.('viewing');
    }
  },
);

onBeforeUnmount(() => {
  aiActions?.destroy?.();
  aiActions = null;
  superdoc?.destroy?.();
  superdoc = null;
});

async function loadDocument() {
  const { data } = await apiClient.get(`/documents/${props.documentId}/editor-content`);
  documentTitle.value = data.title;
  reviewStatus.value = data.reviewStatus;

  if (!props.canEdit) {
    editingMode.value = 'viewing';
    showAiPanel.value = false;
  }

  const superdocConfig: any = {
    selector: '#sd-editor',
    toolbar: '#sd-toolbar',
    documentMode: props.canEdit ? editingMode.value : 'viewing',
    rulers: true,
  };

  if (data.buffer) {
    const binaryString = atob(data.buffer);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    superdocConfig.document = new Blob([bytes], { type: data.mimeType });
  }

  superdoc = new SuperDoc(superdocConfig);

  superdoc.on?.('ready', () => {
    const provider = createAIProvider({
      type: 'http',
      url: '/api/documents/ai/complete',
      streamResults: false,
      parseCompletion: (payload: any) => payload.choices?.[0]?.message?.content ?? '',
      parseStreamChunk: (payload: any) => payload.choices?.[0]?.delta?.content ?? '',
      fetch: makeAuthFetch(),
    });

    aiActions = new AIActions(superdoc, {
      user: { displayName: 'Alega', userId: 'alega-ai' },
      provider,
      onReady: () => { aiReady.value = true; },
    });
  });

  superdoc.on?.('editorUpdate', () => { hasUnsavedChanges.value = true; });
}

async function sendAiPrompt() {
  if (!props.canEdit) return;
  const prompt = aiPrompt.value.trim();
  if (!prompt || !aiActions || aiRunning.value) return;
  aiPrompt.value = '';

  addUserMessage(prompt);
  const msgIdx = addAssistantLoading();
  aiRunning.value = true;

  try {
    if (aiAssistantMode.value === 'chat') {
      const text = await aiActions.getCompletion(prompt);
      const cleaned = (text ?? '').trim();
      setAssistantMessage(msgIdx, cleaned || 'Sin respuesta.', cleaned);
    } else {
      const result = await aiActions.action.insertTrackedChanges(prompt);
      setAssistantMessage(
        msgIdx,
        result?.success
          ? 'Cambios aplicados en el documento. Puedes aceptarlos o rechazarlos.'
          : (result?.error ?? 'No se pudo completar la accion.'),
      );
    }
  } catch (e: any) {
    setAssistantMessage(msgIdx, e?.message ?? 'Error al procesar.');
  } finally {
    aiRunning.value = false;
    await scrollMessages();
  }
}

async function runQuickAction(qa: (typeof quickActions)[0]) {
  if (!props.canEdit || !aiActions || aiRunning.value) return;

  addUserMessage(qa.label);
  const msgIdx = addAssistantLoading();
  aiRunning.value = true;

  try {
    if (qa.action === 'chat') {
      const text = await aiActions.getCompletion(qa.prompt);
      const cleaned = (text ?? '').trim();
      setAssistantMessage(msgIdx, cleaned, cleaned);
    } else if (qa.action === 'comment') {
      const result = await aiActions.action.insertComments(qa.prompt);
      setAssistantMessage(
        msgIdx,
        result?.success ? 'Comentarios agregados al documento.' : (result?.error ?? 'No se pudo agregar comentarios.'),
      );
    } else {
      const result = await aiActions.action.insertTrackedChanges(qa.prompt);
      setAssistantMessage(
        msgIdx,
        result?.success
          ? 'Cambios aplicados. Puedes aceptarlos o rechazarlos en el documento.'
          : (result?.error ?? 'No se pudo completar la accion.'),
      );
    }
  } catch (e: any) {
    setAssistantMessage(msgIdx, e?.message ?? 'Error al procesar.');
  } finally {
    aiRunning.value = false;
    await scrollMessages();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function textToHtmlParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n/g, ' ').trim())
    .filter(Boolean)
    .map((block) => {
      const escaped = escapeHtml(block)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|\s)\*(\S.*?\S|\S)\*(?=\s|$)/g, '$1<em>$2</em>');
      return `<p>${escaped}</p>`;
    })
    .join('');
}

function insertPendingText(msg: AiMessage, position: 'start' | 'end' | 'cursor') {
  if (!props.canEdit || !msg.pendingText || !superdoc?.activeEditor) return;
  try {
    const editor = superdoc.activeEditor;
    const adapter = new EditorAdapter(editor);
    const html = textToHtmlParagraphs(msg.pendingText);
    if (!html) return;

    const docSize: number = editor.state?.doc?.content?.size ?? 2;
    let pos: number;
    if (position === 'cursor') pos = editor.state?.selection?.from ?? docSize - 1;
    else if (position === 'end') pos = Math.max(1, docSize - 1);
    else pos = 1;

    editor.commands.enableTrackChanges?.();
    try {
      editor.commands.insertContentAt(pos, html, { updateSelection: false });
    } finally {
      editor.commands.disableTrackChanges?.();
    }

    adapter.scrollToPosition(pos);

    msg.inserted = true;
    msg.pendingText = undefined;
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error al insertar', detail: e?.message, life: 3000 });
  }
}

function addUserMessage(content: string) {
  aiMessages.value.push({ role: 'user', content });
}

function addAssistantLoading(): number {
  aiMessages.value.push({ role: 'assistant', content: '', loading: true });
  scrollMessages();
  return aiMessages.value.length - 1;
}

function setAssistantMessage(idx: number, content: string, pendingText?: string) {
  const msg = aiMessages.value[idx];
  if (!msg) return;
  msg.loading = false;
  msg.content = content;
  if (pendingText) msg.pendingText = pendingText;
}

async function scrollMessages() {
  await nextTick();
  if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
}

async function onTitleChange() {
  if (!props.canEdit || !documentTitle.value.trim()) return;
  await apiClient.patch(`/documents/${props.documentId}`, { title: documentTitle.value.trim() });
}

function onModeChange() {
  if (!props.canEdit) return;
  superdoc?.setDocumentMode?.(editingMode.value);
}

async function saveDocument() {
  if (!props.canEdit || !superdoc) return;
  saving.value = true;
  try {
    const textContent = superdoc.getTextContent?.() || '';
    const exported = await superdoc.export?.({ isFinalDoc: true, triggerDownload: false });
    if (exported instanceof Blob) {
      const formData = new FormData();
      formData.append('file', exported, `${documentTitle.value || 'document'}.docx`);
      await apiClient.post(`/documents/${props.documentId}/version`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    await apiClient.patch(`/documents/${props.documentId}/editor-content`, {
      editorContent: { savedAt: new Date().toISOString() },
      contentText: textContent,
    });
    hasUnsavedChanges.value = false;
    reviewStatus.value = 'draft';
    emit('saved', props.documentId);
  } finally {
    saving.value = false;
  }
}

async function exportDocument() {
  if (!superdoc) return;
  const result = await superdoc.export?.({ isFinalDoc: true });
  if (result instanceof Blob) {
    const url = URL.createObjectURL(result);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentTitle.value}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    emit('exported', props.documentId);
  }
}

async function submitForReview() {
  if (!props.canEdit) return;
  submitting.value = true;
  try {
    if (hasUnsavedChanges.value) await saveDocument();
    await apiClient.post(`/documents/${props.documentId}/submit-review`);
    reviewStatus.value = 'submitted';
    emit('statusChanged', props.documentId, 'submitted');
    toast.add({
      severity: 'info',
      summary: 'Documento enviado a evaluacion',
      detail: 'Se esta analizando ortografia, citas y coherencia. El estado se actualizara automaticamente.',
      life: 6000,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error al enviar',
      detail: 'No se pudo enviar el documento a revision.',
      life: 4000,
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<style>
#sd-editor {
  overflow: auto;
  background: var(--sd-surface-canvas, #f1f3f5);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
}
#sd-editor .superdoc { width: fit-content; }
#sd-editor .super-editor-container { margin: 0 auto; }
#sd-toolbar .superdoc-toolbar-group-side { display: none; }

.ai-panel-enter-active,
.ai-panel-leave-active {
  transition: width 0.2s ease, opacity 0.2s ease;
  overflow: hidden;
}
.ai-panel-enter-from,
.ai-panel-leave-to {
  width: 0 !important;
  opacity: 0;
}
</style>
