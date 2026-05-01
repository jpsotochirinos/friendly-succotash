<template>
  <div class="cal-scope-select">
    <SelectButton
      :model-value="modelValue"
      :options="options"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      size="small"
      class="cal-scope-select__control"
      :aria-label="a11yLabel"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import SelectButton from 'primevue/selectbutton';

export interface CalendarScopeOption {
  label: string;
  value: string | number;
}

defineProps<{
  modelValue: string | number;
  options: CalendarScopeOption[];
  a11yLabel: string;
}>();

defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
}>();
</script>

<style scoped>
.cal-scope-select {
  align-self: stretch;
  display: flex;
  align-items: stretch;
}
.cal-scope-select :deep(.p-selectbutton) {
  display: flex;
  align-items: stretch;
  min-height: 2.75rem;
  border: none;
  box-shadow: none;
  background: transparent;
  border-radius: 0 !important;
  flex-wrap: nowrap;
  gap: 0;
}
.cal-scope-select :deep(.p-togglebutton),
.cal-scope-select :deep(.p-togglebutton:first-child),
.cal-scope-select :deep(.p-togglebutton:last-child) {
  align-self: stretch;
  flex: 0 0 auto;
  height: auto;
  min-height: 2.75rem;
  border-radius: 0 !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.cal-scope-select :deep(.p-togglebutton-checked) {
  background: var(--surface-raised) !important;
  color: var(--fg-default) !important;
  box-shadow: inset 0 0 0 1px var(--surface-border) !important;
}
.cal-scope-select :deep(.p-togglebutton:not(.p-togglebutton-checked)) {
  background: transparent !important;
  color: var(--fg-muted) !important;
}
.cal-scope-select :deep(.p-togglebutton .p-togglebutton-content),
.cal-scope-select :deep(.p-togglebutton-checked .p-togglebutton-content) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  width: 100%;
  padding-block: 0;
  padding-inline: 0.6rem 0.7rem;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: inherit !important;
}
</style>
