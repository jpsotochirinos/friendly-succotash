<template>
  <span v-if="overrideId" class="text-xs text-amber-600 dark:text-amber-300">· override</span>
</template>
<script setup lang="ts">
defineProps<{ overrideId?: string }>();
</script>
