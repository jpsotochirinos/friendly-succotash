<template>
  <div class="p-6 dark:bg-gray-900 min-h-full">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold dark:text-gray-100">Cola de revisiones</h1>
      <Button icon="pi pi-refresh" label="Actualizar" size="small" outlined @click="loadQueue" />
    </div>

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
        <div class="text-center py-12 text-gray-400">
          <i class="pi pi-inbox text-4xl mb-3 block" />
          <span>No hay documentos en la cola de revisión</span>
        </div>
      </template>

      <Column field="title" header="Documento" sortable>
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <i :class="getFileIcon(data.mimeType)" />
            <span class="font-medium">{{ data.title }}</span>
          </div>
        </template>
      </Column>

      <Column field="reviewStatus" header="Estado" sortable>
        <template #body="{ data }">
          <StatusBadge :status="data.reviewStatus" />
        </template>
      </Column>

      <Column field="evaluationScore" header="Evaluación" sortable>
        <template #body="{ data }">
          <span
            v-if="data.evaluationScore != null"
            class="cursor-pointer"
            @click="openEvaluationDetail(data)"
          >
            <EvaluationBadge :score="data.evaluationScore" />
          </span>
          <span v-else class="text-gray-400">-</span>
        </template>
      </Column>

      <Column header="Resultado" sortable sort-field="latestEvalResult">
        <template #body="{ data }">
          <span v-if="getLatestEvalResult(data)" class="flex items-center gap-1">
            <i
              :class="getLatestEvalResult(data) === 'passed'
                ? 'pi pi-check-circle text-green-600'
                : 'pi pi-times-circle text-red-500'"
              class="text-sm"
            />
            <span
              class="text-xs font-medium"
              :class="getLatestEvalResult(data) === 'passed' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'"
            >
              {{ getLatestEvalResult(data) === 'passed' ? 'Aprobado' : 'No aprobado' }}
            </span>
          </span>
          <span v-else class="text-gray-400">-</span>
        </template>
      </Column>

      <Column header="Proyecto" sortable sort-field="folder.trackable.title">
        <template #body="{ data }">
          <span class="text-gray-700 dark:text-gray-300">
            {{ data.folder?.trackable?.title ?? '—' }}
          </span>
        </template>
      </Column>

      <Column header="Actividad" sortable sort-field="workflowItem.title">
        <template #body="{ data }">
          <span class="text-gray-700 dark:text-gray-300">
            {{ data.workflowItem?.title ?? '—' }}
          </span>
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
            <Button
              v-if="data.evaluationScore != null"
              icon="pi pi-search"
              text
              rounded
              size="small"
              v-tooltip.top="'Ver evaluación'"
              @click="openEvaluationDetail(data)"
            />
            <Button
              v-if="data.evaluationScore != null"
              icon="pi pi-list"
              text
              rounded
              size="small"
              severity="help"
              v-tooltip.top="'Ver log de revisión'"
              @click="openProcessLog(data)"
            />
            <Button
              v-if="data.reviewStatus === 'draft' || data.reviewStatus === 'revision_needed'"
              icon="pi pi-send"
              text
              rounded
              size="small"
              severity="info"
              v-tooltip.top="'Enviar a revisión'"
              @click="submitForReview(data)"
            />
            <Button
              v-if="data.reviewStatus === 'submitted' && data.evaluationScore == null"
              icon="pi pi-replay"
              text
              rounded
              size="small"
              severity="warn"
              v-tooltip.top="'Evaluar ahora'"
              @click="reEvaluate(data)"
            />
            <Button
              v-if="data.workflowItem && data.folder?.trackable"
              icon="pi pi-external-link"
              text
              rounded
              size="small"
              v-tooltip.top="'Ir a la actividad'"
              @click="goToActivity(data)"
            />
            <Button
              icon="pi pi-file-edit"
              text
              rounded
              size="small"
              v-tooltip.top="'Editar documento'"
              @click="router.push(`/documents/${data.id}/edit`)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <EvaluationDetails v-model:visible="showEvaluation" :evaluation="selectedEvaluation" />
    <ReviewProcessLog v-model:visible="showProcessLog" :document-id="selectedDocId" :document-title="selectedDocTitle" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import StatusBadge from '@/components/common/StatusBadge.vue';
import EvaluationBadge from '@/components/documents/EvaluationBadge.vue';
import EvaluationDetails from '@/components/documents/EvaluationDetails.vue';
import ReviewProcessLog from '@/components/reviews/ReviewProcessLog.vue';
import { apiClient } from '@/api/client';

const router = useRouter();
const toast = useToast();
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
  try {
    await apiClient.post(`/documents/${doc.id}/submit-review`);
    toast.add({ severity: 'success', summary: 'Evaluación completada', detail: 'El documento fue evaluado. Recargando resultados...', life: 4000 });
    await loadQueue();
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo enviar a revisión.', life: 4000 });
  }
}

function getFileIcon(mimeType: string): string {
  if (mimeType?.includes('pdf')) return 'pi pi-file-pdf text-red-500';
  if (mimeType?.includes('word') || mimeType?.includes('officedocument.wordprocessingml'))
    return 'pi pi-file-word text-blue-500';
  if (mimeType?.includes('image')) return 'pi pi-image text-green-500';
  return 'pi pi-file text-gray-500';
}

async function reEvaluate(doc: any) {
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
  const trackableId = doc.folder?.trackable?.id;
  const workflowItemId = doc.workflowItem?.id;
  if (trackableId && workflowItemId) {
    router.push(`/trackables/${trackableId}/flow?workflowItemId=${workflowItemId}`);
  }
}

onMounted(() => {
  loadQueue();
});
</script>
