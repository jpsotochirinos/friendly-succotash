<template>
  <div class="space-y-6 pt-0">
    <div>
      <p class="text-[10px] font-semibold uppercase tracking-wide mb-2" :style="{ color: 'var(--fg-muted)' }">
        {{ $t('onboarding.sectionOrg') }}
      </p>
      <StepOrganization
        :model-value="{ name: org.name, description: org.description }"
        @update:model-value="onOrgUpdate"
        :logo-file="logoFile"
        @update:logo-file="(f) => emit('update:logoFile', f)"
      />
    </div>
    <div class="border-t pt-5" :style="{ borderColor: 'var(--surface-border)' }">
      <p class="text-[10px] font-semibold uppercase tracking-wide mb-2" :style="{ color: 'var(--fg-muted)' }">
        {{ $t('onboarding.sectionFirmProfile') }}
      </p>
      <StepFirmProfile
        :model-value="{
          firmType: firm.firmType,
          firmSize: firm.firmSize,
          country: firm.country,
          timezone: firm.timezone,
          language: firm.language,
        }"
        @update:model-value="(v) => emit('update:firm', v)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import StepOrganization from './StepOrganization.vue';
import StepFirmProfile from './StepFirmProfile.vue';

const props = defineProps<{
  org: { name: string; description: string };
  firm: {
    firmType: string;
    firmSize: string;
    country: string;
    timezone: string;
    language: string;
  };
  logoFile: File | null;
}>();

const emit = defineEmits<{
  'update:org': [value: { name: string; description: string }];
  'update:firm': [value: typeof props.firm];
  'update:logoFile': [value: File | null];
}>();

function onOrgUpdate(v: { name: string; description: string }) {
  emit('update:org', v);
}
</script>
