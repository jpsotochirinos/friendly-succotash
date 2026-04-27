<template>
  <div class="rounded border border-surface-200 p-3 text-sm">
    <div class="font-medium">{{ title }}</div>
    <div class="text-fg-subtle">Legal: {{ formatDate(legal) }}</div>
    <div>Efectivo: {{ formatDate(effective) }}</div>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  title: string;
  legal: string | Date;
  effective: string | Date;
}>();
function formatDate(d: string | Date) {
  return typeof d === 'string' ? d : d.toLocaleDateString();
}
</script>
