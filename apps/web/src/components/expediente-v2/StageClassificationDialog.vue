<template>
  <Dialog v-model:visible="visible" header="Clasificar en etapa" class="w-[min(100vw,28rem)]">
    <p class="text-sm text-fg-subtle">Selecciona <code>StageInstance</code> para vincular documentos.</p>
  </Dialog>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import Dialog from 'primevue/dialog';
const visible = ref(false);
defineExpose({ open: () => { visible.value = true; } });
</script>
