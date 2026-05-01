<template>
  <div class="cal-nav-buttons">
    <Button
      v-tooltip.bottom="prevLabel"
      icon="pi pi-chevron-left"
      text
      type="button"
      class="cal-nav-buttons__btn"
      :aria-label="prevLabel"
      @click="$emit('prev')"
    />
    <Button
      v-tooltip.bottom="nextLabel"
      icon="pi pi-chevron-right"
      text
      type="button"
      class="cal-nav-buttons__btn"
      :aria-label="nextLabel"
      @click="$emit('next')"
    />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';

defineProps<{
  prevLabel: string;
  nextLabel: string;
}>();

defineEmits<{
  (e: 'prev'): void;
  (e: 'next'): void;
}>();
</script>

<style scoped>
.cal-nav-buttons {
  display: inline-flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--surface-border-strong) 72%, transparent);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-raised) 72%, transparent),
      color-mix(in srgb, var(--surface-sunken) 88%, transparent)
    );
  border-radius: 999px;
  padding: 0.1875rem;
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--surface-raised) 70%, transparent),
    0 1px 2px color-mix(in srgb, var(--brand-abismo) 10%, transparent);
}
.cal-nav-buttons__btn.cal-nav-buttons__btn {
  width: 1.875rem;
  height: 1.875rem;
  min-width: 1.875rem;
  padding: 0;
  border-radius: 999px;
  color: var(--fg-muted);
  background: transparent;
  border: 0;
  box-shadow: none;
}
.cal-nav-buttons__btn + .cal-nav-buttons__btn {
  position: relative;
}
.cal-nav-buttons__btn + .cal-nav-buttons__btn::before {
  content: '';
  position: absolute;
  left: -0.0625rem;
  top: 0.375rem;
  bottom: 0.375rem;
  width: 1px;
  background: color-mix(in srgb, var(--surface-border-strong) 62%, transparent);
}
.cal-nav-buttons__btn.cal-nav-buttons__btn:hover {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--surface-raised));
}
.cal-nav-buttons__btn.cal-nav-buttons__btn:focus-visible {
  outline: 2px solid var(--accent-ring);
  outline-offset: 2px;
}
.cal-nav-buttons__btn :deep(.p-button-icon) {
  font-size: 0.78rem;
}
</style>
