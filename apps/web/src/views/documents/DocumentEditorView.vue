<template>
  <div class="h-screen w-screen flex flex-col bg-white dark:bg-gray-900">
    <!-- Editor -->
    <SuperDocEditor
      v-if="documentId && canOpenEditor"
      :document-id="documentId"
      :can-edit="canEditDocument"
      class="flex-1 min-h-0"
      @saved="onSaved"
      @status-changed="onStatusChanged"
      @back="goBack"
    />

    <!-- Sin permiso de lectura -->
    <div
      v-else-if="documentId && authReady && !canOpenEditor"
      class="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <i class="pi pi-lock text-4xl text-gray-400" />
      <p class="text-lg text-gray-700 dark:text-gray-200">No tenés permiso para ver este documento.</p>
      <Button label="Volver" icon="pi pi-arrow-left" @click="goBack" />
    </div>

    <!-- Loading state -->
    <div v-else-if="!authReady" class="flex-1 flex items-center justify-center">
      <ProgressSpinner />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import ProgressSpinner from 'primevue/progressspinner';
import Button from 'primevue/button';
import SuperDocEditor from '@/components/documents/SuperDocEditor.vue';
import { useToast } from 'primevue/usetoast';
import { usePermissions } from '@/composables/usePermissions';
import { useAuthStore } from '@/stores/auth.store';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { can } = usePermissions();
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const documentId = ref<string | null>((route.params.id as string) || null);

const authReady = computed(() => user.value != null);
const canOpenEditor = computed(() => can('document:read'));
const canEditDocument = computed(() => can('document:update'));

watch(
  () => route.params.id,
  (id) => {
    documentId.value = typeof id === 'string' ? id : Array.isArray(id) ? id[0] ?? null : null;
  },
);

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
