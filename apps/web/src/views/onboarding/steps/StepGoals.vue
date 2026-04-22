<template>
  <div role="form" :aria-labelledby="headingId" class="space-y-6 pt-2">
    <h3 :id="headingId" class="text-lg font-semibold text-brand-medianoche dark:text-brand-papel">
      {{ $t('onboarding.stepGoalsHeading') }}
    </h3>

    <div>
      <p class="text-sm font-medium text-gray-700 dark:text-brand-hielo mb-3">{{ $t('onboarding.goals') }}</p>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="key in GOAL_KEYS"
          :key="key"
          type="button"
          :label="$t(`onboarding.goalOptions.${key}`)"
          :severity="goals.includes(key) ? 'primary' : 'secondary'"
          :outlined="!goals.includes(key)"
          size="small"
          @click="toggleGoal(key)"
        />
      </div>
    </div>

    <div>
      <p class="text-sm font-medium text-gray-700 dark:text-brand-hielo mb-3">{{ $t('onboarding.useCases') }}</p>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="key in USE_CASE_KEYS"
          :key="key"
          type="button"
          :label="$t(`onboarding.useCaseOptions.${key}`)"
          :severity="useCases.includes(key) ? 'primary' : 'secondary'"
          :outlined="!useCases.includes(key)"
          size="small"
          @click="toggleUseCase(key)"
        />
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-brand-hielo mb-2" for="onb-volume">{{
        $t('onboarding.volume')
      }}</label>
      <Dropdown
        id="onb-volume"
        v-model="volumeModel"
        :options="volumeOpts"
        option-label="label"
        option-value="value"
        class="w-full"
        :placeholder="$t('onboarding.volume')"
      />
    </div>

    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-gray-700 dark:text-brand-hielo" for="onb-interests">{{
        $t('onboarding.interestsFreeform')
      }}</label>
      <Textarea
        id="onb-interests"
        v-model="interestsModel"
        rows="4"
        class="w-full"
        auto-resize
        :placeholder="$t('onboarding.interestsPlaceholder')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import Textarea from 'primevue/textarea';
import { GOAL_KEYS, USE_CASE_KEYS, VOLUME_KEYS } from '../onboarding.types';

const props = defineProps<{
  modelValue: {
    goals: string[];
    useCases: string[];
    volume: string;
    interestsFreeform: string;
  };
}>();

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue];
}>();

const { t } = useI18n();
const headingId = 'onboarding-step-goals-heading';

const goals = computed(() => props.modelValue.goals);
const useCases = computed(() => props.modelValue.useCases);

function toggleGoal(key: string) {
  const set = new Set(props.modelValue.goals);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  emit('update:modelValue', { ...props.modelValue, goals: [...set] });
}

function toggleUseCase(key: string) {
  const set = new Set(props.modelValue.useCases);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  emit('update:modelValue', { ...props.modelValue, useCases: [...set] });
}

const volumeModel = computed({
  get: () => props.modelValue.volume,
  set: (v) => emit('update:modelValue', { ...props.modelValue, volume: v ?? '' }),
});

const interestsModel = computed({
  get: () => props.modelValue.interestsFreeform,
  set: (v) => emit('update:modelValue', { ...props.modelValue, interestsFreeform: v }),
});

const volumeOpts = computed(() =>
  VOLUME_KEYS.map((value) => ({ value, label: t(`onboarding.volumeOptions.${value}`) })),
);
</script>
