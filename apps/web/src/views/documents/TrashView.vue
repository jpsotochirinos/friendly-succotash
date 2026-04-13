<template>
  <div class="p-6 dark:bg-gray-900 min-h-full">
    <h1 class="text-2xl font-bold mb-6 dark:text-gray-100">Papelera</h1>

    <ConfirmDialog />

    <DataTable
      v-if="documents.length > 0 || loading"
      :value="documents"
      :loading="loading"
      paginator
      :rows="20"
      striped-rows
    >
      <Column field="title" header="Título" sortable>
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <i :class="getFileIcon(data.mimeType)" />
            <span class="dark:text-gray-200">{{ data.title }}</span>
          </div>
        </template>
      </Column>
      <Column field="deletedAt" header="Eliminado" sortable>
        <template #body="{ data }">
          <span class="dark:text-gray-300">
            {{ new Date(data.deletedAt).toLocaleDateString('es-PE') }}
          </span>
        </template>
      </Column>
      <Column header="Acciones">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-replay"
              text
              rounded
              size="small"
              @click="restoreDocument(data)"
            />
            <Button
              icon="pi pi-trash"
              text
              rounded
              severity="danger"
              size="small"
              @click="permanentDelete(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <div
      v-else-if="!loading"
      class="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500"
    >
      <i class="pi pi-trash text-5xl mb-4" />
      <p class="text-lg">La papelera está vacía</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { apiClient } from '@/api/client';

const toast = useToast();
const confirm = useConfirm();
const documents = ref<any[]>([]);
const loading = ref(false);

async function loadTrash() {
  loading.value = true;
  try {
    const { data } = await apiClient.get('/documents/trash/list');
    documents.value = data;
  } finally {
    loading.value = false;
  }
}

async function restoreDocument(doc: any) {
  await apiClient.post(`/documents/${doc.id}/restore`);
  documents.value = documents.value.filter((d) => d.id !== doc.id);
  toast.add({
    severity: 'success',
    summary: 'Documento restaurado',
    life: 3000,
  });
}

function permanentDelete(doc: any) {
  confirm.require({
    message: '¿Eliminar permanentemente?',
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      await apiClient.delete(`/documents/${doc.id}/permanent`);
      documents.value = documents.value.filter((d) => d.id !== doc.id);
      toast.add({
        severity: 'info',
        summary: 'Documento eliminado permanentemente',
        life: 3000,
      });
    },
  });
}

function getFileIcon(mimeType: string): string {
  if (mimeType?.includes('pdf')) return 'pi pi-file-pdf text-red-500';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return 'pi pi-file-word text-blue-500';
  if (mimeType?.includes('image')) return 'pi pi-image text-green-500';
  return 'pi pi-file text-gray-500';
}

onMounted(() => {
  loadTrash();
});
</script>
