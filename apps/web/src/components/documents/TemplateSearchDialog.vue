<template>
  <Dialog
    :visible="visible"
    :modal="true"
    header="Buscar plantilla"
    :style="{ width: '780px' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <span class="p-input-icon-left flex-1">
          <i class="pi pi-search" />
          <InputText
            v-model="searchQuery"
            placeholder="Buscar por título..."
            class="w-full"
          />
        </span>
      </div>

      <DataTable
        :value="filteredTemplates"
        :loading="loading"
        selection-mode="single"
        v-model:selection="selectedTemplate"
        :rows="10"
        paginator
        striped-rows
        class="text-sm"
      >
        <template #empty>
          <div class="text-center py-6 text-gray-400">
            <i class="pi pi-inbox text-3xl mb-2 block" />
            <span>No se encontraron plantillas</span>
          </div>
        </template>

        <Column field="title" header="Título" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <i class="pi pi-file-word text-blue-500" />
              <span class="font-medium">{{ data.title }}</span>
            </div>
          </template>
        </Column>

        <Column header="Trackable" sortable sort-field="folder.trackable.title">
          <template #body="{ data }">
            <span class="text-gray-600 dark:text-gray-300">
              {{ data.folder?.trackable?.title ?? '—' }}
            </span>
          </template>
        </Column>

        <Column field="currentVersion" header="Versión" style="width: 90px">
          <template #body="{ data }">
            <Tag :value="`v${data.currentVersion}`" severity="secondary" />
          </template>
        </Column>

        <Column field="updatedAt" header="Fecha" sortable style="width: 130px">
          <template #body="{ data }">
            {{ formatDate(data.updatedAt) }}
          </template>
        </Column>

        <Column style="width: 110px">
          <template #body="{ data }">
            <Button
              label="Usar"
              icon="pi pi-copy"
              size="small"
              @click="selectTemplate(data)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <template #footer>
      <Button
        label="Cancelar"
        text
        @click="emit('update:visible', false)"
      />
      <Button
        label="Crear en blanco"
        icon="pi pi-file-edit"
        severity="secondary"
        @click="emit('create-blank')"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import { apiClient } from '@/api/client';

interface TemplateDoc {
  id: string;
  title: string;
  mimeType: string;
  currentVersion: number;
  updatedAt: string;
  folder?: {
    id: string;
    name: string;
    trackable?: {
      id: string;
      title: string;
    };
  };
}

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'select': [template: TemplateDoc];
  'create-blank': [];
}>();

const templates = ref<TemplateDoc[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const selectedTemplate = ref<TemplateDoc | null>(null);

const filteredTemplates = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return templates.value;
  return templates.value.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.folder?.trackable?.title?.toLowerCase().includes(q),
  );
});

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function selectTemplate(template: TemplateDoc) {
  emit('select', template);
  emit('update:visible', false);
}

async function loadTemplates() {
  loading.value = true;
  try {
    const { data } = await apiClient.get('/documents', {
      params: { isTemplate: 'true', limit: 200 },
    });
    templates.value = data.data ?? data;
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      searchQuery.value = '';
      selectedTemplate.value = null;
      loadTemplates();
    }
  },
);
</script>
