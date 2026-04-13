<template>
  <Dialog
    :visible="visible"
    :modal="true"
    :closable="true"
    :style="{ width: '80vw' }"
    :header="document?.title ?? ''"
    @update:visible="emit('update:visible', $event)"
  >
    <div v-if="document" class="flex items-center justify-center min-h-[40vh]">
      <img
        v-if="isImage"
        :src="previewUrl"
        :alt="document.title"
        class="max-w-full max-h-[70vh] mx-auto"
      />
      <iframe
        v-else-if="isPdf"
        :src="previewUrl"
        class="w-full h-[70vh]"
      />
      <div v-else class="flex flex-col items-center gap-4 text-gray-500 dark:text-gray-400">
        <i class="pi pi-eye-slash text-4xl" />
        <p>Vista previa no disponible para este tipo de archivo</p>
        <Button
          label="Descargar"
          icon="pi pi-download"
          @click="downloadFile"
        />
      </div>
    </div>

    <template #footer>
      <Button
        label="Descargar"
        icon="pi pi-download"
        outlined
        @click="downloadFile"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

interface PreviewDocument {
  id: string;
  title: string;
  mimeType: string;
}

const props = defineProps<{
  visible: boolean;
  document: PreviewDocument | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const previewUrl = computed(() =>
  props.document ? `/api/documents/${props.document.id}/download` : '',
);

const isImage = computed(() =>
  props.document?.mimeType?.startsWith('image/') ?? false,
);

const isPdf = computed(() =>
  props.document?.mimeType === 'application/pdf',
);

function downloadFile() {
  if (!previewUrl.value) return;
  window.open(previewUrl.value, '_blank');
}
</script>
