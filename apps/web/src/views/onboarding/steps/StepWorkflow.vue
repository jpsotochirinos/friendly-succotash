<template>
  <div role="form" :aria-labelledby="headingId" class="space-y-5 pt-0">
    <div>
      <h3 :id="headingId" class="text-[15px] font-semibold text-brand-medianoche dark:text-brand-papel">
        {{ $t('onboarding.stepWorkflowHeading') }}
      </h3>
      <p class="text-sm mt-1" :style="{ color: 'var(--fg-muted)' }">{{ $t('onboarding.stepWorkflowSub') }}</p>
    </div>
    <StepRole
      :model-value="{ role: model.role, currentTool: model.currentTool }"
      @update:model-value="(v) => patch(v)"
    />
    <div>
      <label class="block text-sm font-medium mb-2" for="onb-volume-only" :style="{ color: 'var(--fg-default)' }">
        {{ $t('onboarding.volume') }}
      </label>
      <Dropdown
        id="onb-volume-only"
        v-model="volumeModel"
        :options="volumeOpts"
        option-label="label"
        option-value="value"
        class="w-full"
        :placeholder="$t('onboarding.volume')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Dropdown from 'primevue/dropdown';
import StepRole from './StepRole.vue';
import { VOLUME_KEYS } from '../onboarding.types';

const props = defineProps<{
  modelValue: {
    role: string;
    currentTool: string;
    volume: string;
  };
}>();

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue];
}>();

const { t } = useI18n();
const headingId = 'onboarding-step-workflow-heading';

const model = computed(() => props.modelValue);

function patch(p: Partial<typeof props.modelValue>) {
  emit('update:modelValue', { ...props.modelValue, ...p });
}

const volumeModel = computed({
  get: () => props.modelValue.volume,
  set: (v) => patch({ volume: v ?? '' }),
});

const volumeOpts = computed(() =>
  VOLUME_KEYS.map((value) => ({ value, label: t(`onboarding.volumeOptions.${value}`) })),
);
</script>
