<template>
  <Dialog
    :visible="visible"
    :modal="true"
    :closable="true"
    :style="{ width: '85vw', maxWidth: '1100px' }"
    :header="document?.title ?? ''"
    @update:visible="onVisibleChange"
  >
    <div class="flex items-center justify-center min-h-[40vh]">
      <div v-if="loading" class="flex flex-col items-center gap-3 text-gray-400 py-16">
        <i class="pi pi-spin pi-spinner text-4xl" />
        <span class="text-sm">Cargando vista previa...</span>
      </div>

      <div v-else-if="error" class="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400 py-10">
        <i class="pi pi-exclamation-circle text-4xl text-red-400" />
        <p class="text-sm">No se pudo cargar la vista previa</p>
        <Button label="Descargar" icon="pi pi-download" @click="downloadFile" />
      </div>

      <template v-else-if="textOnlyHtml">
        <div
          class="w-full h-[75vh] overflow-y-auto bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-8"
        >
          <div
            class="prose prose-sm dark:prose-invert max-w-none"
            v-html="textOnlyHtml"
          />
        </div>
      </template>

      <template v-else-if="objectUrl || docxHtml">
        <img
          v-if="isImage"
          :src="objectUrl!"
          :alt="document?.title"
          class="max-w-full max-h-[75vh] mx-auto object-contain rounded"
        />
        <iframe
          v-else-if="isPdf"
          :src="objectUrl!"
          title="Vista previa del documento"
          class="w-full h-[75vh] rounded"
        />
        <video
          v-else-if="isVideo"
          :src="objectUrl!"
          controls
          class="max-w-full max-h-[75vh] mx-auto rounded"
        />
        <audio
          v-else-if="isAudio"
          :src="objectUrl!"
          controls
          class="w-full mt-8"
        />
        <!-- .docx rendered as HTML -->
        <div
          v-else-if="isDocx && docxHtml"
          class="w-full h-[75vh] overflow-y-auto bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-8"
        >
          <div
            class="prose prose-sm dark:prose-invert max-w-none"
            v-html="docxHtml"
          />
        </div>
        <div v-else class="flex flex-col items-center gap-4 py-10 text-gray-500 dark:text-gray-400">
          <i :class="fileIcon" class="text-6xl" />
          <p class="text-sm">Vista previa no disponible para este tipo de archivo</p>
          <p v-if="document?.mimeType" class="text-xs text-gray-400">{{ document.mimeType }}</p>
          <Button label="Descargar" icon="pi pi-download" @click="downloadFile" />
        </div>
      </template>
    </div>

    <template #footer>
      <Button
        label="Descargar"
        icon="pi pi-download"
        outlined
        :loading="downloading"
        @click="downloadFile"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { apiClient } from '@/api/client';

interface PreviewDocument {
  id: string;
  title: string;
  mimeType: string;
  filename?: string;
}

const props = defineProps<{
  visible: boolean;
  document: PreviewDocument | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const objectUrl = ref<string | null>(null);
const docxHtml = ref<string | null>(null);
const textOnlyHtml = ref<string | null>(null);
const loading = ref(false);
const error = ref(false);
const downloading = ref(false);

const isImage = computed(() => props.document?.mimeType?.startsWith('image/') ?? false);
const isPdf = computed(() => props.document?.mimeType === 'application/pdf');
const isVideo = computed(() => props.document?.mimeType?.startsWith('video/') ?? false);
const isAudio = computed(() => props.document?.mimeType?.startsWith('audio/') ?? false);
const isDocx = computed(() => {
  const mime = props.document?.mimeType ?? '';
  return mime.includes('word') || mime.includes('officedocument.wordprocessingml');
});

const isTextOnly = computed(() => {
  const mime = props.document?.mimeType ?? '';
  return !mime || mime === 'text/html';
});

const fileIcon = computed(() => {
  const mime = props.document?.mimeType ?? '';
  if (mime.includes('word') || mime.includes('document')) return 'pi pi-file-word text-blue-500';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return 'pi pi-file-excel text-green-600';
  if (mime.includes('zip') || mime.includes('compressed')) return 'pi pi-file text-yellow-500';
  return 'pi pi-file text-gray-400';
});

function revokeObjectUrl() {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value);
    objectUrl.value = null;
  }
  docxHtml.value = null;
  textOnlyHtml.value = null;
}

async function loadPreview() {
  if (!props.document) return;
  revokeObjectUrl();
  loading.value = true;
  error.value = false;
  try {
    if (isTextOnly.value) {
      const response = await apiClient.get(`/documents/${props.document.id}/preview`, {
        responseType: 'text',
      });
      textOnlyHtml.value = response.data;
    } else if (isDocx.value) {
      await loadDocxPreview();
    } else {
      const response = await apiClient.get(`/documents/${props.document.id}/preview`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: props.document.mimeType });
      objectUrl.value = URL.createObjectURL(blob);
    }
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function loadDocxPreview() {
  if (!props.document) return;
  const response = await apiClient.get(`/documents/${props.document.id}/preview`, {
    responseType: 'arraybuffer',
  });
  const mammoth = await import('mammoth');
  const result = await mammoth.convertToHtml({ arrayBuffer: response.data });
  docxHtml.value = result.value;
}

async function downloadFile() {
  if (!props.document) return;
  downloading.value = true;
  try {
    const response = await apiClient.get(`/documents/${props.document.id}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = props.document.filename || props.document.title || 'download';
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    downloading.value = false;
  }
}

function onVisibleChange(val: boolean) {
  if (!val) revokeObjectUrl();
  emit('update:visible', val);
}

watch(
  () => [props.visible, props.document?.id],
  ([visible]) => {
    if (visible && props.document) {
      loadPreview();
    } else if (!visible) {
      revokeObjectUrl();
    }
  },
);
</script>
