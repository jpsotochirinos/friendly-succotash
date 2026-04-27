<template>
  <div role="form" :aria-labelledby="headingId" class="space-y-5 pt-0">
    <div>
      <h3 :id="headingId" class="text-[15px] font-semibold text-brand-medianoche dark:text-brand-papel">
        {{ $t('onboarding.stepPracticeHeading') }}
      </h3>
      <p class="text-sm mt-1" :style="{ color: 'var(--fg-muted)' }">{{ $t('onboarding.practiceInterestsHint') }}</p>
    </div>
    <StepPracticeAreas
      hide-heading
      :model-value="{ practiceAreas: model.practiceAreas, practiceAreasOther: model.practiceAreasOther }"
      @update:model-value="(v) => patch(v)"
    />
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium" for="onb-interests-only" :style="{ color: 'var(--fg-default)' }">
        {{ $t('onboarding.interestsFreeform') }}
      </label>
      <Textarea
        id="onb-interests-only"
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
import Textarea from 'primevue/textarea';
import StepPracticeAreas from './StepPracticeAreas.vue';

const props = defineProps<{
  modelValue: {
    practiceAreas: string[];
    practiceAreasOther: string;
    interestsFreeform: string;
  };
}>();

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue];
}>();

const headingId = 'onboarding-step-practice-interests-heading';

const model = computed(() => props.modelValue);

function patch(p: Partial<typeof props.modelValue>) {
  emit('update:modelValue', { ...props.modelValue, ...p });
}

const interestsModel = computed({
  get: () => props.modelValue.interestsFreeform,
  set: (v) => patch({ interestsFreeform: v }),
});
</script>
