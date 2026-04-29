<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
  eyebrow?: string;
}>();
</script>

<template>
  <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div class="min-w-0">
      <slot name="lead">
        <span v-if="eyebrow" class="eyebrow">{{ eyebrow }}</span>
        <h1 class="text-xl sm:text-2xl font-semibold text-[var(--fg-default)] m-0 leading-tight">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="text-sm text-[var(--fg-muted)] mt-1 m-0">{{ subtitle }}</p>
      </slot>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </header>
</template>
