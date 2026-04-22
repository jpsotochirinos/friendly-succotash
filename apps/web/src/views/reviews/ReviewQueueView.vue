<template>
  <div class="flex flex-col gap-6 min-h-full">
    <div v-if="!authReady" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>
    <div v-else-if="!canDocRead" class="flex flex-col items-center justify-center gap-3 py-16 text-center text-[var(--fg-muted)]">
      <i class="pi pi-lock text-4xl opacity-60" />
      <p class="m-0">{{ t('reviewQueue.noPermission') }}</p>
    </div>
    <template v-else>
    <PageHeader :title="t('reviewQueue.title')" :subtitle="t('reviewQueue.subtitle')">
      <template #actions>
        <Button icon="pi pi-refresh" :label="t('reviewQueue.refresh')" size="small" outlined @click="loadQueue" />
      </template>
    </PageHeader>

    <DataTable
      :value="documents"
      :loading="loading"
      paginator
      :rows="20"
      striped-rows
      sort-field="updatedAt"
      :sort-order="-1"
    >
      <template #empty>
        <div class="text-center py-12 text-[var(--fg-subtle)]">
          <i class="pi pi-inbox text-4xl mb-3 block opacity-80" />
          <span>{{ t('reviewQueue.empty') }}</span>
        </div>
      </template>

      <Column field="title" :header="t('reviewQueue.colDocument')" sortable>
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <i :class="getFileIcon(data.mimeType)" />
            <span class="font-medium">{{ data.title }}</span>
          </div>
        </template>
      </Column>

      <Column field="reviewStatus" :header="t('reviewQueue.colStatus')" sortable>
        <template #body="{ data }">
          <StatusBadge :status="data.reviewStatus" />
        </template>
      </Column>

      <Column field="evaluationScore" :header="t('reviewQueue.colEvaluation')" sortable>
        <template #body="{ data }">
          <span
            v-if="data.evaluationScore != null"
            class="cursor-pointer"
            @click="openEvaluationDetail(data)"
          >
            <EvaluationBadge :score="data.evaluationScore" />
          </span>
          <span v-else class="text-[var(--fg-subtle)]">-</span>
        </template>
      </Column>

      <Column :header="t('reviewQueue.colResult')" sortable sort-field="latestEvalResult">
        <template #body="{ data }">
          <span v-if="getLatestEvalResult(data)" class="flex items-center gap-1">
            <i
              :class="getLatestEvalResult(data) === 'passed'
                ? 'pi pi-check-circle text-emerald-600'
                : 'pi pi-times-circle text-red-600'"
              class="text-sm"
            />
            <span
              class="text-xs font-medium"
              :class="getLatestEvalResult(data) === 'passed' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'"
            >
              {{ getLatestEvalResult(data) === 'passed' ? t('reviewQueue.passed') : t('reviewQueue.failed') }}
            </span>
          </span>
          <span v-else class="text-[var(--fg-subtle)]">-</span>
        </template>
      </Column>

      <Column :header="t('reviewQueue.colProject')" sortable sort-field="folder.trackable.title">
        <template #body="{ data }">
          <span class="text-[var(--fg-muted)]">
            {{ data.folder?.trackable?.title ?? '—' }}
          </span>
        </template>
      </Column>

      <Column :header="t('reviewQueue.colActivity')" sortable sort-field="workflowItem.title">
        <template #body="{ data }">
          <span class="text-[var(--fg-muted)]">
            {{ data.workflowItem?.title ?? '—' }}
          </span>
        </template>
      </Column>

      <Column field="updatedAt" :header="t('reviewQueue.colModified')" sortable>
        <template #body="{ data }">
          {{ new Date(data.updatedAt).toLocaleDateString('es-PE') }}
        </template>
      </Column>

      <Column :header="t('reviewQueue.colActions')">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              v-if="data.evaluationScore != null"
              icon="pi pi-search"
              text
              rounded
              size="small"
              v-tooltip.top="t('reviewQueue.tooltipEval')"
              @click="openEvaluationDetail(data)"
            />
            <Button
              v-if="data.evaluationScore != null"
              icon="pi pi-list"
              text
              rounded
              size="small"
              severity="help"
              v-tooltip.top="t('reviewQueue.tooltipLog')"
              @click="openProcessLog(data)"
            />
            <Button
              v-if="canDocUpdate && (data.reviewStatus === 'draft' || data.reviewStatus === 'revision_needed')"
              icon="pi pi-send"
              text
              rounded
              size="small"
              severity="info"
              v-tooltip.top="t('reviewQueue.tooltipSubmit')"
              @click="submitForReview(data)"
            />
            <Button
              v-if="canDocUpdate && data.reviewStatus === 'submitted' && data.evaluationScore == null"
              icon="pi pi-replay"
              text
              rounded
              size="small"
              severity="warn"
              v-tooltip.top="t('reviewQueue.tooltipEvaluate')"
              @click="reEvaluate(data)"
            />
            <Button
              v-if="canOpenFlowLinks && data.workflowItem && data.folder?.trackable"
              icon="pi pi-external-link"
              text
              rounded
              size="small"
              v-tooltip.top="t('reviewQueue.tooltipActivity')"
              @click="goToActivity(data)"
            />
            <Button
              v-if="canDocRead"
              icon="pi pi-file-edit"
              text
              rounded
              size="small"
              v-tooltip.top="t('reviewQueue.tooltipEdit')"
              @click="router.push(`/documents/${data.id}/edit`)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <EvaluationDetails v-model:visible="showEvaluation" :evaluation="selectedEvaluation" />
    <ReviewProcessLog v-model:visible="showProcessLog" :document-id="selectedDocId" :document-title="selectedDocTitle" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import ProgressSpinner from 'primevue/progressspinner';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import StatusBadge from '@/components/common/StatusBadge.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import EvaluationBadge from '@/components/documents/EvaluationBadge.vue';
import EvaluationDetails from '@/components/documents/EvaluationDetails.vue';
import ReviewProcessLog from '@/components/reviews/ReviewProcessLog.vue';
import { apiClient } from '@/api/client';
import { usePermissions } from '@/composables/usePermissions';
import { useAuthStore } from '@/stores/auth.store';

const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const { can, canAll } = usePermissions();
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const authReady = computed(() => user.value != null);
const canDocRead = computed(() => can('document:read'));
const canDocUpdate = computed(() => can('document:update'));
const canOpenFlowLinks = computed(() => canAll('trackable:read', 'workflow_item:read'));
const documents = ref<any[]>([]);
const loading = ref(false);

const showEvaluation = ref(false);
const selectedEvaluation = ref<any>(null);

const showProcessLog = ref(false);
const selectedDocId = ref<string | null>(null);
const selectedDocTitle = ref<string | undefined>(undefined);

async function loadQueue() {
  loading.value = true;
  try {
    const { data } = await apiClient.get('/documents/review-queue');
    documents.value = Array.isArray(data) ? data : [];
  } finally {
    loading.value = false;
  }
}

async function openEvaluationDetail(doc: any) {
  try {
    const { data } = await apiClient.get(`/documents/${doc.id}/evaluations`);
    const evaluations = Array.isArray(data) ? data : [];
    if (evaluations.length === 0) {
      toast.add({ severity: 'info', summary: 'Sin evaluaciones', detail: 'Este documento aún no tiene resultados de evaluación.', life: 3000 });
      return;
    }
    selectedEvaluation.value = evaluations[0];
    showEvaluation.value = true;
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las evaluaciones.', life: 3000 });
  }
}

async function submitForReview(doc: any) {
  if (!canDocUpdate.value) return;
  try {
    await apiClient.post(`/documents/${doc.id}/submit-review`);
    toast.add({ severity: 'success', summary: 'Evaluación completada', detail: 'El documento fue evaluado. Recargando resultados...', life: 4000 });
    await loadQueue();
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo enviar a revisión.', life: 4000 });
  }
}

function getFileIcon(mimeType: string): string {
  if (mimeType?.includes('pdf')) return 'pi pi-file-pdf text-red-600';
  if (mimeType?.includes('word') || mimeType?.includes('officedocument.wordprocessingml'))
    return 'pi pi-file-word text-accent';
  if (mimeType?.includes('image')) return 'pi pi-image text-emerald-600';
  return 'pi pi-file text-[var(--fg-subtle)]';
}

async function reEvaluate(doc: any) {
  if (!canDocUpdate.value) return;
  try {
    await apiClient.post(`/documents/${doc.id}/evaluate`);
    toast.add({ severity: 'success', summary: 'Evaluación completada', detail: 'Recargando resultados...', life: 4000 });
    await loadQueue();
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo evaluar el documento.', life: 4000 });
  }
}

function openProcessLog(doc: any) {
  selectedDocId.value = doc.id;
  selectedDocTitle.value = doc.title;
  showProcessLog.value = true;
}

function getLatestEvalResult(doc: any): string | null {
  const evals = doc.evaluations;
  if (!evals || !Array.isArray(evals) || evals.length === 0) return null;
  const sorted = [...evals].sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return sorted[0].result || null;
}

function goToActivity(doc: any) {
  if (!canOpenFlowLinks.value) return;
  const trackableId = doc.folder?.trackable?.id;
  const workflowItemId = doc.workflowItem?.id;
  if (trackableId && workflowItemId) {
    router.push(`/trackables/${trackableId}?workflowItemId=${workflowItemId}`);
  }
}

watch(
  [authReady, canDocRead],
  ([ready, read]) => {
    if (ready && read) loadQueue();
  },
  { immediate: true },
);
</script>
