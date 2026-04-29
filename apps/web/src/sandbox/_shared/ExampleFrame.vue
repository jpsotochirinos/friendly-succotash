<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Ignorado si se usa el slot #heading. */
    title?: string;
    description?: string;
    code?: string;
    /** Contenido con scroll vertical (p. ej. calendario productivo en layout flex). */
    scrollableContent?: boolean;
  }>(),
  { scrollableContent: false, title: '' },
);

const showCode = ref(false);
</script>

<template>
  <div class="flex min-h-0 flex-col overflow-hidden rounded-xl" style="border: 1px solid var(--surface-border);">
    <!-- Header -->
    <div class="flex shrink-0 flex-col border-b" style="border-color: var(--surface-border);">
      <div
        class="flex shrink-0 flex-wrap items-start justify-between gap-3 px-4 py-3"
        style="background: var(--surface-sunken);"
      >
        <div class="min-w-0 flex-1">
          <slot v-if="$slots.heading" name="heading" />
          <template v-else>
            <p class="m-0 text-sm font-semibold" style="color: var(--fg-default);">{{ title }}</p>
            <p v-if="description" class="m-0 text-xs mt-0.5" style="color: var(--fg-muted);">
              {{ description }}
            </p>
          </template>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <slot name="actions" />
          <button
            v-if="code"
            type="button"
            class="shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors"
            style="color: var(--fg-muted); background: none; border: 1px solid var(--surface-border); cursor: pointer;"
            @click="showCode = !showCode"
          >
            <i :class="showCode ? 'pi pi-eye-slash' : 'pi pi-code'" class="text-[11px]" />
            {{ showCode ? 'Ocultar código' : 'Ver código' }}
          </button>
        </div>
      </div>
      <div
        v-if="$slots.filters"
        class="flex min-h-0 min-w-0 w-full shrink-0 flex-wrap items-center gap-2 border-t px-4 py-2.5"
        style="background: var(--surface-raised); border-color: var(--surface-border);"
      >
        <slot name="filters" />
      </div>
    </div>

    <!-- Preview -->
    <div
      class="p-5"
      :class="props.scrollableContent ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain' : ''"
      style="background: var(--surface-raised);"
    >
      <slot />
    </div>

    <!-- Code viewer -->
    <div v-if="code && showCode" class="shrink-0 border-t" style="border-color: var(--surface-border);">
      <pre
        class="m-0 overflow-x-auto p-4 text-xs leading-relaxed"
        style="background: var(--surface-sunken); color: var(--fg-default);"
      ><code>{{ code }}</code></pre>
    </div>
  </div>
</template>
