<template>
  <div class="cal-frame-head flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
    <div
      class="cal-frame-head__nav inline-flex shrink-0 items-center gap-1.5 rounded-lg border p-1.5"
      style="border-color: var(--surface-border); background: var(--surface-sunken);"
    >
      <Button
        v-tooltip.bottom="navPrevLabel"
        icon="pi pi-chevron-left"
        outlined
        type="button"
        class="cal-frame-head__nav-btn"
        @click="$emit('prev')"
      />
      <Button
        v-tooltip.bottom="navNextLabel"
        icon="pi pi-chevron-right"
        outlined
        type="button"
        class="cal-frame-head__nav-btn"
        @click="$emit('next')"
      />
    </div>
    <div class="min-w-0 flex-1">
      <p class="cal-frame-head__primary m-0 text-sm font-semibold leading-snug" style="color: var(--fg-default);">{{ primary }}</p>
      <p
        v-if="secondary"
        class="m-0 mt-0.5 text-xs leading-snug tabular-nums"
        style="color: var(--fg-muted);"
      >
        {{ secondary }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';

defineProps<{
  primary: string;
  secondary?: string | null;
  navPrevLabel: string;
  navNextLabel: string;
}>();

defineEmits<{
  (e: 'prev'): void;
  (e: 'next'): void;
}>();
</script>

<style scoped>
.cal-frame-head__nav-btn.cal-frame-head__nav-btn {
  width: 2.375rem;
  height: 2.375rem;
  min-width: 2.375rem;
  padding: 0;
}
.cal-frame-head__nav-btn :deep(.p-button-icon) {
  font-size: 0.9rem;
}
</style>
