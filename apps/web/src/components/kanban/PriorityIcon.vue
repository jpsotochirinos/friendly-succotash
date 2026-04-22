<template>
  <span
    v-if="compact && showCompactIcon"
    v-tooltip.top="tooltip"
    class="inline-flex shrink-0 items-center text-base leading-none"
    :class="compactColorClass"
    role="img"
    :aria-label="tooltip"
  >
    <i :class="[iconClass, 'text-base']" aria-hidden="true" />
  </span>
  <span
    v-else-if="!compact"
    v-tooltip.top="tooltip"
    class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors"
    :class="boxClass"
    role="img"
    :aria-label="tooltip"
  >
    <i :class="[iconClass, 'text-sm']" aria-hidden="true" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    priority?: 'low' | 'normal' | 'high' | 'urgent' | null;
    /** Inline icon without box; hides when priority is normal (default). */
    compact?: boolean;
  }>(),
  { compact: false },
);

const tooltip = computed(() => {
  switch (props.priority) {
    case 'urgent':
      return 'Prioridad: urgente';
    case 'high':
      return 'Prioridad: alta';
    case 'low':
      return 'Prioridad: baja';
    case 'normal':
    default:
      return 'Prioridad: normal';
  }
});

const showCompactIcon = computed(() => {
  const p = props.priority ?? 'normal';
  return p === 'low' || p === 'high' || p === 'urgent';
});

const iconClass = computed(() => {
  switch (props.priority) {
    case 'urgent':
      return 'pi pi-angle-double-up';
    case 'high':
      return 'pi pi-angle-up';
    case 'low':
      return 'pi pi-angle-down';
    case 'normal':
    default:
      return 'pi pi-minus';
  }
});

const boxClass = computed(() => {
  switch (props.priority) {
    case 'urgent':
      return 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300';
    case 'high':
      return 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200';
    case 'low':
      return 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300';
    case 'normal':
    default:
      return 'border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-gray-800 dark:text-slate-300';
  }
});

const compactColorClass = computed(() => {
  switch (props.priority) {
    case 'urgent':
      return 'text-red-600 dark:text-red-400';
    case 'high':
      return 'text-amber-600 dark:text-amber-400';
    case 'low':
      return 'text-slate-500 dark:text-slate-400';
    default:
      return 'text-slate-500';
  }
});
</script>
