<template>
  <div class="max-w-3xl flex flex-col gap-6">
    <PageHeader :title="title" :subtitle="description" />
    <div
      class="rounded-xl border p-6 text-center"
      :style="{
        borderColor: 'var(--surface-border)',
        backgroundColor: 'var(--surface-raised)',
        color: 'var(--fg-muted)',
      }"
    >
      <i class="pi pi-clock text-2xl mb-3 opacity-60" aria-hidden="true" />
      <p class="text-sm">{{ t('settings.comingSoon') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import PageHeader from '@/components/common/PageHeader.vue';

defineProps<{
  title: string;
  description?: string;
}>();

const { t } = useI18n();
</script>
