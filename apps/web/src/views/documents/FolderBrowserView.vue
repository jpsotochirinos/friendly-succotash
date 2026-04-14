<template>
  <div class="flex h-full">
    <!-- Folder tree sidebar -->
    <div class="w-72 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 overflow-y-auto flex flex-col gap-2">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold dark:text-gray-100">Carpetas</h3>
        <Button icon="pi pi-plus" text rounded size="small" @click="openNewRootFolderDialog" />
      </div>

      <div v-if="foldersLoading" class="text-center py-4">
        <i class="pi pi-spin pi-spinner text-gray-400" />
      </div>

      <div v-else-if="folderTree.length === 0" class="text-sm text-gray-400 text-center py-8">
        No hay carpetas. Crea una con el botón <i class="pi pi-plus" />.
      </div>

      <!-- Draggable folder list -->
      <draggable
        v-else
        :list="folderTree"
        item-key="key"
        handle=".drag-handle"
        ghost-class="opacity-40"
        @end="onRootReorder"
      >
        <template #item="{ element }">
          <FolderTreeNode
            :node="element"
            :selected-key="activeKey"
            @select="onFolderSelect"
            @reorder="onChildReorder"
            @update-emoji="openEmojiPicker"
          />
        </template>
      </draggable>
    </div>

    <!-- Documents area -->
    <div class="flex-1 p-6 dark:bg-gray-900 overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span v-if="breadcrumb.length > 0" class="flex items-center gap-1 text-sm text-gray-400">
            <span
              v-for="(crumb, i) in breadcrumb"
              :key="crumb.id"
              class="flex items-center gap-1"
            >
              <span
                class="cursor-pointer hover:text-primary-500"
                @click="navigateToCrumb(crumb)"
              >{{ crumb.emoji ? crumb.emoji + ' ' : '' }}{{ crumb.name }}</span>
              <i v-if="i < breadcrumb.length - 1" class="pi pi-angle-right text-xs" />
            </span>
          </span>
          <h2 v-else class="text-xl font-semibold dark:text-gray-100">
            Selecciona una carpeta
          </h2>
        </div>
        <div v-if="selectedFolder" class="flex gap-2 flex-wrap">
          <Button
            label="Nueva subcarpeta"
            icon="pi pi-folder-plus"
            size="small"
            severity="secondary"
            @click="openNewSubfolderDialog"
          />
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
            @click="openCreateDocumentDialog"
          />
        </div>
      </div>

      <div v-if="!selectedFolder" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <i class="pi pi-folder-open text-5xl mb-4" />
        <p>Selecciona una carpeta del panel izquierdo para ver sus documentos.</p>
      </div>

      <template v-else>
        <!-- Subfolders grid -->
        <div v-if="subfolders.length > 0" class="mb-4">
          <p class="text-xs font-semibold uppercase text-gray-400 mb-2 tracking-wide">Subcarpetas</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="sf in subfolders"
              :key="sf.key"
              class="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              @click="onFolderSelect(sf)"
            >
              <i class="pi pi-folder text-yellow-500" />
              <span>{{ sf.data.emoji ? sf.data.emoji + ' ' : '' }}{{ sf.label }}</span>
            </button>
          </div>
        </div>

        <!-- Documents table -->
        <DataTable
          :value="documents"
          :loading="loading"
          paginator
          :rows="20"
          striped-rows
        >
          <template #empty>
            <div class="text-center py-8 text-gray-400">
              <i class="pi pi-file text-3xl mb-2 block" />
              <span>No hay documentos en esta carpeta</span>
            </div>
          </template>

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
                <Button icon="pi pi-eye" text rounded size="small" @click="openPreview(data)" v-tooltip.top="'Vista previa'" />
                <Button icon="pi pi-download" text rounded size="small" @click="downloadDoc(data.id)" v-tooltip.top="'Descargar'" />
                <Button 
                v-if="isWordDoc(data.mimeType)"
                icon="pi pi-file-edit" text rounded size="small" @click="openEditor(data)" v-tooltip.top="'Editar'" />
                <Button
                  v-if="isWordDoc(data.mimeType)"
                  :icon="data.isTemplate ? 'pi pi-bookmark-fill' : 'pi pi-bookmark'"
                  text rounded size="small"
                  :severity="data.isTemplate ? 'warn' : 'secondary'"
                  @click="toggleTemplate(data)"
                  v-tooltip.top="data.isTemplate ? 'Quitar plantilla' : 'Marcar plantilla'"
                />
                <Button
                  v-if="(data.reviewStatus === 'draft' || data.reviewStatus === 'revision_needed') && isWordDoc(data.mimeType)"
                  icon="pi pi-send"
                  text rounded size="small"
                  severity="info"
                  @click="submitForReview(data)"
                  v-tooltip.top="'Enviar a revisión'"
                />
                <Button icon="pi pi-tag" text rounded size="small" @click="openTagDialog(data)" v-tooltip.top="'Etiquetas'" />
                <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="deleteDoc(data.id)" v-tooltip.top="'Eliminar'" />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
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
          <label for="new-folder-name" class="text-sm font-medium">Nombre</label>
          <InputText id="new-folder-name" v-model="newFolderName" placeholder="Nombre de la carpeta" autofocus />
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

    <!-- Emoji Picker Dialog -->
    <Dialog
      v-model:visible="showEmojiPicker"
      header="Elige un emoji para la carpeta"
      :modal="true"
      :style="{ width: '360px' }"
    >
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          <button
            v-for="emoji in emojiList"
            :key="emoji"
            class="text-2xl p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            @click="applyEmoji(emoji)"
          >{{ emoji }}</button>
        </div>
        <div class="flex gap-2 items-center border-t pt-3">
          <InputText v-model="customEmoji" placeholder="O escribe un emoji..." class="flex-1" maxlength="4" />
          <Button label="Aplicar" :disabled="!customEmoji.trim()" @click="applyEmoji(customEmoji)" />
        </div>
        <Button
          label="Quitar emoji"
          text
          severity="secondary"
          icon="pi pi-times"
          @click="applyEmoji('')"
        />
      </div>
    </Dialog>

    <ConfirmDialog />
    <FilePreviewDialog v-model:visible="showPreview" :document="previewDoc" />
    <TemplateSearchDialog
      v-model:visible="showTemplateSearch"
      @select="onTemplateSelected"
      @create-blank="createNewDocumentBlank"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import draggable from 'vuedraggable';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import FileUpload from 'primevue/fileupload';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import ConfirmDialog from 'primevue/confirmdialog';
import StatusBadge from '@/components/common/StatusBadge.vue';
import EvaluationBadge from '@/components/documents/EvaluationBadge.vue';
import FilePreviewDialog from '@/components/documents/FilePreviewDialog.vue';
import TemplateSearchDialog from '@/components/documents/TemplateSearchDialog.vue';
import { apiClient } from '@/api/client';

const props = defineProps<{
  trackableId?: string;
}>();

// ── Recursive folder tree node component ──────────────────────────────────────
const FolderTreeNode = defineComponent({
  name: 'FolderTreeNode',
  props: {
    node: { type: Object, required: true },
    selectedKey: { type: String, default: null },
    depth: { type: Number, default: 0 },
  },
  emits: ['select', 'reorder', 'update-emoji'],
  setup(props, { emit }) {
    const expanded = ref(true);
    const isSelected = computed(() => props.node.key === props.selectedKey);

    function toggle() { expanded.value = !expanded.value; }

    function onChildReorder(evt: any) {
      emit('reorder', evt);
    }

    return () => {
      const node = props.node;
      const children = node.children ?? [];
      const label = node.data?.emoji ? `${node.data.emoji} ${node.label}` : node.label;

      return h('div', { class: 'select-none' }, [
        h('div', {
          class: [
            'flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors group',
            isSelected.value
              ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
          ],
          style: { paddingLeft: `${props.depth * 12 + 8}px` },
        }, [
          h('i', { class: 'drag-handle pi pi-bars text-gray-300 cursor-grab text-xs mr-1 opacity-0 group-hover:opacity-100 transition-opacity' }),
          children.length > 0
            ? h('i', {
                class: ['pi text-xs text-gray-400', expanded.value ? 'pi-chevron-down' : 'pi-chevron-right'],
                onClick: (e: Event) => { e.stopPropagation(); toggle(); },
              })
            : h('span', { class: 'w-3' }),
          h('i', { class: 'pi pi-folder text-yellow-500 text-sm' }),
          h('span', { class: 'flex-1 truncate', onClick: () => emit('select', node) }, label),
          h('i', {
            class: 'pi pi-face-smile text-gray-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-yellow-500',
            onClick: (e: Event) => { e.stopPropagation(); emit('update-emoji', node); },
          }),
        ]),
        children.length > 0 && expanded.value
          ? h(draggable, {
              list: children,
              itemKey: 'key',
              handle: '.drag-handle',
              ghostClass: 'opacity-40',
              onEnd: (evt: any) => emit('reorder', { ...evt, parentId: node.key }),
            }, {
              item: ({ element }: { element: any }) => h(FolderTreeNode, {
                node: element,
                selectedKey: props.selectedKey,
                depth: props.depth + 1,
                onSelect: (n: any) => emit('select', n),
                onReorder: onChildReorder,
                onUpdateEmoji: (n: any) => emit('update-emoji', n),
              }),
            })
          : null,
      ]);
    };
  },
});

// ── Main view ─────────────────────────────────────────────────────────────────
const route = useRoute();
const router = useRouter();
const confirm = useConfirm();
const toast = useToast();
const trackableId = props.trackableId || (route.params.id as string);

const folderTree = ref<any[]>([]);
const rawFolders = ref<any[]>([]);
const activeKey = ref<string | null>(null);
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

const showEmojiPicker = ref(false);
const emojiTargetNode = ref<any>(null);
const customEmoji = ref('');

const showTemplateSearch = ref(false);

const emojiList = [
  '📁','📂','🗂️','📋','📌','📍','🔖','🏷️','📎','🗃️',
  '✅','⚠️','🔴','🟡','🟢','🔵','⭐','🔥','💡','🚀',
  '📊','📈','📉','🗓️','⏰','🔒','🔓','💼','🏢','🌐',
];

// Subfolders of the currently selected folder (for display above documents)
const subfolders = computed(() => {
  if (!selectedFolder.value) return [];
  return folderTree.value.length > 0
    ? getAllSubfolderNodes(folderTree.value, selectedFolder.value.id)
    : [];
});

function getAllSubfolderNodes(nodes: any[], parentId: string): any[] {
  for (const node of nodes) {
    if (node.key === parentId) return node.children ?? [];
    const found = getAllSubfolderNodes(node.children ?? [], parentId);
    if (found.length > 0 || (node.children ?? []).some((c: any) => c.key === parentId)) {
      return found;
    }
  }
  return [];
}

// Breadcrumb trail to selected folder
const breadcrumb = computed(() => {
  if (!selectedFolder.value) return [];
  const trail: any[] = [];
  buildBreadcrumb(folderTree.value, selectedFolder.value.id, trail);
  return trail;
});

function buildBreadcrumb(nodes: any[], targetId: string, trail: any[]): boolean {
  for (const node of nodes) {
    trail.push({ id: node.key, name: node.label, emoji: node.data?.emoji, node });
    if (node.key === targetId) return true;
    if (buildBreadcrumb(node.children ?? [], targetId, trail)) return true;
    trail.pop();
  }
  return false;
}

function navigateToCrumb(crumb: any) {
  onFolderSelect(crumb.node);
}

async function loadFolders() {
  foldersLoading.value = true;
  try {
    const { data } = await apiClient.get(`/folders/trackable/${trackableId}`);
    rawFolders.value = data;
    folderTree.value = buildTree(data);

    // Auto-select first folder
    if (folderTree.value.length > 0 && !activeKey.value) {
      onFolderSelect(folderTree.value[0]);
    }
  } finally {
    foldersLoading.value = false;
  }
}

function buildTree(folders: any[]): any[] {
  return folders
    .filter((f: any) => !f.parent)
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
    .map((f: any) => toNode(folders, f));
}

function toNode(all: any[], f: any): any {
  return {
    key: f.id,
    label: f.name,
    data: f,
    icon: 'pi pi-folder',
    children: all
      .filter((c: any) => c.parent?.id === f.id)
      .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
      .map((c: any) => toNode(all, c)),
  };
}

async function loadDocuments(folderId: string) {
  loading.value = true;
  try {
    const { data } = await apiClient.get('/documents', { params: { folderId } });
    documents.value = data.data;
  } finally {
    loading.value = false;
  }
}

function onFolderSelect(node: any) {
  activeKey.value = node.key;
  selectedFolder.value = node.data;
  loadDocuments(node.key);
}

// ── Folder creation ────────────────────────────────────────────────────────────
function openNewRootFolderDialog() {
  newFolderParentId.value = null;
  newFolderName.value = '';
  showNewFolder.value = true;
}

function openNewSubfolderDialog() {
  newFolderParentId.value = selectedFolder.value?.id || null;
  newFolderName.value = '';
  showNewFolder.value = true;
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

// ── Drag reorder ───────────────────────────────────────────────────────────────
async function onRootReorder() {
  const orderedIds = folderTree.value.map((n: any) => n.key);
  await apiClient.patch('/folders/reorder', { orderedIds });
}

async function onChildReorder(evt: any) {
  const parentNode = findNode(folderTree.value, evt.parentId);
  if (!parentNode) return;
  const orderedIds = parentNode.children.map((n: any) => n.key);
  await apiClient.patch('/folders/reorder', { orderedIds });
}

function findNode(nodes: any[], key: string): any | null {
  for (const n of nodes) {
    if (n.key === key) return n;
    const found = findNode(n.children ?? [], key);
    if (found) return found;
  }
  return null;
}

// ── Emoji picker ───────────────────────────────────────────────────────────────
function openEmojiPicker(node: any) {
  emojiTargetNode.value = node;
  customEmoji.value = '';
  showEmojiPicker.value = true;
}

async function applyEmoji(emoji: string) {
  if (!emojiTargetNode.value) return;
  const folderId = emojiTargetNode.value.key;
  await apiClient.patch(`/folders/${folderId}`, { emoji });
  // Update local data
  const raw = rawFolders.value.find((f: any) => f.id === folderId);
  if (raw) raw.emoji = emoji;
  folderTree.value = buildTree(rawFolders.value);
  showEmojiPicker.value = false;
  toast.add({ severity: 'success', summary: emoji ? 'Emoji asignado' : 'Emoji eliminado', life: 2000 });
}

// ── Document creation ──────────────────────────────────────────────────────────
function openCreateDocumentDialog() {
  if (!selectedFolder.value) return;
  showTemplateSearch.value = true;
}

async function onTemplateSelected(template: any) {
  if (!selectedFolder.value) return;
  const { data } = await apiClient.post(`/documents/${template.id}/copy`, {
    targetFolderId: selectedFolder.value.id,
    trackableId,
  });
  router.push(`/documents/${data.id}/edit`);
}

async function createNewDocumentBlank() {
  if (!selectedFolder.value) return;
  const { data } = await apiClient.post('/documents/create-blank', {
    title: 'Nuevo documento',
    folderId: selectedFolder.value.id,
    trackableId,
  });
  router.push(`/documents/${data.id}/edit`);
}

// ── File upload ────────────────────────────────────────────────────────────────
async function handleUpload(event: any) {
  if (!selectedFolder.value) { alert('Selecciona una carpeta primero'); return; }
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

// ── Document actions ───────────────────────────────────────────────────────────
function openPreview(doc: any) {
  previewDoc.value = doc;
  showPreview.value = true;
}

async function downloadDoc(docId: string) {
  const response = await apiClient.get(`/documents/${docId}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = response.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') || 'download';
  a.click();
  URL.revokeObjectURL(url);
}

function openEditor(doc: any) {
  const mime = doc.mimeType || '';
  if (isWordDoc(mime) || !mime) {
    router.push(`/documents/${doc.id}/edit`);
  } else {
    openPreview(doc);
  }
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

async function submitForReview(doc: any) {
  try {
    await apiClient.post(`/documents/${doc.id}/submit-review`);
    doc.reviewStatus = 'submitted';
    toast.add({
      severity: 'info',
      summary: 'Enviado a revisión',
      detail: 'El documento se está analizando.',
      life: 4000,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudo enviar a revisión.',
      life: 4000,
    });
  }
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

// ── Tags ───────────────────────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────────
function isWordDoc(mimeType: string): boolean {
  return !!(
    mimeType?.includes('word') ||
    mimeType?.includes('officedocument.wordprocessingml')
  );
}

function getFileIcon(mimeType: string): string {
  if (mimeType?.includes('pdf')) return 'pi pi-file-pdf text-red-500';
  if (isWordDoc(mimeType)) return 'pi pi-file-word text-blue-500';
  if (mimeType?.includes('image')) return 'pi pi-image text-green-500';
  return 'pi pi-file text-gray-500';
}

onMounted(() => {
  loadFolders();
});
</script>
