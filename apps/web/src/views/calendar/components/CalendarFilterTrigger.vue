<template>
  <button
    type="button"
    class="cal-filter-trigger"
    :class="{ 'cal-filter-trigger--active': active }"
    :aria-label="a11yLabel"
    :aria-expanded="expanded"
    aria-haspopup="dialog"
    @click="$emit('toggle', $event)"
  >
    <slot>
      <span class="cal-filter-trigger-empty" aria-hidden="true">
        <i :class="icon" />
      </span>
    </slot>
    <span v-if="label" class="cal-filter-trigger__label">{{ label }}</span>
    <span class="cal-filter-trigger__chev" aria-hidden="true">
      <i class="pi pi-chevron-down" />
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    a11yLabel: string;
    expanded?: boolean;
    active?: boolean;
    icon?: string;
    label?: string;
  }>(),
  {
    expanded: false,
    active: false,
    icon: 'pi pi-filter',
    label: '',
  },
);

defineEmits<{
  (e: 'toggle', event: MouseEvent): void;
}>();
</script>

<style>
.cal-filter-trigger.cal-filter-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  flex-shrink: 0;
  max-width: 100%;
  box-sizing: border-box;
  min-height: 2rem;
  height: 2rem;
  max-height: 2rem;
  padding-block: 0;
  padding-inline: 0.28rem 0.38rem;
  gap: 0.2rem;
  border-radius: 9999px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  color: var(--fg-muted);
  font: inherit;
  line-height: 1;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
}
.cal-filter-trigger:hover,
.cal-filter-trigger--active {
  border-color: color-mix(in srgb, var(--brand-zafiro, var(--accent)) 28%, var(--surface-border));
  color: var(--fg-default);
}
.cal-filter-trigger--active {
  background: color-mix(in srgb, var(--brand-zafiro, var(--accent)) 10%, var(--surface-raised));
}
.cal-filter-trigger:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-zafiro, var(--accent)) 40%, var(--surface-border));
  outline-offset: 1px;
}
.cal-filter-trigger-empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 1.375rem;
  height: 1.375rem;
  min-width: 1.375rem;
  min-height: 1.375rem;
  flex-shrink: 0;
  border-radius: 9999px;
  border: 1px dashed var(--surface-border);
  background: var(--surface-sunken);
  color: var(--fg-subtle);
}
.cal-filter-trigger-empty .pi {
  font-size: 0.65rem;
}
.cal-filter-trigger__label {
  max-width: 5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.72rem;
  font-weight: 600;
}
.cal-filter-trigger__chev {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 0.05rem;
  opacity: 0.72;
}
.cal-filter-trigger__chev .pi {
  font-size: 9px;
}
.cal-filter-trigger .cal-filter-avatar-group .p-avatar {
  width: 1.375rem;
  height: 1.375rem;
  font-size: 0.52rem;
}
.cal-filter-trigger .cal-filter-avatar--priority .p-avatar-label {
  font-size: 0.58rem;
  font-weight: 700;
  line-height: 1;
}
</style>
