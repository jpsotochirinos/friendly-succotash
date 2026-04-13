<template>
  <div class="h-screen w-screen flex flex-col bg-white dark:bg-gray-900">
    <!-- Editor -->
    <SuperDocEditor
      v-if="documentId"
      :document-id="documentId"
      class="flex-1 min-h-0"
      @saved="onSaved"
      @status-changed="onStatusChanged"
      @back="goBack"
    />

    <!-- Loading state -->
    <div v-else-if="loading" class="flex-1 flex items-center justify-center">
      <ProgressSpinner />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ProgressSpinner from 'primevue/progressspinner';
import SuperDocEditor from '@/components/documents/SuperDocEditor.vue';
import { useToast } from 'primevue/usetoast';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const documentId = ref<string | null>(route.params.id as string || null);
const loading = ref(false);

function goBack() {
  router.back();
}

function onSaved(docId: string) {
  toast.add({ severity: 'success', summary: 'Guardado', detail: 'Documento guardado correctamente', life: 3000 });
}

function onStatusChanged(docId: string, newStatus: string) {
  toast.add({ severity: 'info', summary: 'Estado actualizado', detail: `Documento enviado a ${newStatus}`, life: 3000 });
}
</script>
