<template>
  <InformationalDialogBase
    v-model:visible="open"
    :variant="detailVariant"
    :eyebrow="t('evaluationDetails.eyebrow')"
    :title="t('evaluationDetails.title')"
    :message="t('evaluationDetails.intro')"
    :facts="detailFacts"
    icon="pi pi-chart-bar"
    :close-label="t('common.gotIt')"
    :close-aria-label="t('common.close')"
  >
    <!-- Desglose dimensiones -->
    <div v-if="evaluation" class="evaluation-details-slots flex flex-col gap-5">
      <section v-if="evaluation.details?.spelling" class="evaluation-details-block">
        <div class="evaluation-details-pbar-head">
          <h3 class="evaluation-details-h3 m-0">{{ t('evaluationDetails.sectionSpelling') }}</h3>
          <span
            class="evaluation-details-pct shrink-0 tabular-nums"
            style="font-feature-settings: 'tnum' 1, 'lnum' 1"
          >
            {{ Math.round(evaluation.details.spelling.accuracy * 100) }} %
          </span>
        </div>
        <ProgressBar
          :value="Math.round(evaluation.details.spelling.accuracy * 100)"
          :show-value="false"
          class="evaluation-details-pbar"
          :class="
            evaluation.details.spelling.accuracy > 0.9 ? 'p-progressbar-success' : 'evaluation-details-pbar--warn'
          "
        />
        <p class="evaluation-details-muted">
          {{
            t('evaluationDetails.spellingErrors', {
              n: evaluation.details.spelling.misspelledCount,
              total: evaluation.details.spelling.totalWords,
            })
          }}
        </p>
        <div v-if="evaluation.details.spelling.misspelledWords.length" class="mt-2 flex flex-wrap gap-1">
          <Tag
            v-for="word in evaluation.details.spelling.misspelledWords.slice(0, 10)"
            :key="word"
            :value="word"
            severity="warn"
          />
        </div>
      </section>

      <section v-if="evaluation.details?.structure" class="evaluation-details-block">
        <div class="evaluation-details-pbar-head">
          <h3 class="evaluation-details-h3 m-0">{{ t('evaluationDetails.sectionStructure') }}</h3>
          <span
            class="evaluation-details-pct shrink-0 tabular-nums"
            style="font-feature-settings: 'tnum' 1, 'lnum' 1"
          >
            {{ Math.round(evaluation.details.structure.completeness * 100) }} %
          </span>
        </div>
        <ProgressBar
          :value="Math.round(evaluation.details.structure.completeness * 100)"
          :show-value="false"
          class="evaluation-details-pbar"
          :class="
            evaluation.details.structure.completeness > 0.9 ? 'p-progressbar-success' : 'evaluation-details-pbar--warn'
          "
        />
        <p class="evaluation-details-muted">
          {{
            t('evaluationDetails.sectionsProgress', {
              matched: evaluation.details.structure.matchedSections.length,
              total: evaluation.details.structure.templateSections.length,
            })
          }}
        </p>
        <div v-if="evaluation.details.structure.missingSections.length" class="mt-2 space-y-1">
          <p class="m-0 text-sm font-semibold text-red-600 dark:text-red-300">
            {{ t('evaluationDetails.missingSections') }}
          </p>
          <ul class="m-0 list-inside list-disc text-sm leading-snug text-[var(--fg-muted)]">
            <li v-for="s in evaluation.details.structure.missingSections" :key="s">{{ s }}</li>
          </ul>
        </div>
      </section>

      <section v-if="evaluation.details?.references" class="evaluation-details-block">
        <h3 class="evaluation-details-h3">{{ t('evaluationDetails.sectionReferences') }}</h3>
        <p class="evaluation-details-muted">
          {{
            t('evaluationDetails.refsFoundLine', {
              n: evaluation.details.references.totalReferences,
            })
          }}
        </p>
        <div v-if="evaluation.details.references.outdatedReferences.length" class="mt-2 space-y-1">
          <p class="m-0 text-sm font-semibold text-amber-700 dark:text-amber-300">
            {{ t('evaluationDetails.outdatedRefs') }}
          </p>
          <ul class="m-0 list-inside list-disc text-sm leading-snug text-[var(--fg-muted)]">
            <li v-for="r in evaluation.details.references.outdatedReferences" :key="r">{{ r }}</li>
          </ul>
        </div>
      </section>
    </div>
  </InformationalDialogBase>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Tag from 'primevue/tag';
import ProgressBar from 'primevue/progressbar';
import InformationalDialogBase from '@/components/common/InformationalDialogBase.vue';
import type {
  InformationalDialogFact,
  InformationalDialogVariant,
} from '@/components/common/InformationalDialogBase.vue';

const open = defineModel<boolean>('visible', { required: true });
const props = defineProps<{ evaluation: any | null }>();

const { t } = useI18n();

/** En cabeceras de sección equivale a § Section H2 (16px semibold · fg-default) */
const evaluation = computed(() => props.evaluation ?? null);

const detailVariant = computed<InformationalDialogVariant>(() => {
  if (!evaluation.value) return 'neutral';
  return evaluation.value.result === 'passed' ? 'success' : 'warning';
});

const detailFacts = computed<InformationalDialogFact[]>(() => {
  const ev = evaluation.value;
  if (!ev) return [];
  const verdict =
    ev.result === 'passed' ? t('evaluationDetails.verdictPassed') : t('evaluationDetails.verdictNeedsReview');
  return [
    {
      label: t('evaluationDetails.factScore'),
      value: `${Math.round(ev.score * 100)} %`,
    },
    {
      label: t('evaluationDetails.factVerdict'),
      value: verdict,
    },
  ];
});
</script>

<style scoped>
.evaluation-details-pbar-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.evaluation-details-pbar-head .evaluation-details-h3 {
  margin: 0;
}

.evaluation-details-pct {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--fg-muted);
}

.evaluation-details-h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--fg-default);
}

.evaluation-details-muted {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--fg-muted);
}

/** Barra fina pero visible; el % va en .evaluation-details-pct (PrimeVue pondría el texto dentro de 6px) */
:deep(.evaluation-details-pbar.evaluation-details-pbar--warn .p-progressbar-value) {
  background: color-mix(in srgb, #d97706 85%, var(--accent));
}

:deep(.evaluation-details-pbar.p-progressbar) {
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--surface-border);
  background: var(--surface-sunken);
}

:deep(.evaluation-details-pbar .p-progressbar-value) {
  transition: width 0.25s ease;
}
</style>
