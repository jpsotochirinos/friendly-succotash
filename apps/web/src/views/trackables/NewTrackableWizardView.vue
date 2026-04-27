<template>
  <div class="p-6 max-w-2xl space-y-4">
    <h1 class="text-xl font-semibold">{{ t('wizard.newTrackable') }}</h1>
    <p class="text-sm text-fg-subtle">Pasos: 1) elegir blueprint SYSTEM 2) datos del expediente 3) vista previa. Conectar a <code>POST /api/process-tracks</code> al finalizar.</p>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>
