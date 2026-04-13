<template>
  <Tag
    :value="`${Math.round(score * 100)}%`"
    :severity="severity"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Tag from 'primevue/tag';

const props = defineProps<{ score: number }>();

const severity = computed(() => {
  if (props.score >= 0.8) return 'success';
  if (props.score >= 0.5) return 'warn';
  return 'danger';
});
</script>
