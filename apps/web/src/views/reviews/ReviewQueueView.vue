<template>
  <div class="flex min-h-full flex-col gap-6">
    <div v-if="!authReady" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>
    <div
      v-else-if="!canDocRead"
      class="flex flex-col items-center justify-center gap-3 py-16 text-center"
      style="color: var(--fg-muted)"
    >
      <i class="pi pi-lock text-4xl opacity-60" aria-hidden="true" />
      <p class="m-0 text-sm">{{ t('reviewQueue.noPermission') }}</p>
    </div>
    <template v-else>
      <PageHeader :title="t('reviewQueue.title')" :subtitle="t('reviewQueue.subtitle')">
        <template #actions>
          <Button
            icon="pi pi-refresh"
            :label="t('reviewQueue.refresh')"
            size="small"
            variant="outlined"
            severity="secondary"
            @click="loadQueue"
          />
        </template>
      </PageHeader>

      <div
        class="app-card review-queue-card flex max-h-[min(82vh,calc(100dvh-11rem))] min-h-0 flex-col overflow-hidden shadow-sm"
      >
        <div
          class="review-queue-toolbar flex flex-shrink-0 flex-col gap-3 border-b border-[var(--surface-border)] bg-[var(--surface-raised)] px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-3"
          role="toolbar"
          :aria-label="t('reviewQueue.toolbarAria')"
        >
          <IconField class="toolbar-iconfield min-w-0 flex-1">
            <InputIcon class="pi pi-search" style="color: var(--fg-subtle)" />
            <InputText
              v-model="searchQuery"
              :placeholder="t('reviewQueue.searchPlaceholder')"
              size="small"
              class="toolbar-search w-full min-w-0 rounded-xl"
              :aria-label="t('common.search')"
              autocomplete="off"
            />
          </IconField>
          <div
            class="flex min-w-0 flex-shrink-0 flex-wrap items-center gap-2 border-t border-[var(--surface-border)] pt-3 tabular-nums text-sm text-[var(--fg-default)] sm:border-t-0 sm:pt-0 md:border-l md:border-t-0 md:pl-4"
            aria-live="polite"
            aria-atomic="true"
          >
            <span>{{ t('reviewQueue.toolbarResults', { n: totalRecords }) }}</span>
          </div>
          <Button
            v-if="hasActiveFilters"
            :label="t('reviewQueue.clearFilters')"
            icon="pi pi-filter-slash"
            variant="text"
            severity="secondary"
            size="small"
            @click="clearFilters"
          />
        </div>

        <div
          v-if="loading"
          class="review-queue-skeleton flex flex-1 min-h-[360px] min-h-0 overflow-x-auto overscroll-x-contain"
          :aria-label="t('reviewQueue.loadingTable')"
        >
          <div class="min-w-[960px]">
            <div
              class="grid gap-4 border-b border-[var(--surface-border)] px-4 py-3"
              style="
                grid-template-columns: minmax(180px, 1.8fr) minmax(96px, 0.85fr) minmax(96px, 0.85fr)
                  minmax(100px, 0.95fr) minmax(140px, 1.1fr) minmax(140px, 1.1fr) minmax(104px, 0.95fr)
                  minmax(7.5rem, 0.7fr);
              "
            >
              <Skeleton v-for="col in 8" :key="`rq-h-${col}`" height="0.75rem" />
            </div>
            <div
              v-for="row in 8"
              :key="`rq-sk-${row}`"
              class="grid items-center gap-4 border-b border-[var(--surface-border)] px-4 py-3.5 last:border-0"
              style="
                grid-template-columns: minmax(180px, 1.8fr) minmax(96px, 0.85fr) minmax(96px, 0.85fr)
                  minmax(100px, 0.95fr) minmax(140px, 1.1fr) minmax(140px, 1.1fr) minmax(104px, 0.95fr)
                  minmax(7.5rem, 0.7fr);
              "
            >
              <div class="flex min-w-0 items-center gap-2">
                <Skeleton shape="circle" size="1.85rem" />
                <Skeleton height="0.85rem" width="75%" />
              </div>
              <Skeleton height="1.05rem" width="4rem" border-radius="999px" />
              <Skeleton height="1rem" width="3rem" />
              <Skeleton height="1rem" width="4.5rem" />
              <Skeleton height="0.85rem" width="92%" />
              <Skeleton height="0.85rem" width="88%" />
              <Skeleton height="0.85rem" width="70%" />
              <div class="flex justify-center gap-2">
                <Skeleton shape="circle" size="2rem" />
                <Skeleton shape="circle" size="2rem" />
                <Skeleton shape="circle" size="2rem" />
              </div>
            </div>
          </div>
        </div>

        <div v-else class="review-queue-dt-region relative flex min-h-0 flex-1 flex-col">
          <DataTable
            v-model:sort-field="sortField"
            v-model:sort-order="sortOrder"
            lazy
            class="functional-table rq-data-table min-h-0 flex-1"
            :value="paginatedRows"
            :total-records="totalRecords"
            data-key="id"
            size="small"
            scrollable
            scroll-height="flex"
            row-hover
            responsive-layout="scroll"
            :loading="false"
            :table-props="{ 'aria-label': t('reviewQueue.tableAriaLabel') }"
          >
            <template #empty>
              <div class="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <i class="pi pi-inbox text-4xl opacity-40" style="color: var(--fg-subtle)" aria-hidden="true" />
                <template v-if="hasActiveFilters">
                  <p class="m-0 text-sm font-semibold" style="color: var(--fg-default)">
                    {{ t('reviewQueue.tableEmptyFilteredTitle') }}
                  </p>
                  <p class="m-0 max-w-md text-xs" style="color: var(--fg-subtle)">
                    {{ t('reviewQueue.tableEmptyFilteredSubtitle') }}
                  </p>
                  <Button
                    :label="t('reviewQueue.clearFilters')"
                    icon="pi pi-filter-slash"
                    size="small"
                    variant="outlined"
                    severity="secondary"
                    @click="clearFilters"
                  />
                </template>
                <template v-else>
                  <p class="m-0 text-sm font-semibold" style="color: var(--fg-default)">
                    {{ t('reviewQueue.tableEmptyZeroTitle') }}
                  </p>
                  <p class="m-0 max-w-md text-xs" style="color: var(--fg-subtle)">
                    {{ t('reviewQueue.tableEmptyZeroSubtitle') }}
                  </p>
                </template>
              </div>
            </template>

            <Column field="title" :header="t('reviewQueue.colDocument')" sortable>
              <template #body="{ data }">
                <div class="flex min-w-0 items-center gap-2 py-0.5">
                  <i :class="getFileIcon(data.mimeType)" aria-hidden="true" />
                  <span class="line-clamp-2 font-semibold leading-snug text-[var(--fg-default)]">{{
                    data.title
                  }}</span>
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
                <button
                  v-if="data.evaluationScore != null"
                  type="button"
                  class="rounded-md p-0.5 outline-none transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                  @click="openEvaluationDetail(data)"
                >
                  <EvaluationBadge :score="data.evaluationScore" />
                </button>
                <span v-else class="tabular-nums text-[var(--fg-subtle)]">{{ t('clients.valueEmpty') }}</span>
              </template>
            </Column>

            <Column
              field="latestEvalResult"
              :header="t('reviewQueue.colResult')"
              sortable
            >
              <template #body="{ data }">
                <span v-if="getLatestEvalResult(data)" class="flex items-center gap-1.5">
                  <i
                    :class="[
                      'text-sm',
                      getLatestEvalResult(data) === 'passed'
                        ? 'pi pi-check-circle text-emerald-600 dark:text-emerald-400'
                        : 'pi pi-times-circle text-red-600 dark:text-red-300',
                    ]"
                    aria-hidden="true"
                  />
                  <span
                    class="text-xs font-semibold"
                    :class="
                      getLatestEvalResult(data) === 'passed'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-700 dark:text-red-300'
                    "
                  >
                    {{
                      getLatestEvalResult(data) === 'passed' ? t('reviewQueue.passed') : t('reviewQueue.failed')
                    }}
                  </span>
                </span>
                <span v-else class="tabular-nums text-[var(--fg-subtle)]">{{ t('clients.valueEmpty') }}</span>
              </template>
            </Column>

            <Column
              field="folder.trackable.title"
              :header="t('reviewQueue.colProject')"
              sortable
            >
              <template #body="{ data }">
                <span class="line-clamp-2 text-sm text-[var(--fg-muted)]">
                  {{ data.folder?.trackable?.title ?? t('clients.valueEmpty') }}
                </span>
              </template>
            </Column>

            <Column field="workflowItem.title" :header="t('reviewQueue.colActivity')" sortable>
              <template #body="{ data }">
                <span class="line-clamp-2 text-sm text-[var(--fg-muted)]">
                  {{ data.workflowItem?.title ?? t('clients.valueEmpty') }}
                </span>
              </template>
            </Column>

            <Column field="updatedAt" :header="t('reviewQueue.colModified')" sortable>
              <template #body="{ data }">
                <span class="tabular-nums text-sm" style="font-feature-settings: 'tnum' 1, 'lnum' 1">
                  {{ formatDocDate(data.updatedAt) }}
                </span>
              </template>
            </Column>

            <Column :header="t('reviewQueue.colActions')" class="rq-actions-col w-0 min-w-[8rem] whitespace-nowrap">
              <template #body="{ data }">
                <div class="rq-row-actions" role="group" :aria-label="t('common.actions')">
                  <Button
                    v-if="data.evaluationScore != null"
                    type="button"
                    icon="pi pi-search"
                    variant="outlined"
                    rounded
                    size="small"
                    severity="secondary"
                    :aria-label="t('reviewQueue.tooltipEval')"
                    v-tooltip.top="t('reviewQueue.tooltipEval')"
                    @click="openEvaluationDetail(data)"
                  />
                  <Button
                    v-if="data.evaluationScore != null"
                    type="button"
                    icon="pi pi-list"
                    variant="outlined"
                    rounded
                    size="small"
                    severity="secondary"
                    :aria-label="t('reviewQueue.tooltipLog')"
                    v-tooltip.top="t('reviewQueue.tooltipLog')"
                    @click="openProcessLog(data)"
                  />
                  <Button
                    v-if="canDocUpdate && (data.reviewStatus === 'draft' || data.reviewStatus === 'revision_needed')"
                    type="button"
                    icon="pi pi-send"
                    variant="outlined"
                    rounded
                    size="small"
                    severity="info"
                    :aria-label="t('reviewQueue.tooltipSubmit')"
                    v-tooltip.top="t('reviewQueue.tooltipSubmit')"
                    @click="submitForReview(data)"
                  />
                  <Button
                    v-if="canDocUpdate && data.reviewStatus === 'submitted' && data.evaluationScore == null"
                    type="button"
                    icon="pi pi-replay"
                    variant="outlined"
                    rounded
                    size="small"
                    severity="warn"
                    :aria-label="t('reviewQueue.tooltipEvaluate')"
                    v-tooltip.top="t('reviewQueue.tooltipEvaluate')"
                    @click="reEvaluate(data)"
                  />
                  <Button
                    v-if="canOpenFlowLinks && data.workflowItem && data.folder?.trackable"
                    type="button"
                    icon="pi pi-external-link"
                    variant="outlined"
                    rounded
                    size="small"
                    severity="secondary"
                    :aria-label="t('reviewQueue.tooltipActivity')"
                    v-tooltip.top="t('reviewQueue.tooltipActivity')"
                    @click="goToActivity(data)"
                  />
                  <Button
                    v-if="canDocRead"
                    type="button"
                    icon="pi pi-file-edit"
                    variant="outlined"
                    rounded
                    size="small"
                    severity="secondary"
                    :aria-label="t('reviewQueue.tooltipEdit')"
                    v-tooltip.top="t('reviewQueue.tooltipEdit')"
                    @click="router.push(`/documents/${data.id}/edit`)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>

        <div
          v-if="!loading && totalRecords > 0"
          class="flex-shrink-0 border-t border-[var(--surface-border)] bg-[var(--surface-raised)] px-4 py-3 sm:px-5"
        >
          <Paginator
            :first="first"
            :rows="pageSize"
            :total-records="totalRecords"
            :rows-per-page-options="[10, 20, 50]"
            :current-page-report-template="t('reviewQueue.tablePageReport')"
            template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
            @page="onPaginatorPage"
          />
        </div>
      </div>
    </template>

    <EvaluationDetails v-model:visible="showEvaluation" :evaluation="selectedEvaluation" />
    <ReviewProcessLog v-model:visible="showProcessLog" :document-id="selectedDocId" :document-title="selectedDocTitle" />
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
import Paginator from 'primevue/paginator';
import Skeleton from 'primevue/skeleton';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
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
const { t, locale } = useI18n();
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

const searchQuery = ref('');
const hasActiveFilters = computed(() => searchQuery.value.trim().length > 0);

/** PrimeVue ordena por campo; aquí combinamos filtros + sort en datos completos antes de paginar */
const sortField = ref<string | undefined>('updatedAt');
const sortOrder = ref<number>(-1);

const first = ref(0);
const pageSize = ref(20);

watch(searchQuery, () => {
  first.value = 0;
});

function clearFilters() {
  searchQuery.value = '';
}

const filteredDocuments = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return documents.value;
  return documents.value.filter((doc) => {
    const hay = [
      doc.title,
      doc.reviewStatus,
      doc.folder?.trackable?.title,
      doc.workflowItem?.title,
      doc.mimeType,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
});

function getSortComparable(doc: any, field: string | undefined): string | number {
  switch (field) {
    case 'title':
      return (doc.title ?? '').toLowerCase();
    case 'reviewStatus':
      return (doc.reviewStatus ?? '').toLowerCase();
    case 'evaluationScore':
      return doc.evaluationScore == null ? Number.NEGATIVE_INFINITY : Number(doc.evaluationScore);
    case 'latestEvalResult': {
      const r = getLatestEvalResult(doc);
      if (!r) return '';
      return r === 'passed' ? '1' : '0';
    }
    case 'folder.trackable.title':
      return (doc.folder?.trackable?.title ?? '').toLowerCase();
    case 'workflowItem.title':
      return (doc.workflowItem?.title ?? '').toLowerCase();
    case 'updatedAt':
      return new Date(doc.updatedAt).getTime();
    default:
      return '';
  }
}

const sortedDocuments = computed(() => {
  const rows = [...filteredDocuments.value];
  const field = sortField.value ?? 'updatedAt';
  const order = sortOrder.value === 1 || sortOrder.value === -1 ? sortOrder.value : -1;

  rows.sort((a, b) => {
    const va = getSortComparable(a, field);
    const vb = getSortComparable(b, field);

    let cmp = 0;
    if (typeof va === 'number' && typeof vb === 'number') {
      cmp = va - vb;
    } else {
      cmp = String(va).localeCompare(String(vb), locale.value === 'en' ? 'en-GB' : 'es');
    }

    const eff = cmp * (order ?? 1);

    /** Empates útiles cuando sort por updatedAt descendente coincide */
    if (eff === 0 && docId(a) !== docId(b)) {
      const ta = getSortComparable(a, 'updatedAt');
      const tb = getSortComparable(b, 'updatedAt');
      cmp = typeof ta === 'number' && typeof tb === 'number' ? ta - tb : String(ta).localeCompare(String(tb));
      return cmp * -1;
    }
    return eff;
  });
  return rows;
});

function docId(doc: any): string {
  return String(doc?.id ?? '');
}

const totalRecords = computed(() => sortedDocuments.value.length);

const paginatedRows = computed(() => {
  const start = first.value;
  return sortedDocuments.value.slice(start, start + pageSize.value);
});

function onPaginatorPage(e: { first?: number; rows?: number }) {
  first.value = e.first ?? 0;
  if (typeof e.rows === 'number') pageSize.value = e.rows;
}

watch([sortField, sortOrder], () => {
  first.value = 0;
});

watch(totalRecords, (n) => {
  if (n > 0 && first.value >= n) first.value = 0;
});

const showEvaluation = ref(false);
const selectedEvaluation = ref<any>(null);

const showProcessLog = ref(false);
const selectedDocId = ref<string | null>(null);
const selectedDocTitle = ref<string | undefined>(undefined);

function formatDocDate(iso: string): string {
  const loc = locale.value === 'en' ? 'en-GB' : 'es-PE';
  return new Date(iso).toLocaleDateString(loc, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

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
      toast.add({
        severity: 'info',
        summary: t('reviewQueue.toastNoEvalSummary'),
        detail: t('reviewQueue.toastNoEvalDetail'),
        life: 3000,
      });
      return;
    }
    selectedEvaluation.value = evaluations[0];
    showEvaluation.value = true;
  } catch {
    toast.add({
      severity: 'error',
      summary: t('reviewQueue.toastErrorSummary'),
      detail: t('reviewQueue.toastLoadEvalFail'),
      life: 3000,
    });
  }
}

async function submitForReview(doc: any) {
  if (!canDocUpdate.value) return;
  try {
    await apiClient.post(`/documents/${doc.id}/submit-review`);
    toast.add({
      severity: 'success',
      summary: t('reviewQueue.toastSubmitQueuedSummary'),
      detail: t('reviewQueue.toastSubmitQueuedDetail'),
      life: 4000,
    });
    await loadQueue();
  } catch {
    toast.add({
      severity: 'error',
      summary: t('reviewQueue.toastErrorSummary'),
      detail: t('reviewQueue.toastSubmitFail'),
      life: 4000,
    });
  }
}

function getFileIcon(mimeType: string): string {
  const base = 'text-[0.9375rem] shrink-0';
  if (mimeType?.includes('pdf')) return `pi pi-file-pdf text-red-600 ${base}`;
  if (mimeType?.includes('word') || mimeType?.includes('officedocument.wordprocessingml'))
    return `pi pi-file-word text-accent ${base}`;
  if (mimeType?.includes('image')) return `pi pi-image text-emerald-600 ${base}`;
  return `pi pi-file text-[var(--fg-subtle)] ${base}`;
}

async function reEvaluate(doc: any) {
  if (!canDocUpdate.value) return;
  try {
    await apiClient.post(`/documents/${doc.id}/evaluate`);
    toast.add({
      severity: 'success',
      summary: t('reviewQueue.toastEvaluateQueuedSummary'),
      detail: t('reviewQueue.toastEvaluateQueuedDetail'),
      life: 4000,
    });
    await loadQueue();
  } catch {
    toast.add({
      severity: 'error',
      summary: t('reviewQueue.toastErrorSummary'),
      detail: t('reviewQueue.toastEvaluateFail'),
      life: 4000,
    });
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
  const sorted = [...evals].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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

<style scoped>
.review-queue-toolbar :deep(.toolbar-search.p-inputtext) {
  border-radius: 0.75rem;
  background: var(--surface-app-soft);
  border-color: var(--surface-border);
  color: var(--fg-default);
}

:deep(.functional-table.rq-data-table .p-datatable-thead > tr > th) {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fg-subtle);
  background: var(--surface-sunken);
}

html.dark :deep(.functional-table.rq-data-table .p-datatable-thead > tr > th) {
  color: rgba(214, 218, 248, 0.85);
}

:deep(.rq-row-actions) {
  display: inline-flex !important;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem !important;
}

:deep(.rq-row-actions .p-button) {
  width: 2.25rem !important;
  height: 2.25rem !important;
  padding: 0 !important;
}

:deep(.rq-row-actions .p-button-icon) {
  font-size: 0.875rem;
}

:deep(.toolbar-iconfield.p-iconfield),
:deep(.toolbar-iconfield.p-input-icon-field) {
  width: 100%;
}
</style>
