<template>
  <div class="text-xs text-fg-subtle">Radar de plazos: {{ count }} abiertos</div>
</template>
<script setup lang="ts">
defineProps<{ count: number }>();
</script>
