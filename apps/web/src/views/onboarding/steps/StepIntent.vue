<template>
  <div role="form" class="space-y-6 pt-1" :aria-label="$t('onboarding.intentStepTitle')">

    <div class="grid sm:grid-cols-2 gap-3 sm:gap-4">
      <OnboardingOptionCard
        v-for="key in PRIMARY_INTENT_KEYS"
        :key="key"
        :title="$t(`onboarding.intentCards.${key}.title`)"
        :description="$t(`onboarding.intentCards.${key}.desc`)"
        :icon="intentIcon(key)"
        :selected="model.primaryIntent === key"
        @select="selectIntent(key)"
      />
    </div>

    <div>
      <p class="text-sm font-medium mb-2" :style="{ color: 'var(--fg-default)' }">{{ $t('onboarding.goalsRefine') }}</p>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="key in GOAL_KEYS"
          :key="key"
          type="button"
          :label="$t(`onboarding.goalOptions.${key}`)"
          :severity="model.goals.includes(key) ? 'primary' : 'secondary'"
          :outlined="!model.goals.includes(key)"
          size="small"
          @click="toggleGoal(key)"
        />
      </div>
    </div>

    <div>
      <p class="text-sm font-medium mb-2" :style="{ color: 'var(--fg-default)' }">{{ $t('onboarding.useCasesRefine') }}</p>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="key in USE_CASE_KEYS"
          :key="key"
          type="button"
          :label="$t(`onboarding.useCaseOptions.${key}`)"
          :severity="model.useCases.includes(key) ? 'primary' : 'secondary'"
          :outlined="!model.useCases.includes(key)"
          size="small"
          @click="toggleUseCase(key)"
        />
      </div>
    </div>

    <div>
      <p class="text-sm font-medium mb-2" :style="{ color: 'var(--fg-default)' }">{{ $t('onboarding.painPointsLabel') }}</p>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="key in PAIN_POINT_KEYS"
          :key="key"
          type="button"
          :label="$t(`onboarding.painPointOptions.${key}`)"
          :severity="model.painPoints.includes(key) ? 'primary' : 'secondary'"
          :outlined="!model.painPoints.includes(key)"
          size="small"
          @click="togglePain(key)"
        />
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium mb-2" for="onb-setup-priority" :style="{ color: 'var(--fg-default)' }">
        {{ $t('onboarding.setupPriorityLabel') }}
      </label>
      <Dropdown
        id="onb-setup-priority"
        v-model="priorityModel"
        :options="priorityOpts"
        option-label="label"
        option-value="value"
        show-clear
        class="w-full"
        :placeholder="$t('onboarding.setupPriorityPlaceholder')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import OnboardingOptionCard from '../components/OnboardingOptionCard.vue';
import {
  GOAL_KEYS,
  USE_CASE_KEYS,
  PRIMARY_INTENT_KEYS,
  PAIN_POINT_KEYS,
  SETUP_PRIORITY_KEYS,
  PRIMARY_INTENT_SUGGESTIONS,
} from '../onboarding.types';

const props = defineProps<{
  modelValue: {
    primaryIntent: string;
    goals: string[];
    useCases: string[];
    painPoints: string[];
    setupPriority: string;
  };
}>();

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue];
}>();

const { t } = useI18n();
const model = computed(() => props.modelValue);

function patch(p: Partial<typeof props.modelValue>) {
  emit('update:modelValue', { ...props.modelValue, ...p });
}

function selectIntent(key: string) {
  const sug = PRIMARY_INTENT_SUGGESTIONS[key];
  const next: typeof props.modelValue = {
    ...props.modelValue,
    primaryIntent: key,
  };
  if (sug && props.modelValue.goals.length === 0 && props.modelValue.useCases.length === 0) {
    next.goals = [...sug.goals];
    next.useCases = [...sug.useCases];
  }
  emit('update:modelValue', next);
}

function toggleGoal(key: string) {
  const set = new Set(props.modelValue.goals);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  patch({ goals: [...set] });
}

function toggleUseCase(key: string) {
  const set = new Set(props.modelValue.useCases);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  patch({ useCases: [...set] });
}

function togglePain(key: string) {
  const set = new Set(props.modelValue.painPoints);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  patch({ painPoints: [...set] });
}

const priorityModel = computed({
  get: () => props.modelValue.setupPriority || null,
  set: (v) => patch({ setupPriority: v ?? '' }),
});

const priorityOpts = computed(() =>
  SETUP_PRIORITY_KEYS.map((value) => ({
    value,
    label: t(`onboarding.setupPriorityOptions.${value}`),
  })),
);

function intentIcon(key: string): string {
  const map: Record<string, string> = {
    matters: 'pi pi-folder-open',
    deadlines: 'pi pi-clock',
    documents: 'pi pi-file',
    team: 'pi pi-users',
    signatures: 'pi pi-pencil',
    reporting: 'pi pi-chart-bar',
  };
  return map[key] ?? 'pi pi-sparkles';
}
</script>
