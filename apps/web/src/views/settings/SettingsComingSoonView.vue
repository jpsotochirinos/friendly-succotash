<template>
  <SettingsPlaceholderView :title="title" :description="description" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import SettingsPlaceholderView from './SettingsPlaceholderView.vue';

const route = useRoute();
const { t } = useI18n();

const titleKey = computed(() => {
  const map: Record<string, string> = {
    'settings-privacy': 'settings.sections.privacy',
    'settings-billing': 'settings.sections.billing',
    'settings-credits': 'settings.sections.credits',
    'settings-plan': 'settings.sections.plan',
  };
  return map[route.name as string] || 'settings.sections.general';
});

const descKey = computed(() => {
  const map: Record<string, string> = {
    'settings-privacy': 'settings.privacyDesc',
    'settings-billing': 'settings.billingDesc',
    'settings-credits': 'settings.creditsDesc',
    'settings-plan': 'settings.planDesc',
  };
  return map[route.name as string];
});

const title = computed(() => t(titleKey.value));
const description = computed(() => (descKey.value ? t(descKey.value) : undefined));
</script>
