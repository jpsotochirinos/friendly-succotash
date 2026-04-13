<template>
  <Dialog
    v-model:visible="visible"
    header="Seleccionar plantilla"
    modal
    :style="{ width: '700px' }"
  >
    <div class="space-y-4">
      <InputText
        v-model="searchQuery"
        placeholder="Buscar plantillas o documentos..."
        class="w-full"
        @input="debouncedSearch"
      />

      <DataTable
        :value="results"
        :loading="searching"
        selection-mode="single"
        v-model:selection="selectedTemplate"
        paginator
        :rows="10"
      >
        <Column field="title" header="Título" />
        <Column field="filename" header="Archivo" />
        <Column header="Origen">
          <template #body="{ data }">
            <Tag :value="data.isTemplate ? 'Plantilla' : 'Documento'" :severity="data.isTemplate ? 'info' : 'secondary'" />
          </template>
        </Column>
        <Column field="updatedAt" header="Fecha">
          <template #body="{ data }">
            {{ new Date(data.updatedAt).toLocaleDateString('es-PE') }}
          </template>
        </Column>
      </DataTable>
    </div>

    <template #footer>
      <Button label="Cancelar" text @click="visible = false" />
      <Button
        label="Usar como plantilla"
        icon="pi pi-copy"
        :disabled="!selectedTemplate"
        @click="selectTemplate"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { apiClient } from '@/api/client';

const visible = defineModel<boolean>('visible');
const emit = defineEmits<{ select: [templateId: string] }>();

const searchQuery = ref('');
const results = ref<any[]>([]);
const searching = ref(false);
const selectedTemplate = ref<any>(null);

let debounceTimer: any;

function debouncedSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => search(), 300);
}

async function search() {
  if (!searchQuery.value.trim()) {
    const { data } = await apiClient.get('/search/templates');
    results.value = data;
    return;
  }

  searching.value = true;
  const { data } = await apiClient.get('/search/documents', {
    params: { q: searchQuery.value, limit: 20 },
  });
  results.value = data.data;
  searching.value = false;
}

function selectTemplate() {
  if (selectedTemplate.value) {
    emit('select', selectedTemplate.value.id);
    visible.value = false;
  }
}

watch(visible, (val) => {
  if (val) search();
});
</script>
