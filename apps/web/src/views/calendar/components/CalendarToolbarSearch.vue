<template>
  <IconField ref="rootRef" class="cal-toolbar-search">
    <InputIcon class="pi pi-search" />
    <InputText
      :id="inputId"
      :model-value="modelValue"
      size="small"
      class="cal-toolbar-search__input"
      :placeholder="placeholder"
      :aria-label="a11yLabel"
      :name="name"
      autocomplete="off"
      @update:model-value="$emit('update:modelValue', String($event ?? ''))"
    />
  </IconField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';

const rootRef = ref<InstanceType<typeof IconField> | null>(null);

withDefaults(
  defineProps<{
    modelValue: string;
    placeholder: string;
    a11yLabel: string;
    inputId?: string;
    name?: string;
  }>(),
  {
    inputId: undefined,
    name: 'calendar-search',
  },
);

defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

function focus() {
  const root = (rootRef.value as unknown as { $el?: HTMLElement } | null)?.$el;
  root?.querySelector('input')?.focus();
}

defineExpose({ focus });
</script>

<style scoped>
.cal-toolbar-search {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  display: flex;
  align-items: center;
}
.cal-toolbar-search :deep(.p-inputtext) {
  line-height: 1.25;
}
.cal-toolbar-search__input {
  width: 100%;
  min-width: 0;
}
</style>
