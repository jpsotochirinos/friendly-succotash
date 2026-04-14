<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold dark:text-gray-100">Clientes</h1>
      <Button label="Nuevo cliente" icon="pi pi-plus" @click="showCreateDialog = true" />
    </div>

    <div class="flex flex-wrap gap-3 items-center">
      <InputText
        v-model="filters.search"
        placeholder="Buscar por título..."
        class="w-72"
        @input="resetAndLoad"
      />
      <Dropdown
        v-model="filters.status"
        :options="statusOptions"
        placeholder="Estado"
        show-clear
        class="w-44"
        @change="resetAndLoad"
      />
      <Dropdown
        v-model="filters.type"
        :options="typeOptions"
        placeholder="Tipo"
        show-clear
        class="w-40"
        @change="resetAndLoad"
      />
    </div>

    <DataTable
      :value="trackables"
      :loading="loading"
      paginator
      lazy
      :rows="rows"
      :total-records="totalRecords"
      :first="first"
      striped-rows
      @page="onPage"
    >
      <Column field="title" header="Título">
        <template #body="{ data }">
          <router-link
            :to="`/trackables/${data.id}/flow`"
            class="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {{ data.title }}
          </router-link>
        </template>
      </Column>
      <Column field="type" header="Tipo">
        <template #body="{ data }">
          <Tag :value="data.type" :severity="typeSeverity(data.type)" />
        </template>
      </Column>
      <Column field="status" header="Estado">
        <template #body="{ data }">
          <StatusBadge :status="data.status" />
        </template>
      </Column>
      <Column field="assignedTo" header="Asignado">
        <template #body="{ data }">
          <span class="dark:text-gray-300">{{ data.assignedTo?.name || data.assignedTo?.email || '-' }}</span>
        </template>
      </Column>
      <Column field="dueDate" header="Vencimiento">
        <template #body="{ data }">
          <span v-if="data.dueDate" class="dark:text-gray-300">
            {{ new Date(data.dueDate).toLocaleDateString('es-PE', { month: 'short', day: 'numeric', year: 'numeric' }) }}
          </span>
          <span v-else class="text-gray-400">-</span>
        </template>
      </Column>
      <Column header="Acciones">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-sitemap"
              text
              rounded
              size="small"
              v-tooltip.top="'Ver flujo'"
              @click="router.push(`/trackables/${data.id}/flow`)"
            />
            <Button
              icon="pi pi-folder"
              text
              rounded
              size="small"
              v-tooltip.top="'Carpetas'"
              @click="router.push(`/trackables/${data.id}/folders`)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="showCreateDialog"
      header="Nuevo cliente"
      :modal="true"
      :style="{ width: '480px' }"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium dark:text-gray-200">Título</label>
          <InputText v-model="newTrackable.title" placeholder="Nombre del trackable" autofocus />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium dark:text-gray-200">Tipo</label>
          <Dropdown
            v-model="newTrackable.type"
            :options="typeOptions"
            placeholder="Selecciona un tipo"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium dark:text-gray-200">Descripción</label>
          <Textarea v-model="newTrackable.description" rows="3" placeholder="Descripción (opcional)" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium dark:text-gray-200">Fecha de vencimiento</label>
          <Calendar v-model="newTrackable.dueDate" date-format="dd/mm/yy" placeholder="dd/mm/aaaa" show-icon />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="closeCreateDialog" />
        <Button
          label="Crear"
          icon="pi pi-check"
          :disabled="!newTrackable.title?.trim() || !newTrackable.type"
          :loading="creating"
          @click="createTrackable"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Calendar from 'primevue/calendar';
import Tag from 'primevue/tag';
import StatusBadge from '@/components/common/StatusBadge.vue';
import { apiClient } from '@/api/client';

const router = useRouter();

const trackables = ref<any[]>([]);
const loading = ref(false);
const totalRecords = ref(0);
const first = ref(0);
const rows = ref(20);

const filters = ref({
  search: '',
  status: null as string | null,
  type: null as string | null,
});

const statusOptions = ['pending', 'active', 'in_progress', 'under_review', 'validated', 'closed', 'archived'];
const typeOptions = ['case', 'process', 'project', 'audit'];

const showCreateDialog = ref(false);
const creating = ref(false);
const newTrackable = ref({
  title: '',
  type: null as string | null,
  description: '',
  dueDate: null as Date | null,
});

const typeSeverityMap: Record<string, string> = {
  case: 'info',
  process: 'warn',
  project: 'success',
  audit: 'secondary',
};

function typeSeverity(type: string): string {
  return typeSeverityMap[type] || 'secondary';
}

async function loadTrackables(page = 1) {
  loading.value = true;
  try {
    const { data } = await apiClient.get('/trackables', {
      params: {
        page,
        limit: rows.value,
        search: filters.value.search || undefined,
        status: filters.value.status || undefined,
        type: filters.value.type || undefined,
      },
    });
    trackables.value = data.data;
    totalRecords.value = data.total;
  } finally {
    loading.value = false;
  }
}

function resetAndLoad() {
  first.value = 0;
  loadTrackables(1);
}

function onPage(event: any) {
  first.value = event.first;
  loadTrackables(event.page + 1);
}

function closeCreateDialog() {
  showCreateDialog.value = false;
  newTrackable.value = { title: '', type: null, description: '', dueDate: null };
}

async function createTrackable() {
  creating.value = true;
  try {
    await apiClient.post('/trackables', {
      title: newTrackable.value.title.trim(),
      type: newTrackable.value.type,
      description: newTrackable.value.description.trim() || undefined,
      dueDate: newTrackable.value.dueDate?.toISOString() || undefined,
    });
    closeCreateDialog();
    await loadTrackables(1);
    first.value = 0;
  } finally {
    creating.value = false;
  }
}

onMounted(() => {
  loadTrackables();
});
</script>
