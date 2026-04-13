<template>
  <Tag :value="label" :severity="severity" :class="{ 'text-xs': size === 'small' }" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Tag from 'primevue/tag';

const props = defineProps<{
  status: string;
  size?: 'small' | 'normal';
}>();

const severity = computed(() => {
  const map: Record<string, string> = {
    pending: 'secondary',
    active: 'info',
    in_progress: 'warn',
    under_review: 'info',
    validated: 'success',
    closed: 'success',
    skipped: 'secondary',
    rejected: 'danger',
    created: 'secondary',
    completed: 'success',
    archived: 'secondary',
    draft: 'secondary',
    in_review: 'info',
    approved: 'success',
    submitted: 'success',
    revision_needed: 'warn',
  };
  return map[props.status] || 'secondary';
});

const label = computed(() => props.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
</script>
