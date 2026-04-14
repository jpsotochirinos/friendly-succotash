<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <h1 class="text-xl font-semibold text-gray-800 dark:text-gray-100">{{ trackableTitle }}</h1>
      <div class="flex gap-2">
        <Button
          icon="pi pi-refresh"
          label="Recargar"
          size="small"
          outlined
          @click="loadItems"
        />
        <Button
          icon="pi pi-plus"
          label="Agregar item"
          size="small"
          @click="showCreateDialog = true"
        />
      </div>
    </div>

    <div class="flex-1 overflow-x-auto p-4">
      <div class="flex gap-4 h-full">
        <div
          v-for="col in columns"
          :key="col.key"
          class="min-w-[280px] flex-shrink-0 flex flex-col rounded-lg shadow-sm"
          :class="col.bg"
        >
          <div
            class="px-4 py-3 rounded-t-lg border-t-4 flex items-center justify-between"
            :class="col.border"
          >
            <span class="font-semibold text-gray-700 dark:text-gray-200">{{ col.label }}</span>
            <Tag :value="String(columnItems(col.key).length)" rounded severity="secondary" />
          </div>

          <div class="flex-1 overflow-y-auto p-3 space-y-3">
            <div
              v-for="item in columnItems(col.key)"
              :key="item.id"
              class="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-md transition-shadow"
              @click="openSidebar(item)"
            >
              <div class="flex items-start justify-between gap-2 mb-2">
                <span class="font-medium text-gray-800 dark:text-gray-100 text-sm leading-tight">{{ item.title }}</span>
                <Tag
                  :value="itemTypeLabel(item.itemType)"
                  :severity="itemTypeSeverity(item.itemType)"
                  class="flex-shrink-0"
                />
              </div>
              <div v-if="item.assignedTo" class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                <i class="pi pi-user mr-1" />{{ item.assignedTo.firstName || item.assignedTo.email }}
              </div>
              <div v-if="item.dueDate" class="text-xs" :class="isOverdue(item.dueDate) ? 'text-red-500 font-semibold' : 'text-gray-500 dark:text-gray-400'">
                <i class="pi pi-calendar mr-1" />{{ formatDate(item.dueDate) }}
                <span v-if="isOverdue(item.dueDate)"> — Vencido</span>
              </div>
            </div>

            <div
              v-if="columnItems(col.key).length === 0"
              class="text-center text-sm text-gray-400 dark:text-gray-500 py-8"
            >
              Sin items
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="selectedItem"
      class="fixed top-0 right-0 h-full w-[400px] bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col"
    >
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Detalle del item</h2>
        <Button icon="pi pi-times" text rounded @click="selectedItem = null" />
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div>
          <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Título</label>
          <p class="text-gray-800 dark:text-gray-100 font-medium">{{ selectedItem.title }}</p>
        </div>
        <div class="flex gap-4">
          <div>
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tipo</label>
            <div class="mt-1">
              <Tag
                :value="itemTypeLabel(selectedItem.itemType)"
                :severity="itemTypeSeverity(selectedItem.itemType)"
              />
            </div>
          </div>
          <div>
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</label>
            <p class="text-gray-800 dark:text-gray-100">{{ statusLabel(selectedItem.status) }}</p>
          </div>
        </div>
        <div v-if="selectedItem.assignedTo">
          <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Asignado a</label>
          <p class="text-gray-800 dark:text-gray-100">
            {{ selectedItem.assignedTo.firstName || selectedItem.assignedTo.email }}
          </p>
        </div>
        <div v-if="selectedItem.dueDate">
          <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha límite</label>
          <p :class="isOverdue(selectedItem.dueDate) ? 'text-red-500 font-semibold' : 'text-gray-800 dark:text-gray-100'">
            {{ formatDate(selectedItem.dueDate) }}
            <span v-if="isOverdue(selectedItem.dueDate)"> — Vencido</span>
          </p>
        </div>
        <div v-if="selectedItem.description">
          <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Descripción</label>
          <p class="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">{{ selectedItem.description }}</p>
        </div>

        <div v-if="availableTransitions.length > 0">
          <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2 block">Transiciones</label>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="t in availableTransitions"
              :key="t.to"
              :label="t.label"
              size="small"
              outlined
              @click="handleTransition(selectedItem.id, t.to)"
            />
          </div>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-600 pt-4">
          <div class="flex items-center justify-between mb-3">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Documentos</label>
            <div class="flex gap-1">
              <Button
                icon="pi pi-upload"
                text
                rounded
                size="small"
                v-tooltip="'Subir archivo'"
                @click="triggerFileUpload"
              />
              <Button
                icon="pi pi-file-edit"
                text
                rounded
                size="small"
                v-tooltip="'Nuevo documento'"
                @click="showNewDocDialog = true"
              />
            </div>
          </div>

          <div v-if="documentsLoading" class="text-center py-2">
            <i class="pi pi-spin pi-spinner text-gray-400 text-sm" />
          </div>

          <div v-else-if="itemDocuments.length === 0" class="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">
            Sin documentos
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="doc in itemDocuments"
              :key="doc.id"
              class="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
              @click="router.push(`/documents/${doc.id}/edit`)"
            >
              <div class="flex items-center gap-2 mb-1">
                <i class="pi pi-file text-xs text-gray-500" />
                <span class="font-medium text-gray-700 dark:text-gray-200 truncate">{{ doc.title }}</span>
              </div>
              <div v-if="doc.reviewStatus" class="text-xs text-gray-500 dark:text-gray-400">
                {{ doc.reviewStatus }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="selectedItem"
      class="fixed inset-0 bg-black/20 z-40"
      @click="selectedItem = null"
    />

    <Dialog
      v-model:visible="showCreateDialog"
      header="Nuevo item de workflow"
      :modal="true"
      :style="{ width: '480px' }"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Título *</label>
          <InputText v-model="newItem.title" placeholder="Título del item" />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo *</label>
          <Dropdown
            v-model="newItem.itemType"
            :options="itemTypeOptions"
            option-label="label"
            option-value="value"
            placeholder="Seleccionar tipo"
          />
        </div>

        <div v-if="newItem.itemType === 'action'" class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de acción</label>
          <Dropdown
            v-model="newItem.actionType"
            :options="actionTypeOptions"
            option-label="label"
            option-value="value"
            placeholder="Seleccionar tipo de acción"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Asignado a</label>
          <Dropdown
            v-model="newItem.assignedToId"
            :options="userOptions"
            option-label="label"
            option-value="value"
            placeholder="Seleccionar usuario"
            filter
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Item padre</label>
          <Dropdown
            v-model="newItem.parentId"
            :options="parentOptions"
            option-label="label"
            option-value="value"
            placeholder="Ninguno"
            show-clear
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha límite</label>
          <Calendar v-model="newItem.dueDate" date-format="dd/mm/yy" show-icon />
        </div>
      </div>

      <template #footer>
        <Button label="Cancelar" text @click="showCreateDialog = false" />
        <Button label="Crear" :disabled="!newItem.title || !newItem.itemType" @click="createItem" />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showNewDocDialog"
      header="Nuevo documento"
      :modal="true"
      :style="{ width: '400px' }"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Título *</label>
          <InputText v-model="newDocTitle" placeholder="Título del documento" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancelar" text @click="showNewDocDialog = false" />
        <Button label="Crear" :disabled="!newDocTitle" @click="createBlankDocument" />
      </template>
    </Dialog>

    <input
      ref="uploadInputRef"
      type="file"
      style="display: none"
      @change="handleFileUpload"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Dialog from 'primevue/dialog';
import Calendar from 'primevue/calendar';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { apiClient } from '@/api/client';

interface AssignedUser {
  firstName?: string;
  email: string;
}

interface WorkflowItem {
  id: string;
  title: string;
  itemType: string;
  status: string;
  dueDate?: string;
  assignedTo?: AssignedUser;
  description?: string;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();
const trackableId = route.params.id as string;

const items = ref<WorkflowItem[]>([]);
const trackableTitle = ref('');
const selectedItem = ref<WorkflowItem | null>(null);
const availableTransitions = ref<Array<{ to: string; label: string }>>([]);
const showCreateDialog = ref(false);
const users = ref<Array<{ id: string; firstName?: string; email: string }>>([]);

const rootFolderId = ref<string | null>(null);
const itemDocuments = ref<Array<{ id: string; title: string; reviewStatus: string; mimeType?: string }>>([]);
const documentsLoading = ref(false);
const showNewDocDialog = ref(false);
const newDocTitle = ref('');
const uploadInputRef = ref<HTMLInputElement | null>(null);

const columns = [
  { key: 'pending', label: 'Pendiente', bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-400' },
  { key: 'active', label: 'Activo', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-500' },
  { key: 'in_progress', label: 'En progreso', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-500' },
  { key: 'under_review', label: 'En revisión', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-500' },
  { key: 'validated', label: 'Validado', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-500' },
  { key: 'closed', label: 'Cerrado', bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-400' },
];

const statusMap: Record<string, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  in_progress: 'En progreso',
  under_review: 'En revisión',
  validated: 'Validado',
  closed: 'Cerrado',
};

const itemTypeOptions = [
  { label: 'Servicio', value: 'service' },
  { label: 'Tarea', value: 'task' },
  { label: 'Acción', value: 'action' },
];

const actionTypeOptions = [
  { label: 'Creación de doc', value: 'doc_creation' },
  { label: 'Carga de doc', value: 'doc_upload' },
  { label: 'Revisión', value: 'doc_review' },
  { label: 'Aprobación', value: 'approval' },
  { label: 'Firma digital', value: 'digital_sign' },
  { label: 'Personalizado', value: 'custom' },
];

const newItem = ref({
  title: '',
  itemType: '',
  actionType: '',
  assignedToId: '',
  parentId: '',
  dueDate: null as Date | null,
});

const userOptions = computed(() =>
  users.value.map((u) => ({
    label: u.firstName ? `${u.firstName} (${u.email})` : u.email,
    value: u.id,
  })),
);

const parentOptions = computed(() =>
  items.value.map((i) => ({ label: i.title, value: i.id })),
);

function columnItems(status: string): WorkflowItem[] {
  return items.value.filter((i) => i.status === status);
}

function itemTypeLabel(type: string): string {
  const map: Record<string, string> = { service: 'Servicio', task: 'Tarea', action: 'Acción' };
  return map[type] ?? type;
}

function itemTypeSeverity(type: string): string {
  const map: Record<string, string> = { service: 'info', task: 'warn', action: 'secondary' };
  return map[type] ?? 'info';
}

function statusLabel(status: string): string {
  return statusMap[status] ?? status;
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

async function loadItems() {
  const { data } = await apiClient.get(`/trackables/${trackableId}/tree`);
  items.value = data;
}

async function loadTrackable() {
  const { data } = await apiClient.get(`/trackables/${trackableId}`);
  trackableTitle.value = data.title ?? `Trackable ${trackableId}`;
}

async function loadUsers() {
  const { data } = await apiClient.get('/users', { params: { limit: 100 } });
  users.value = Array.isArray(data) ? data : data.data;
}

async function loadRootFolder() {
  try {
    const { data } = await apiClient.get(`/folders/trackable/${trackableId}`);
    if (data && data.length > 0) {
      rootFolderId.value = data[0].id;
    }
  } catch (error) {
    console.error('Error cargando carpeta raíz:', error);
  }
}

async function loadItemDocuments(itemId: string) {
  try {
    documentsLoading.value = true;
    const { data } = await apiClient.get('/documents', { params: { workflowItemId: itemId } });
    itemDocuments.value = Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    console.error('Error cargando documentos:', error);
    itemDocuments.value = [];
  } finally {
    documentsLoading.value = false;
  }
}

async function openSidebar(item: WorkflowItem) {
  selectedItem.value = item;
  const { data } = await apiClient.get(`/workflow-items/${item.id}/transitions`);
  availableTransitions.value = data;
  await loadItemDocuments(item.id);
}

async function handleTransition(itemId: string, targetStatus: string) {
  await apiClient.patch(`/workflow-items/${itemId}/transition`, { status: targetStatus });
  await loadItems();
  if (selectedItem.value?.id === itemId) {
    const refreshed = items.value.find((i) => i.id === itemId);
    if (refreshed) await openSidebar(refreshed);
  }
}

async function createItem() {
  const payload: Record<string, unknown> = {
    title: newItem.value.title,
    itemType: newItem.value.itemType,
    trackableId,
  };
  if (newItem.value.actionType && newItem.value.itemType === 'action') {
    payload.actionType = newItem.value.actionType;
  }
  if (newItem.value.assignedToId) payload.assignedToId = newItem.value.assignedToId;
  if (newItem.value.parentId) payload.parentId = newItem.value.parentId;
  if (newItem.value.dueDate) payload.dueDate = newItem.value.dueDate.toISOString();

  await apiClient.post('/workflow-items', payload);
  showCreateDialog.value = false;
  newItem.value = { title: '', itemType: '', actionType: '', assignedToId: '', parentId: '', dueDate: null };
  await loadItems();
  toast.add({ severity: 'success', summary: 'Item creado', life: 3000 });
}

function triggerFileUpload() {
  uploadInputRef.value?.click();
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !selectedItem.value || !rootFolderId.value) return;

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
    formData.append('folderId', rootFolderId.value);
    formData.append('trackableId', trackableId);
    formData.append('workflowItemId', selectedItem.value.id);

    await apiClient.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    await loadItemDocuments(selectedItem.value.id);
    toast.add({ severity: 'success', summary: 'Archivo subido', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error al subir archivo', life: 3000 });
  }

  input.value = '';
}

async function createBlankDocument() {
  if (!newDocTitle.value || !selectedItem.value || !rootFolderId.value) return;

  try {
    const { data } = await apiClient.post('/documents/create-blank', {
      title: newDocTitle.value,
      folderId: rootFolderId.value,
      trackableId,
      workflowItemId: selectedItem.value.id,
    });

    showNewDocDialog.value = false;
    newDocTitle.value = '';
    await loadItemDocuments(selectedItem.value.id);

    router.push(`/documents/${data.id}/edit`);
    toast.add({ severity: 'success', summary: 'Documento creado', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error al crear documento', life: 3000 });
  }
}

onMounted(async () => {
  await Promise.all([loadTrackable(), loadItems(), loadUsers(), loadRootFolder()]);
});
</script>

