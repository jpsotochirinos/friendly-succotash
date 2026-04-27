<template>
  <div class="p-6 space-y-2">
    <h1 class="text-xl font-semibold">{{ t('sinoeInbox.title') }}</h1>
    <p class="text-sm text-fg-subtle">Pestañas: Pendientes, Auto-aplicadas, Sin clasificar, Historial, Stats (API: <code>/api/sinoe-proposals</code>).</p>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>
