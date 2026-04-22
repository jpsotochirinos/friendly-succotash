<template>
  <div role="form" :aria-labelledby="headingId" class="space-y-6 pt-2">
    <h3 :id="headingId" class="text-lg font-semibold text-brand-medianoche dark:text-brand-papel">
      {{ $t('onboarding.stepFirmHeading') }}
    </h3>

    <div>
      <p class="text-sm font-medium text-gray-700 dark:text-brand-hielo mb-3">{{ $t('onboarding.firmType') }}</p>
      <SelectButton
        v-model="firmTypeModel"
        :options="firmTypeOpts"
        option-label="label"
        option-value="value"
        class="flex flex-wrap gap-2 [&_.p-button]:flex-1 [&_.p-button]:min-w-[7rem]"
      />
    </div>

    <div>
      <p class="text-sm font-medium text-gray-700 dark:text-brand-hielo mb-3">{{ $t('onboarding.firmSize') }}</p>
      <SelectButton
        v-model="firmSizeModel"
        :options="firmSizeOpts"
        option-label="label"
        option-value="value"
        class="flex flex-wrap gap-2"
      />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-brand-hielo mb-2" for="onb-country">{{
          $t('onboarding.country')
        }}</label>
        <Dropdown
          id="onb-country"
          v-model="countryModel"
          :options="countryOpts"
          option-label="label"
          option-value="value"
          class="w-full"
          :placeholder="$t('onboarding.country')"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-brand-hielo mb-2" for="onb-tz">{{
          $t('onboarding.timezone')
        }}</label>
        <Dropdown id="onb-tz" v-model="timezoneModel" :options="tzOpts" class="w-full" />
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-brand-hielo mb-2" for="onb-lang">{{
        $t('onboarding.language')
      }}</label>
      <Dropdown id="onb-lang" v-model="languageModel" :options="langOpts" class="w-full" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import SelectButton from 'primevue/selectbutton';
import Dropdown from 'primevue/dropdown';
import { FIRM_TYPE_KEYS, FIRM_SIZE_KEYS, COUNTRY_CODES, TIMEZONE_OPTIONS } from '../onboarding.types';

const props = defineProps<{
  modelValue: {
    firmType: string;
    firmSize: string;
    country: string;
    timezone: string;
    language: string;
  };
}>();

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue];
}>();

const { t } = useI18n();
const headingId = 'onboarding-step-firm-heading';

function patch(p: Partial<typeof props.modelValue>) {
  emit('update:modelValue', { ...props.modelValue, ...p });
}

const firmTypeModel = computed({
  get: () => props.modelValue.firmType,
  set: (v) => patch({ firmType: v ?? '' }),
});
const firmSizeModel = computed({
  get: () => props.modelValue.firmSize,
  set: (v) => patch({ firmSize: v ?? '' }),
});
const countryModel = computed({
  get: () => props.modelValue.country,
  set: (v) => patch({ country: v ?? '' }),
});
const timezoneModel = computed({
  get: () => props.modelValue.timezone,
  set: (v) => patch({ timezone: v ?? '' }),
});
const languageModel = computed({
  get: () => props.modelValue.language,
  set: (v) => patch({ language: v ?? '' }),
});

const firmTypeOpts = computed(() =>
  FIRM_TYPE_KEYS.map((value) => ({ value, label: t(`onboarding.firmTypes.${value}`) })),
);
const firmSizeOpts = computed(() =>
  FIRM_SIZE_KEYS.map((value) => ({ value, label: t(`onboarding.firmSizes.${value}`) })),
);
const countryOpts = computed(() =>
  COUNTRY_CODES.map((value) => ({ value, label: t(`onboarding.countryOptions.${value}`) })),
);
const tzOpts = computed(() => [...TIMEZONE_OPTIONS]);
const langOpts = ['Español', 'English'];
</script>
