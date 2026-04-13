<template>
  <div class="flex h-full">
    <!-- Folder tree sidebar -->
    <div class="w-72 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold dark:text-gray-100">Carpetas</h3>
        <Button icon="pi pi-plus" text rounded size="small" @click="showNewFolder = true" />
      </div>

      <div v-if="foldersLoading" class="text-center py-4">
        <i class="pi pi-spin pi-spinner text-gray-400" />
      </div>

      <Tree
        v-else
        :value="folderTree"
        selection-mode="single"
        v-model:selection-keys="selectedKeys"
        @node-select="onFolderSelect"
        class="w-full"
      />

      <div v-if="!foldersLoading && folderTree.length === 0" class="text-sm text-gray-400 text-center py-8">
        No hay carpetas. Crea una con el botón <i class="pi pi-plus" />.
      </div>
    </div>

    <!-- Documents area -->
    <div class="flex-1 p-6 dark:bg-gray-900">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold dark:text-gray-100">
          {{ selectedFolder?.name || 'Selecciona una carpeta' }}
        </h2>
        <div v-if="selectedFolder" class="flex gap-2">
          <FileUpload
            mode="basic"
            :auto="true"
            :custom-upload="true"
            @uploader="handleUpload"
            choose-label="Subir archivo"
            class="p-button-sm"
          />
          <Button
            label="Nuevo documento"
            icon="pi pi-file-edit"
            size="small"
            @click="createNewDocument"
          />
        </div>
      </div>

      <div v-if="!selectedFolder" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <i class="pi pi-folder-open text-5xl mb-4" />
        <p>Selecciona una carpeta del panel izquierdo para ver sus documentos.</p>
      </div>

      <DataTable
        v-else
        :value="documents"
        :loading="loading"
        paginator
        :rows="20"
        striped-rows
      >
        <Column field="title" header="Título" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2 flex-wrap">
              <i :class="getFileIcon(data.mimeType)" />
              <span>{{ data.title }}</span>
              <Tag v-if="data.isTemplate" value="Plantilla" severity="info" />
              <Tag
                v-for="tag in (data.tags || [])"
                :key="tag"
                :value="tag"
                severity="secondary"
                class="text-xs"
              />
            </div>
          </template>
        </Column>
        <Column field="reviewStatus" header="Estado" sortable>
          <template #body="{ data }">
            <StatusBadge :status="data.reviewStatus" />
          </template>
        </Column>
        <Column field="currentVersion" header="Versión" />
        <Column field="evaluationScore" header="Evaluación">
          <template #body="{ data }">
            <EvaluationBadge v-if="data.evaluationScore != null" :score="data.evaluationScore" />
            <span v-else class="text-gray-400">-</span>
          </template>
        </Column>
        <Column field="updatedAt" header="Modificado" sortable>
          <template #body="{ data }">
            {{ new Date(data.updatedAt).toLocaleDateString('es-PE') }}
          </template>
        </Column>
        <Column header="Acciones">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button icon="pi pi-download" text rounded size="small" @click="downloadDoc(data.id)" v-tooltip.top="'Descargar'" />
              <Button icon="pi pi-file-edit" text rounded size="small" @click="openEditor(data)" v-tooltip.top="'Editar'" />
              <Button
                :icon="data.isTemplate ? 'pi pi-bookmark-fill' : 'pi pi-bookmark'"
                text rounded size="small"
                :severity="data.isTemplate ? 'warn' : 'secondary'"
                @click="toggleTemplate(data)"
                v-tooltip.top="data.isTemplate ? 'Quitar plantilla' : 'Marcar plantilla'"
              />
              <Button icon="pi pi-tag" text rounded size="small" @click="openTagDialog(data)" v-tooltip.top="'Etiquetas'" />
              <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="deleteDoc(data.id)" v-tooltip.top="'Eliminar'" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- New Folder Dialog -->
    <Dialog
      v-model:visible="showNewFolder"
      header="Nueva carpeta"
      :modal="true"
      :style="{ width: '400px' }"
    >
      <div class="flex flex-col gap-3 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Nombre</label>
          <InputText v-model="newFolderName" placeholder="Nombre de la carpeta" autofocus />
        </div>
        <div v-if="folderTree.length > 0" class="flex flex-col gap-1">
          <label class="text-sm font-medium">Carpeta padre (opcional)</label>
          <Dropdown
            v-model="newFolderParentId"
            :options="flatFolderOptions"
            option-label="label"
            option-value="value"
            placeholder="Raíz"
            show-clear
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="showNewFolder = false" />
        <Button label="Crear" icon="pi pi-check" :disabled="!newFolderName.trim()" @click="createFolder" />
      </template>
    </Dialog>

    <!-- Tag Dialog -->
    <Dialog
      v-model:visible="showTagDialog"
      header="Gestionar etiquetas"
      :modal="true"
      :style="{ width: '400px' }"
    >
      <div v-if="tagDoc" class="space-y-3">
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ tagDoc.title }}</p>
        <div class="flex flex-wrap gap-2">
          <Tag
            v-for="tag in (tagDoc.tags || [])"
            :key="tag"
            :value="tag"
            severity="secondary"
            class="cursor-pointer"
            @click="removeDocTag(tag)"
            v-tooltip.top="'Clic para eliminar'"
          />
          <span v-if="!tagDoc.tags?.length" class="text-sm text-gray-400">Sin etiquetas</span>
        </div>
        <div class="flex gap-2">
          <InputText
            v-model="newDocTag"
            placeholder="Nueva etiqueta..."
            class="flex-1"
            @keydown.enter="addDocTag"
          />
          <Button icon="pi pi-plus" :disabled="!newDocTag.trim()" @click="addDocTag" />
        </div>
      </div>
    </Dialog>

    <ConfirmDialog />
    <FilePreviewDialog v-model:visible="showPreview" :document="previewDoc" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Tree from 'primevue/tree';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import FileUpload from 'primevue/fileupload';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import ConfirmDialog from 'primevue/confirmdialog';
import StatusBadge from '@/components/common/StatusBadge.vue';
import EvaluationBadge from '@/components/documents/EvaluationBadge.vue';
import FilePreviewDialog from '@/components/documents/FilePreviewDialog.vue';
import { apiClient } from '@/api/client';

const route = useRoute();
const router = useRouter();
const confirm = useConfirm();
const toast = useToast();
const trackableId = route.params.id as string;

const folderTree = ref<any[]>([]);
const rawFolders = ref<any[]>([]);
const selectedKeys = ref<any>({});
const selectedFolder = ref<any>(null);
const documents = ref<any[]>([]);
const loading = ref(false);
const foldersLoading = ref(false);
const showNewFolder = ref(false);
const newFolderName = ref('');
const newFolderParentId = ref<string | null>(null);
const showPreview = ref(false);
const previewDoc = ref<any>(null);
const showTagDialog = ref(false);
const tagDoc = ref<any>(null);
const newDocTag = ref('');

const flatFolderOptions = computed(() =>
  rawFolders.value.map((f: any) => ({ label: f.name, value: f.id })),
);

async function loadFolders() {
  foldersLoading.value = true;
  try {
    const { data } = await apiClient.get(`/folders/trackable/${trackableId}`);
    rawFolders.value = data;
    folderTree.value = buildTree(data);
  } finally {
    foldersLoading.value = false;
  }
}

function buildTree(folders: any[]): any[] {
  return folders
    .filter((f: any) => !f.parent)
    .map((f: any) => ({
      key: f.id,
      label: f.name,
      data: f,
      icon: 'pi pi-folder',
      children: buildChildTree(folders, f.id),
    }));
}

function buildChildTree(folders: any[], parentId: string): any[] {
  return folders
    .filter((f: any) => f.parent?.id === parentId)
    .map((f: any) => ({
      key: f.id,
      label: f.name,
      data: f,
      icon: 'pi pi-folder',
      children: buildChildTree(folders, f.id),
    }));
}

async function loadDocuments(folderId: string) {
  loading.value = true;
  try {
    const { data } = await apiClient.get('/documents', {
      params: { folderId },
    });
    documents.value = data.data;
  } finally {
    loading.value = false;
  }
}

function onFolderSelect(node: any) {
  selectedFolder.value = node.data;
  loadDocuments(node.key);
}

async function createFolder() {
  const name = newFolderName.value.trim();
  if (!name) return;

  await apiClient.post('/folders', {
    name,
    trackableId,
    parentId: newFolderParentId.value || undefined,
  });

  newFolderName.value = '';
  newFolderParentId.value = null;
  showNewFolder.value = false;
  await loadFolders();
}

async function handleUpload(event: any) {
  if (!selectedFolder.value) {
    alert('Selecciona una carpeta primero');
    return;
  }
  const file = event.files[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', file.name);
  formData.append('folderId', selectedFolder.value.id);
  formData.append('trackableId', trackableId);

  await apiClient.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  loadDocuments(selectedFolder.value.id);
}

async function downloadDoc(docId: string) {
  const response = await apiClient.get(`/documents/${docId}/download`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = response.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') || 'download';
  a.click();
  URL.revokeObjectURL(url);
}

function openEditor(doc: any) {
  const mime = doc.mimeType || '';
  if (mime.includes('word') || mime.includes('document') || !mime) {
    router.push(`/documents/${doc.id}/edit`);
  } else {
    previewDoc.value = doc;
    showPreview.value = true;
  }
}

async function createNewDocument() {
  if (!selectedFolder.value) {
    alert('Selecciona una carpeta primero');
    return;
  }
  const { data } = await apiClient.post('/documents/create-blank', {
    title: 'Nuevo documento',
    folderId: selectedFolder.value.id,
    trackableId,
  });
  router.push(`/documents/${data.id}/edit`);
}

function getFileIcon(mimeType: string): string {
  if (mimeType?.includes('pdf')) return 'pi pi-file-pdf text-red-500';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return 'pi pi-file-word text-blue-500';
  if (mimeType?.includes('image')) return 'pi pi-image text-green-500';
  return 'pi pi-file text-gray-500';
}

async function deleteDoc(docId: string) {
  confirm.require({
    message: '¿Enviar este documento a la papelera?',
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-danger',
    accept: async () => {
      await apiClient.delete(`/documents/${docId}`);
      toast.add({ severity: 'success', summary: 'Eliminado', detail: 'Documento enviado a la papelera', life: 3000 });
      if (selectedFolder.value) loadDocuments(selectedFolder.value.id);
    },
  });
}

async function toggleTemplate(doc: any) {
  const newVal = !doc.isTemplate;
  await apiClient.patch(`/documents/${doc.id}`, { isTemplate: newVal });
  doc.isTemplate = newVal;
  toast.add({
    severity: 'success',
    summary: newVal ? 'Marcado como plantilla' : 'Plantilla removida',
    life: 2000,
  });
}

function openTagDialog(doc: any) {
  tagDoc.value = doc;
  newDocTag.value = '';
  showTagDialog.value = true;
}

async function addDocTag() {
  const tag = newDocTag.value.trim().toLowerCase();
  if (!tag || !tagDoc.value) return;
  const current = tagDoc.value.tags || [];
  if (current.includes(tag)) { newDocTag.value = ''; return; }
  const updated = [...current, tag];
  await apiClient.patch(`/documents/${tagDoc.value.id}`, { tags: updated });
  tagDoc.value.tags = updated;
  const idx = documents.value.findIndex((d: any) => d.id === tagDoc.value.id);
  if (idx >= 0) documents.value[idx].tags = updated;
  newDocTag.value = '';
  toast.add({ severity: 'success', summary: 'Etiqueta agregada', life: 2000 });
}

async function removeDocTag(tag: string) {
  if (!tagDoc.value) return;
  const updated = (tagDoc.value.tags || []).filter((t: string) => t !== tag);
  await apiClient.patch(`/documents/${tagDoc.value.id}`, { tags: updated });
  tagDoc.value.tags = updated;
  const idx = documents.value.findIndex((d: any) => d.id === tagDoc.value.id);
  if (idx >= 0) documents.value[idx].tags = updated;
}

function showVersions(doc: any) {
  // TODO: version history dialog
}

onMounted(() => {
  loadFolders();
});
</script>
