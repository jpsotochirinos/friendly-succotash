<template>
  <nav class="onb-stepper-h w-full" :aria-label="ariaLabel">
    <p :id="progressId" class="sr-only">{{ progressLabel }}</p>
    <div class="mb-2 text-xs font-medium tabular-nums" :style="{ color: 'var(--fg-muted)' }" aria-hidden="true">
      {{ progressLabel }}
    </div>
    <div class="flex w-full gap-1.5 sm:gap-2" :aria-describedby="progressId">
      <button
        v-for="(step, index) in steps"
        :key="step.key"
        type="button"
        class="flex-1 min-w-0 h-2.5 sm:h-2 rounded-full transition-[background-color,box-shadow] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-zafiro focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-raised)]"
        :class="segmentClass(index)"
        :disabled="index > currentStep"
        :aria-current="index === currentStep ? 'step' : undefined"
        :aria-label="stepAriaLabel(index)"
        @click="onStepClick(index)"
      />
    </div>
    <!-- Optional labels: scroll on narrow screens -->
    <div class="mt-2.5 flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1 sm:justify-between sm:overflow-visible">
      <button
        v-for="(step, index) in steps"
        :key="`lbl-${step.key}`"
        type="button"
        class="shrink-0 text-left rounded-md px-1 py-1 min-h-[44px] sm:min-h-0 max-w-[7.5rem] sm:max-w-none sm:flex-1"
        :class="labelButtonClass(index)"
        :disabled="index > currentStep"
        @click="onStepClick(index)"
      >
        <span class="block text-[11px] font-semibold leading-tight line-clamp-2" :style="{ color: 'var(--fg-default)' }">
          {{ step.label }}
        </span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export interface OnboardingRailStep {
  key: string;
  label: string;
  hint: string;
}

const props = defineProps<{
  steps: OnboardingRailStep[];
  currentStep: number;
}>();

const emit = defineEmits<{
  'update:currentStep': [value: number];
}>();

const { t } = useI18n();
/** Single onboarding view per document — stable id for aria-describedby. */
const progressId = 'onboarding-rail-progress';

const ariaLabel = computed(() => t('onboarding.railAriaLabel'));

const progressPct = computed(() =>
  props.steps.length ? ((props.currentStep + 1) / props.steps.length) * 100 : 0,
);

const progressLabel = computed(() =>
  t('onboarding.railProgress', {
    pct: Math.round(progressPct.value),
    current: props.currentStep + 1,
    total: props.steps.length,
  }),
);

function segmentClass(index: number) {
  if (index < props.currentStep) return 'bg-brand-zafiro hover:brightness-110 cursor-pointer';
  if (index === props.currentStep) return 'bg-brand-zafiro shadow-[0_0_0_2px_var(--brand-zafiro)]/25';
  return 'bg-[color:var(--surface-border)] opacity-70 cursor-not-allowed';
}

function labelButtonClass(index: number) {
  if (index === props.currentStep) return 'ring-1 ring-brand-zafiro/30 bg-brand-zafiro/5';
  if (index < props.currentStep) return 'opacity-90 hover:bg-[color:var(--surface-ground)] cursor-pointer';
  return 'opacity-45 cursor-not-allowed';
}

function stepAriaLabel(index: number) {
  const s = props.steps[index];
  if (!s) return '';
  return t('onboarding.railStepAria', { n: index + 1, label: s.label });
}

function onStepClick(index: number) {
  if (index < props.currentStep) emit('update:currentStep', index);
}
</script>
