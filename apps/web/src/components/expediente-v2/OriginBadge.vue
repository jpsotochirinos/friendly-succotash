<template>
  <Tag :value="label" :severity="severity" class="text-xs" />
</template>
<script setup lang="ts">
import { computed } from 'vue';
import Tag from 'primevue/tag';
const props = defineProps<{ origin: 'SYSTEM' | 'TENANT' | 'INSTANCE' }>();
const label = computed(() => props.origin);
const severity = computed(() => (props.origin === 'SYSTEM' ? 'secondary' : props.origin === 'TENANT' ? 'info' : 'success'));
</script>
