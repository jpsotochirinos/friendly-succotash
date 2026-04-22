<template>
  <div role="form" :aria-labelledby="headingId" class="space-y-5 pt-2">
    <h3 :id="headingId" class="text-lg font-semibold text-brand-medianoche dark:text-brand-papel">
      {{ $t('onboarding.stepPracticeHeading') }}
    </h3>
    <p class="text-sm" :style="{ color: 'var(--fg-muted)' }">{{ $t('onboarding.practiceAreas') }}</p>
    <div class="flex flex-wrap gap-2">
      <Button
        v-for="key in PRACTICE_AREA_KEYS"
        :key="key"
        type="button"
        :label="$t(`onboarding.practiceOptions.${key}`)"
        :severity="selected.includes(key) ? 'primary' : 'secondary'"
        :outlined="!selected.includes(key)"
        size="small"
        @click="toggle(key)"
      />
    </div>
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-gray-700 dark:text-brand-hielo" for="onb-practice-other">{{
        $t('onboarding.practiceAreasOther')
      }}</label>
      <InputText id="onb-practice-other" v-model="otherModel" class="w-full" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { PRACTICE_AREA_KEYS } from '../onboarding.types';

const props = defineProps<{
  modelValue: { practiceAreas: string[]; practiceAreasOther: string };
}>();

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue];
}>();

const headingId = 'onboarding-step-practice-heading';

const selected = computed(() => props.modelValue.practiceAreas);

function toggle(key: string) {
  const set = new Set(props.modelValue.practiceAreas);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  emit('update:modelValue', {
    ...props.modelValue,
    practiceAreas: [...set],
  });
}

const otherModel = computed({
  get: () => props.modelValue.practiceAreasOther,
  set: (v) => emit('update:modelValue', { ...props.modelValue, practiceAreasOther: v }),
});
</script>
