<template>
  <div class="cal-view-select">
    <SelectButton
      :model-value="modelValue"
      :options="options"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      size="small"
      class="cal-view-select__control"
      :aria-label="a11yLabel"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <template #option="{ option }">
        <span class="cal-view-select__opt">
          <span
            v-if="option.value === todayValue"
            class="cal-view-select__dayball"
            aria-hidden="true"
          >{{ dayOfMonth }}</span>
          <i v-else :class="option.icon" aria-hidden="true" />
          <span class="cal-view-select__label">{{ option.label }}</span>
        </span>
      </template>
    </SelectButton>
  </div>
</template>

<script setup lang="ts">
import SelectButton from 'primevue/selectbutton';

export interface CalendarViewOption {
  label: string;
  value: string | number;
  icon?: string;
}

withDefaults(
  defineProps<{
    modelValue: string | number;
    options: CalendarViewOption[];
    a11yLabel: string;
    dayOfMonth: number | string;
    todayValue?: string | number;
  }>(),
  { todayValue: 'hoy' },
);

defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
}>();
</script>

<style scoped>
.cal-view-select {
  align-self: stretch;
  display: flex;
  align-items: stretch;
  flex: 0 0 auto;
  min-width: 0;
}
.cal-view-select :deep(.p-selectbutton) {
  display: flex;
  align-items: stretch;
  min-height: 2.75rem;
  border: none;
  box-shadow: none;
  background: transparent;
  border-radius: 0 !important;
  flex-wrap: nowrap;
  gap: 0;
  overflow: visible;
}
.cal-view-select :deep(.p-togglebutton),
.cal-view-select :deep(.p-togglebutton:first-child),
.cal-view-select :deep(.p-togglebutton:last-child) {
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
.cal-view-select :deep(.p-togglebutton-checked) {
  background: var(--surface-raised) !important;
  color: var(--fg-default) !important;
  box-shadow: inset 0 0 0 1px var(--surface-border) !important;
}
.cal-view-select :deep(.p-togglebutton:not(.p-togglebutton-checked)) {
  background: transparent !important;
  color: var(--fg-muted) !important;
}
.cal-view-select :deep(.p-togglebutton .p-togglebutton-content),
.cal-view-select :deep(.p-togglebutton-checked .p-togglebutton-content) {
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
.cal-view-select__opt {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
}
.cal-view-select__label {
  min-width: 0;
}
.cal-view-select__dayball {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  min-width: 1.25rem;
  border-radius: 9999px;
  font-size: 8.5px;
  font-weight: 700;
  font-feature-settings: 'tnum' 1;
  line-height: 1;
  box-sizing: border-box;
  border: 1.5px solid color-mix(in srgb, currentColor 55%, transparent);
  color: inherit;
  opacity: 0.92;
}
.cal-view-select :deep(.p-togglebutton-checked) .cal-view-select__dayball {
  background: color-mix(in srgb, var(--brand-zafiro, var(--accent)) 14%, var(--surface-raised));
  color: var(--brand-zafiro, var(--accent));
  border-color: color-mix(in srgb, var(--brand-zafiro, var(--accent)) 40%, var(--surface-border));
  opacity: 1;
}
</style>
