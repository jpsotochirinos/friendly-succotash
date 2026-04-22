<template>
  <div role="form" :aria-labelledby="headingId" class="space-y-6 pt-2">
    <h3 :id="headingId" class="text-lg font-semibold text-brand-medianoche dark:text-brand-papel">
      {{ $t('onboarding.stepRoleHeading') }}
    </h3>

    <div>
      <p class="text-sm font-medium text-gray-700 dark:text-brand-hielo mb-3">{{ $t('onboarding.yourRole') }}</p>
      <SelectButton
        v-model="roleModel"
        :options="roleOpts"
        option-label="label"
        option-value="value"
        class="flex flex-wrap gap-2"
      />
    </div>

    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-gray-700 dark:text-brand-hielo" for="onb-tool">{{
        $t('onboarding.currentTool')
      }}</label>
      <div class="flex flex-wrap gap-2">
        <InputText
          id="onb-tool"
          v-model="toolModel"
          class="flex-1 min-w-[12rem]"
          :placeholder="$t('onboarding.currentToolPlaceholder')"
        />
        <Button type="button" size="small" outlined :label="$t('onboarding.currentToolNone')" @click="toolModel = ''" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import SelectButton from 'primevue/selectbutton';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { ROLE_KEYS } from '../onboarding.types';

const props = defineProps<{
  modelValue: { role: string; currentTool: string };
}>();

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue];
}>();

const { t } = useI18n();
const headingId = 'onboarding-step-role-heading';

const roleModel = computed({
  get: () => props.modelValue.role,
  set: (v) => emit('update:modelValue', { ...props.modelValue, role: v ?? '' }),
});

const toolModel = computed({
  get: () => props.modelValue.currentTool,
  set: (v) => emit('update:modelValue', { ...props.modelValue, currentTool: v }),
});

const roleOpts = computed(() => ROLE_KEYS.map((value) => ({ value, label: t(`onboarding.roles.${value}`) })));
</script>
