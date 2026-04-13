<template>
  <Dialog v-model:visible="visible" header="Resultados de evaluación" modal :style="{ width: '600px' }">
    <div v-if="evaluation" class="space-y-6">
      <!-- Overall score -->
      <div class="text-center">
        <div class="text-4xl font-bold" :class="scoreColor">
          {{ Math.round(evaluation.score * 100) }}%
        </div>
        <Tag :value="evaluation.result === 'passed' ? 'Aprobado' : 'Necesita revisión'" :severity="evaluation.result === 'passed' ? 'success' : 'danger'" class="mt-2" />
      </div>

      <!-- Spelling -->
      <div v-if="evaluation.details?.spelling">
        <h4 class="font-semibold mb-2">Ortografía</h4>
        <ProgressBar :value="Math.round(evaluation.details.spelling.accuracy * 100)" :class="evaluation.details.spelling.accuracy > 0.9 ? 'p-progressbar-success' : 'p-progressbar-warn'" />
        <p class="text-sm text-gray-600 mt-1">
          {{ evaluation.details.spelling.misspelledCount }} errores en {{ evaluation.details.spelling.totalWords }} palabras
        </p>
        <div v-if="evaluation.details.spelling.misspelledWords.length" class="mt-2">
          <Tag v-for="word in evaluation.details.spelling.misspelledWords.slice(0, 10)" :key="word" :value="word" severity="warn" class="mr-1 mb-1" />
        </div>
      </div>

      <!-- Structure -->
      <div v-if="evaluation.details?.structure">
        <h4 class="font-semibold mb-2">Estructura</h4>
        <ProgressBar :value="Math.round(evaluation.details.structure.completeness * 100)" />
        <p class="text-sm text-gray-600 mt-1">
          {{ evaluation.details.structure.matchedSections.length }} de {{ evaluation.details.structure.templateSections.length }} secciones presentes
        </p>
        <div v-if="evaluation.details.structure.missingSections.length" class="mt-2">
          <p class="text-sm text-red-600">Secciones faltantes:</p>
          <ul class="list-disc list-inside text-sm">
            <li v-for="s in evaluation.details.structure.missingSections" :key="s">{{ s }}</li>
          </ul>
        </div>
      </div>

      <!-- References -->
      <div v-if="evaluation.details?.references">
        <h4 class="font-semibold mb-2">Referencias</h4>
        <p class="text-sm text-gray-600">
          {{ evaluation.details.references.totalReferences }} referencias encontradas
        </p>
        <div v-if="evaluation.details.references.outdatedReferences.length" class="mt-2">
          <p class="text-sm text-amber-600">Referencias desactualizadas:</p>
          <ul class="list-disc list-inside text-sm">
            <li v-for="r in evaluation.details.references.outdatedReferences" :key="r">{{ r }}</li>
          </ul>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import ProgressBar from 'primevue/progressbar';

const visible = defineModel<boolean>('visible');
const props = defineProps<{ evaluation: any }>();

const scoreColor = computed(() => {
  if (!props.evaluation) return 'text-gray-400';
  if (props.evaluation.score >= 0.8) return 'text-green-600';
  if (props.evaluation.score >= 0.5) return 'text-amber-600';
  return 'text-red-600';
});
</script>
