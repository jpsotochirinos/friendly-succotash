<template>
  <span
    class="inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-mono font-semibold tabular-nums leading-none"
    :class="muted ? 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-300' : 'border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-700 dark:bg-primary-950/50 dark:text-primary-200'"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  muted?: boolean;
}>();
</script>
