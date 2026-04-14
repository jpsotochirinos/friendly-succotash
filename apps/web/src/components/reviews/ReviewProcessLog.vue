<template>
  <Dialog
    v-model:visible="visible"
    :header="dialogHeader"
    modal
    :style="{ width: '720px' }"
    :breakpoints="{ '768px': '95vw' }"
  >
    <div v-if="loading" class="flex items-center justify-center py-12">
      <i class="pi pi-spin pi-spinner text-3xl text-gray-400" />
    </div>

    <div v-else-if="noData" class="text-center py-12 text-gray-400">
      <i class="pi pi-info-circle text-4xl mb-3 block" />
      <span>No hay evaluaciones disponibles para este documento.</span>
    </div>

    <div v-else-if="log" class="space-y-6">
      <!-- Overall verdict -->
      <div class="flex items-center justify-between p-4 rounded-lg" :class="verdictBg">
        <div class="flex items-center gap-3">
          <i
            class="text-3xl"
            :class="log.passed ? 'pi pi-check-circle text-green-600' : 'pi pi-times-circle text-red-500'"
          />
          <div>
            <div class="text-lg font-bold" :class="log.passed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'">
              {{ log.verdict }}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-300">
              Evaluado el {{ formatDate(log.evaluatedAt) }}
            </div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-3xl font-bold" :class="scoreColor">
            {{ Math.round(log.overallScore * 100) }}%
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            Umbral: {{ Math.round(log.threshold * 100) }}%
          </div>
        </div>
      </div>

      <!-- Narrative summary -->
      <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-2 mb-2">
          <i class="pi pi-book text-gray-500" />
          <span class="font-semibold text-gray-700 dark:text-gray-200">Resumen</span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {{ log.narrativeSummary }}
        </p>
      </div>

      <!-- Process timeline -->
      <div>
        <div class="flex items-center gap-2 mb-4">
          <i class="pi pi-list text-gray-500" />
          <span class="font-semibold text-gray-700 dark:text-gray-200">Proceso de evaluación</span>
        </div>

        <Timeline :value="log.steps" class="pl-2">
          <template #marker="{ item }">
            <span
              class="flex items-center justify-center w-8 h-8 rounded-full"
              :class="stepMarkerClass(item.status)"
            >
              <i :class="stepIcon(item.status)" class="text-sm" />
            </span>
          </template>
          <template #content="{ item }">
            <div class="mb-4 -mt-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold text-gray-800 dark:text-gray-100">{{ item.label }}</span>
                <Tag
                  v-if="item.score != null"
                  :value="`${Math.round(item.score * 100)}%`"
                  :severity="item.status === 'passed' ? 'success' : item.status === 'failed' ? 'danger' : 'secondary'"
                  class="text-xs"
                />
                <Tag
                  :value="stepStatusLabel(item.status)"
                  :severity="item.status === 'passed' ? 'success' : item.status === 'failed' ? 'danger' : 'secondary'"
                  class="text-xs"
                />
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{{ item.summary }}</p>

              <!-- Expandable details -->
              <div v-if="hasExpandableDetails(item)" class="mt-1">
                <button
                  class="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                  @click="toggleExpand(item.name)"
                >
                  <i :class="expanded[item.name] ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" class="text-xs" />
                  {{ expanded[item.name] ? 'Ocultar detalles' : 'Ver detalles' }}
                </button>
                <div v-if="expanded[item.name]" class="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                  <!-- Spelling details -->
                  <template v-if="item.name === 'spelling' && item.details.misspelledWords?.length">
                    <p class="text-gray-500 dark:text-gray-400 mb-1">Palabras con errores:</p>
                    <div class="flex flex-wrap gap-1">
                      <Tag
                        v-for="word in item.details.misspelledWords.slice(0, 20)"
                        :key="word"
                        :value="word"
                        severity="warn"
                      />
                      <span v-if="item.details.misspelledWords.length > 20" class="text-xs text-gray-400 self-center">
                        y {{ item.details.misspelledWords.length - 20 }} más...
                      </span>
                    </div>
                  </template>

                  <!-- Citations details -->
                  <template v-if="item.name === 'citations'">
                    <div v-if="item.details.invalidCitations?.length">
                      <p class="text-red-600 dark:text-red-400 mb-1">Citas inválidas:</p>
                      <ul class="list-disc list-inside text-gray-600 dark:text-gray-400">
                        <li v-for="c in item.details.invalidCitations" :key="c">{{ c }}</li>
                      </ul>
                    </div>
                    <div v-if="item.details.citationsFound?.length">
                      <p class="text-gray-500 dark:text-gray-400 mb-1 mt-2">Citas encontradas:</p>
                      <div class="flex flex-wrap gap-1">
                        <Tag
                          v-for="c in item.details.citationsFound.slice(0, 15)"
                          :key="c"
                          :value="c"
                          severity="info"
                        />
                      </div>
                    </div>
                  </template>

                  <!-- Coherence details -->
                  <template v-if="item.name === 'coherence'">
                    <div v-if="item.details.issues?.length" class="mb-2">
                      <p class="text-amber-600 dark:text-amber-400 mb-1">Problemas detectados:</p>
                      <ul class="list-disc list-inside text-gray-600 dark:text-gray-400">
                        <li v-for="issue in item.details.issues" :key="issue">{{ issue }}</li>
                      </ul>
                    </div>
                    <div v-if="item.details.suggestions?.length">
                      <p class="text-blue-600 dark:text-blue-400 mb-1">Sugerencias:</p>
                      <ul class="list-disc list-inside text-gray-600 dark:text-gray-400">
                        <li v-for="sug in item.details.suggestions" :key="sug">{{ sug }}</li>
                      </ul>
                    </div>
                  </template>

                  <!-- References details -->
                  <template v-if="item.name === 'references' && item.details.outdatedReferences?.length">
                    <p class="text-amber-600 dark:text-amber-400 mb-1">Referencias desactualizadas:</p>
                    <ul class="list-disc list-inside text-gray-600 dark:text-gray-400">
                      <li v-for="r in item.details.outdatedReferences" :key="r">{{ r }}</li>
                    </ul>
                  </template>

                  <!-- Structure details -->
                  <template v-if="item.name === 'structure' && item.details.missingSections?.length">
                    <p class="text-red-600 dark:text-red-400 mb-1">Secciones faltantes:</p>
                    <ul class="list-disc list-inside text-gray-600 dark:text-gray-400">
                      <li v-for="s in item.details.missingSections" :key="s">{{ s }}</li>
                    </ul>
                  </template>
                </div>
              </div>
            </div>
          </template>
        </Timeline>
      </div>
    </div>

    <template #footer>
      <Button label="Cerrar" icon="pi pi-times" text @click="visible = false" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, reactive } from 'vue';
import Dialog from 'primevue/dialog';
import Timeline from 'primevue/timeline';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { apiClient } from '@/api/client';

interface LogStep {
  name: string;
  label: string;
  status: 'passed' | 'failed' | 'skipped';
  score: number | null;
  summary: string;
  details: Record<string, unknown>;
}

interface EvaluationLog {
  documentId: string;
  evaluationId: string;
  evaluatedAt: string;
  overallScore: number;
  threshold: number;
  passed: boolean;
  verdict: string;
  narrativeSummary: string;
  steps: LogStep[];
}

const props = defineProps<{
  documentId: string | null;
  documentTitle?: string;
}>();

const visible = defineModel<boolean>('visible');
const toast = useToast();

const log = ref<EvaluationLog | null>(null);
const loading = ref(false);
const noData = ref(false);
const expanded = reactive<Record<string, boolean>>({});

const dialogHeader = computed(() =>
  props.documentTitle
    ? `Log de revisión — ${props.documentTitle}`
    : 'Log de revisión',
);

const verdictBg = computed(() =>
  log.value?.passed
    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
);

const scoreColor = computed(() => {
  if (!log.value) return 'text-gray-400';
  if (log.value.overallScore >= 0.8) return 'text-green-600 dark:text-green-400';
  if (log.value.overallScore >= 0.5) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
});

function stepMarkerClass(status: string) {
  if (status === 'passed') return 'bg-green-100 dark:bg-green-900/40 text-green-600';
  if (status === 'failed') return 'bg-red-100 dark:bg-red-900/40 text-red-500';
  return 'bg-gray-100 dark:bg-gray-700 text-gray-400';
}

function stepIcon(status: string) {
  if (status === 'passed') return 'pi pi-check';
  if (status === 'failed') return 'pi pi-times';
  return 'pi pi-minus';
}

function stepStatusLabel(status: string) {
  if (status === 'passed') return 'Aprobado';
  if (status === 'failed') return 'No aprobado';
  return 'Omitido';
}

function hasExpandableDetails(item: LogStep): boolean {
  const d = item.details;
  if (item.name === 'spelling') return (d.misspelledWords as string[])?.length > 0;
  if (item.name === 'citations') return (d.citationsFound as string[])?.length > 0 || (d.invalidCitations as string[])?.length > 0;
  if (item.name === 'coherence') return (d.issues as string[])?.length > 0 || (d.suggestions as string[])?.length > 0;
  if (item.name === 'references') return (d.outdatedReferences as string[])?.length > 0;
  if (item.name === 'structure') return (d.missingSections as string[])?.length > 0;
  return false;
}

function toggleExpand(name: string) {
  expanded[name] = !expanded[name];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function fetchLog() {
  if (!props.documentId) return;
  loading.value = true;
  noData.value = false;
  log.value = null;
  Object.keys(expanded).forEach(k => delete expanded[k]);

  try {
    const { data } = await apiClient.get(`/documents/${props.documentId}/evaluation-log`);
    if (data.message && !data.steps) {
      noData.value = true;
    } else {
      log.value = data;
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el log de evaluación.', life: 4000 });
    noData.value = true;
  } finally {
    loading.value = false;
  }
}

watch(visible, (val) => {
  if (val && props.documentId) fetchLog();
});
</script>
