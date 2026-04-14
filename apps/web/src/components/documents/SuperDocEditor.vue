<template>
  <div class="flex flex-col h-full">
    <!-- Top bar -->
    <div class="flex items-center justify-between px-4 py-2 border-b bg-white dark:bg-gray-800 shrink-0">
      <div class="flex items-center gap-3">
        <Button icon="pi pi-arrow-left" text rounded size="small" @click="emit('back')" />
        <input
          v-model="documentTitle"
          class="font-semibold text-lg bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none dark:text-gray-100 px-1 py-0.5 min-w-[200px]"
          @change="onTitleChange"
        />
        <StatusBadge v-if="reviewStatus" :status="reviewStatus" />
        <Tag v-if="hasUnsavedChanges" value="Sin guardar" severity="warn" />
      </div>

      <div class="flex items-center gap-2">
        <SelectButton
          v-model="editingMode"
          :options="modeOptions"
          option-label="label"
          option-value="value"
          @change="onModeChange"
        />

        <Divider layout="vertical" />

        <Button
          label="Guardar"
          icon="pi pi-save"
          size="small"
          :loading="saving"
          @click="saveDocument"
        />
        <Button
          label="Exportar DOCX"
          icon="pi pi-download"
          size="small"
          outlined
          @click="exportDocument"
        />
        <Button
          v-if="(reviewStatus === 'draft' || reviewStatus === 'revision_needed') && !hasUnsavedChanges"
          label="Enviar a revisión"
          icon="pi pi-send"
          size="small"
          severity="info"
          :loading="submitting"
          @click="submitForReview"
        />
      </div>
    </div>

    <!-- SuperDoc built-in toolbar -->
    <div id="sd-toolbar" class="border-b shrink-0" />

    <!-- SuperDoc editor -->
    <div id="sd-editor" class="flex-1 min-h-0" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { SuperDoc } from 'superdoc';
import 'superdoc/style.css';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Divider from 'primevue/divider';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import StatusBadge from '@/components/common/StatusBadge.vue';
import { apiClient } from '@/api/client';

const props = defineProps<{
  documentId: string;
}>();

const emit = defineEmits<{
  saved: [documentId: string];
  exported: [documentId: string];
  statusChanged: [documentId: string, newStatus: string];
  back: [];
}>();

const toast = useToast();

const documentTitle = ref('');
const reviewStatus = ref('');
const hasUnsavedChanges = ref(false);
const saving = ref(false);
const submitting = ref(false);
const editingMode = ref<'editing' | 'suggesting' | 'viewing'>('editing');

let superdoc: any = null;

const modeOptions = [
  { label: 'Editar', value: 'editing' },
  { label: 'Sugerir', value: 'suggesting' },
  { label: 'Ver', value: 'viewing' },
];

onMounted(async () => {
  await loadDocument();
});

onBeforeUnmount(() => {
  if (superdoc) {
    superdoc.destroy?.();
    superdoc = null;
  }
});

async function loadDocument() {
  const { data } = await apiClient.get(`/documents/${props.documentId}/editor-content`);
  documentTitle.value = data.title;
  reviewStatus.value = data.reviewStatus;

  const superdocConfig: any = {
    selector: '#sd-editor',
    toolbar: '#sd-toolbar',
    documentMode: editingMode.value,
    rulers: true,
  };

  if (data.buffer) {
    const binaryString = atob(data.buffer);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: data.mimeType });
    superdocConfig.document = blob;
  }

  superdoc = new SuperDoc(superdocConfig);

  superdoc.on?.('ready', () => {
    console.log('SuperDoc editor ready');
  });

  superdoc.on?.('editorUpdate', () => {
    hasUnsavedChanges.value = true;
  });
}

async function onTitleChange() {
  if (!documentTitle.value.trim()) return;
  await apiClient.patch(`/documents/${props.documentId}`, {
    title: documentTitle.value.trim(),
  });
}

function onModeChange() {
  superdoc?.setDocumentMode?.(editingMode.value);
}

async function saveDocument() {
  if (!superdoc) return;
  saving.value = true;

  try {
    const textContent = superdoc.getTextContent?.() || '';

    const exported = await superdoc.export?.({ isFinalDoc: true });
    if (exported instanceof Blob) {
      const formData = new FormData();
      const filename = `${documentTitle.value || 'document'}.docx`;
      formData.append('file', exported, filename);
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
  submitting.value = true;
  try {
    // Save any pending changes first
    if (hasUnsavedChanges.value) {
      await saveDocument();
    }

    await apiClient.post(`/documents/${props.documentId}/submit-review`);
    reviewStatus.value = 'submitted';
    emit('statusChanged', props.documentId, 'submitted');

    toast.add({
      severity: 'info',
      summary: 'Documento enviado a evaluación',
      detail: 'Se está analizando ortografía, citas y coherencia. El estado se actualizará automáticamente.',
      life: 6000,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error al enviar',
      detail: 'No se pudo enviar el documento a revisión.',
      life: 4000,
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<style>
#sd-editor {
  position: relative;
  overflow: auto;
  background: var(--sd-surface-canvas, #f1f3f5);
}

#sd-editor .superdoc {
  height: 100%;
  margin: 0 auto !important;
}

#sd-editor .super-editor-container {
  margin: 0 auto !important;
}

/* Hide SuperDoc's built-in mode switcher since we have our own */
#sd-toolbar .superdoc-toolbar-group-side {
  display: none;
}
</style>
