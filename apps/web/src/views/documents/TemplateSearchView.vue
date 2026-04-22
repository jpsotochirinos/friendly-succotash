<template>
  <div class="flex flex-col gap-6 min-w-0 w-full">
    <div v-if="!authReady" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>
    <template v-else-if="!canDocRead">
      <div class="flex flex-col items-center justify-center gap-3 py-16 text-center text-[var(--fg-muted)]">
        <i class="pi pi-lock text-4xl opacity-60" />
        <p class="m-0">{{ t('legal.docTemplatesNoPermission') }}</p>
      </div>
    </template>
    <template v-else>
    <PageHeader :title="t('legal.docTemplatesTitle')" :subtitle="t('legal.docTemplatesSubtitle')" />

    <div
      class="doc-templates-toolbar flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4 min-w-0"
      role="search"
    >
      <IconField class="flex-1 min-w-0 w-full lg:max-w-2xl">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="searchQuery"
          type="search"
          class="w-full"
          :placeholder="t('legal.docTemplatesSearchPlaceholder')"
          autocomplete="off"
          @input="onSearchInput"
        />
      </IconField>

      <div class="flex flex-wrap items-stretch gap-2 sm:gap-3 shrink-0">
        <div
          class="inline-flex rounded-lg border border-[var(--surface-border)] bg-[var(--surface-sunken)]/40 p-0.5 shadow-sm"
          role="group"
          :aria-label="t('legal.docTemplatesViewModeLabel')"
        >
          <Button
            v-for="opt in viewModeOptions"
            :key="opt.value"
            type="button"
            size="small"
            :label="opt.label"
            :severity="viewMode === opt.value ? 'primary' : 'secondary'"
            :class="[
              '!min-h-[2.25rem] sm:!min-h-[2.375rem]',
              viewMode === opt.value ? 'shadow-sm' : '',
            ]"
            :aria-pressed="viewMode === opt.value"
            @click="setViewMode(opt.value)"
          />
        </div>

        <Dropdown
          v-model="selectedTag"
          :options="availableTags"
          :placeholder="t('legal.docTemplatesFilterTag')"
          show-clear
          class="doc-templates-tag-dropdown min-w-[11rem] flex-1 sm:flex-initial sm:min-w-[12rem]"
          @change="loadDocuments"
        />
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <div v-else-if="documents.length === 0" class="text-center py-16">
      <i class="pi pi-file text-5xl mb-4 text-[var(--fg-subtle)] opacity-80" />
      <p class="text-[var(--fg-muted)] text-lg m-0">
        {{ searchQuery ? `No se encontraron resultados para "${searchQuery}"` : 'No hay documentos aún.' }}
      </p>
      <p v-if="!searchQuery" class="text-[var(--fg-subtle)] text-sm mt-2 m-0">
        Crea documentos desde la vista de carpetas de un trackable y márcalos como plantilla.
      </p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="doc in documents"
        :key="doc.id"
        class="rounded-lg border border-[var(--surface-border)] p-4 hover:shadow-md transition-shadow cursor-pointer bg-[var(--surface-raised)]"
        @click="selectDocument(doc)"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 flex-wrap">
            <i :class="getFileIcon(doc.mimeType)" />
            <span class="font-semibold text-[var(--fg-default)]">{{ doc.title }}</span>
            <Tag v-if="doc.isTemplate" value="Plantilla" severity="info" />
            <Tag
              v-for="tag in (doc.tags || [])"
              :key="tag"
              :value="tag"
              severity="secondary"
              class="text-xs"
            />
          </div>
          <div class="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
            <span v-if="doc.folder?.trackable?.title">{{ doc.folder.trackable.title }}</span>
            <span v-if="doc.folder?.name">/ {{ doc.folder.name }}</span>
          </div>
        </div>

        <div class="flex items-center justify-between mt-2">
          <div class="flex items-center gap-3">
            <StatusBadge :status="doc.reviewStatus" size="small" />
            <span v-if="doc.uploadedBy" class="text-xs text-[var(--fg-subtle)]">
              por {{ doc.uploadedBy.firstName || doc.uploadedBy.email }}
            </span>
          </div>
          <span class="text-xs text-[var(--fg-subtle)]">
            {{ new Date(doc.updatedAt).toLocaleDateString('es-PE') }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="total > documents.length" class="text-center mt-4">
      <Button label="Cargar más" text @click="loadMore" />
    </div>

    <!-- Document actions dialog -->
    <Dialog v-model:visible="showActions" header="Acciones" modal :style="{ width: '450px' }">
      <div v-if="selectedDoc" class="space-y-4">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-semibold text-lg">{{ selectedDoc.title }}</span>
          <Tag v-if="selectedDoc.isTemplate" value="Plantilla" severity="info" />
        </div>

        <div class="flex flex-col gap-2">
          <Button
            v-if="canDocCreate && targetFolderId && targetTrackableId"
            label="Usar como plantilla (copiar a mi carpeta)"
            icon="pi pi-copy"
            @click="copyAsTemplate"
          />
          <Button
            label="Ver / Editar documento"
            icon="pi pi-eye"
            outlined
            @click="viewDocument"
          />
          <Button
            label="Descargar"
            icon="pi pi-download"
            outlined
            @click="downloadDocument"
          />
          <Button
            v-if="canDocUpdate"
            :label="selectedDoc.isTemplate ? 'Quitar marca de plantilla' : 'Marcar como plantilla'"
            :icon="selectedDoc.isTemplate ? 'pi pi-times' : 'pi pi-bookmark'"
            :severity="selectedDoc.isTemplate ? 'warn' : 'success'"
            outlined
            @click="toggleTemplate"
          />
        </div>

        <Divider v-if="canDocUpdate" />

        <div v-if="canDocUpdate">
          <label class="text-sm font-medium block mb-2 text-[var(--fg-default)]">Etiquetas</label>
          <div class="flex flex-wrap gap-2 mb-2">
            <Tag
              v-for="tag in (selectedDoc.tags || [])"
              :key="tag"
              :value="tag"
              severity="secondary"
              class="cursor-pointer"
              @click="removeTag(tag)"
              v-tooltip.top="'Clic para eliminar'"
            />
            <span v-if="!selectedDoc.tags?.length" class="text-sm text-[var(--fg-subtle)]">Sin etiquetas</span>
          </div>
          <div class="flex gap-2">
            <InputText
              v-model="newTag"
              placeholder="Nueva etiqueta..."
              class="flex-1"
              size="small"
              @keydown.enter="addTag"
            />
            <Button icon="pi pi-plus" size="small" :disabled="!newTag.trim()" @click="addTag" />
          </div>
        </div>
      </div>
    </Dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Dropdown from 'primevue/dropdown';
import ProgressSpinner from 'primevue/progressspinner';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Divider from 'primevue/divider';
import StatusBadge from '@/components/common/StatusBadge.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import { apiClient } from '@/api/client';
import { useToast } from 'primevue/usetoast';
import { usePermissions } from '@/composables/usePermissions';
import { useAuthStore } from '@/stores/auth.store';
import { storeToRefs } from 'pinia';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const { can } = usePermissions();
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const authReady = computed(() => user.value != null);
const canDocRead = computed(() => can('document:read'));
const canDocCreate = computed(() => can('document:create'));
const canDocUpdate = computed(() => can('document:update'));

const targetFolderId = route.query.folderId as string;
const targetTrackableId = route.query.trackableId as string;
const targetWorkflowItemId = route.query.workflowItemId as string | undefined;

const documents = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const searchQuery = ref('');
const viewMode = ref('all');
const selectedTag = ref<string | null>(null);
const availableTags = ref<string[]>([]);

const viewModeOptions = computed(() => [
  { label: t('legal.docTemplatesTabAll'), value: 'all' },
  { label: t('legal.docTemplatesTabTemplates'), value: 'templates' },
]);

function setViewMode(next: string) {
  if (viewMode.value === next) return;
  viewMode.value = next;
  loadDocuments();
}

const showActions = ref(false);
const selectedDoc = ref<any>(null);
const newTag = ref('');
let debounceTimer: any;
let currentOffset = 0;

function getFileIcon(mimeType?: string): string {
  if (!mimeType) return 'pi pi-file text-[var(--fg-subtle)]';
  if (mimeType.includes('pdf')) return 'pi pi-file-pdf text-red-600';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'pi pi-file-word text-accent';
  if (mimeType.includes('image')) return 'pi pi-image text-emerald-600';
  return 'pi pi-file text-[var(--fg-subtle)]';
}

async function loadDocuments() {
  if (!canDocRead.value) return;
  loading.value = true;
  currentOffset = 0;
  try {
    if (searchQuery.value.trim()) {
      const params: any = { q: searchQuery.value, limit: 30 };
      if (viewMode.value === 'templates') params.isTemplate = 'true';
      const { data } = await apiClient.get('/search/documents', { params });
      documents.value = data.data;
      total.value = data.total;
    } else {
      const params: any = { limit: 30, offset: 0 };
      if (viewMode.value === 'templates') params.isTemplate = 'true';
      if (selectedTag.value) params.tag = selectedTag.value;
      const { data } = await apiClient.get('/search/all-documents', { params });
      documents.value = data.data;
      total.value = data.total;
    }
    extractTags();
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (!canDocRead.value) return;
  currentOffset += 30;
  const params: any = { limit: 30, offset: currentOffset };
  if (viewMode.value === 'templates') params.isTemplate = 'true';
  if (selectedTag.value) params.tag = selectedTag.value;
  const { data } = await apiClient.get('/search/all-documents', { params });
  documents.value.push(...data.data);
}

function extractTags() {
  const tagSet = new Set<string>();
  documents.value.forEach((d: any) => {
    (d.tags || []).forEach((t: string) => tagSet.add(t));
  });
  availableTags.value = [...tagSet].sort();
}

function onSearchInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => loadDocuments(), 300);
}

function selectDocument(doc: any) {
  selectedDoc.value = { ...doc };
  showActions.value = true;
}

async function toggleTemplate() {
  if (!canDocUpdate.value || !selectedDoc.value) return;
  const newVal = !selectedDoc.value.isTemplate;
  await apiClient.patch(`/documents/${selectedDoc.value.id}`, { isTemplate: newVal });
  selectedDoc.value.isTemplate = newVal;
  const idx = documents.value.findIndex((d: any) => d.id === selectedDoc.value.id);
  if (idx >= 0) documents.value[idx].isTemplate = newVal;
  toast.add({
    severity: 'success',
    summary: newVal ? 'Marcado como plantilla' : 'Plantilla removida',
    life: 2000,
  });
}

async function addTag() {
  if (!canDocUpdate.value) return;
  const tag = newTag.value.trim().toLowerCase();
  if (!tag || !selectedDoc.value) return;
  const currentTags = selectedDoc.value.tags || [];
  if (currentTags.includes(tag)) {
    newTag.value = '';
    return;
  }
  const updatedTags = [...currentTags, tag];
  await apiClient.patch(`/documents/${selectedDoc.value.id}`, { tags: updatedTags });
  selectedDoc.value.tags = updatedTags;
  const idx = documents.value.findIndex((d: any) => d.id === selectedDoc.value.id);
  if (idx >= 0) documents.value[idx].tags = updatedTags;
  newTag.value = '';
  extractTags();
  toast.add({ severity: 'success', summary: 'Etiqueta agregada', life: 2000 });
}

async function removeTag(tag: string) {
  if (!canDocUpdate.value || !selectedDoc.value) return;
  const updatedTags = (selectedDoc.value.tags || []).filter((t: string) => t !== tag);
  await apiClient.patch(`/documents/${selectedDoc.value.id}`, { tags: updatedTags });
  selectedDoc.value.tags = updatedTags;
  const idx = documents.value.findIndex((d: any) => d.id === selectedDoc.value.id);
  if (idx >= 0) documents.value[idx].tags = updatedTags;
  extractTags();
}

async function copyAsTemplate() {
  if (!canDocCreate.value || !selectedDoc.value || !targetFolderId || !targetTrackableId) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Falta carpeta o trackable destino', life: 3000 });
    return;
  }
  const { data } = await apiClient.post(`/documents/${selectedDoc.value.id}/copy`, {
    targetFolderId,
    targetWorkflowItemId,
    trackableId: targetTrackableId,
  });
  showActions.value = false;
  toast.add({ severity: 'success', summary: 'Copiado', detail: 'Documento copiado', life: 3000 });
  router.push(`/documents/${data.id}/edit`);
}

function viewDocument() {
  const doc = selectedDoc.value;
  const mime = doc.mimeType || '';
  if (mime.includes('word') || mime.includes('document') || !mime) {
    router.push(`/documents/${doc.id}/edit`);
  } else {
    window.open(`/api/documents/${doc.id}/download`, '_blank');
  }
  showActions.value = false;
}

function downloadDocument() {
  window.open(`/api/documents/${selectedDoc.value.id}/download`, '_blank');
  showActions.value = false;
}

watch(
  [authReady, canDocRead],
  ([ready, read]) => {
    if (ready && read) loadDocuments();
  },
  { immediate: true },
);
</script>

<style scoped>
:deep(mark) {
  background-color: #fef08a;
  padding: 0 2px;
  border-radius: 2px;
}

.doc-templates-toolbar :deep(.p-inputtext) {
  min-height: 2.375rem;
}
.doc-templates-tag-dropdown :deep(.p-dropdown) {
  min-height: 2.375rem;
  align-items: center;
}
.doc-templates-tag-dropdown :deep(.p-dropdown-label) {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
</style>
