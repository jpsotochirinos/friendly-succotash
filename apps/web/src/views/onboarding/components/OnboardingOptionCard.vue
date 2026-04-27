<template>
  <button
    type="button"
    class="onb-option-card group relative flex w-full min-h-[44px] text-left rounded-2xl border p-5 transition-[border-color,box-shadow,background-color] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-zafiro focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-raised)]"
    :class="[
      selected
        ? 'border-brand-zafiro bg-brand-zafiro/[0.07] shadow-md dark:bg-brand-zafiro/12'
        : 'border-[color:var(--surface-border)] bg-[color:var(--surface-ground)] hover:border-brand-zafiro/35',
      disabled ? 'opacity-50 pointer-events-none' : '',
    ]"
    :aria-pressed="selected"
    :disabled="disabled"
    @click="emit('select')"
  >
    <span
      class="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors"
      :class="
        selected
          ? 'border-brand-zafiro bg-brand-zafiro text-white'
          : 'border-[color:var(--surface-border)] bg-[color:var(--surface-raised)] text-transparent'
      "
      aria-hidden="true"
    >
      <i v-if="selected" class="pi pi-check text-[11px]" />
    </span>

    <div class="flex gap-4 items-start w-full min-w-0 pr-8">
      <span
        v-if="icon"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base"
        :style="{
          backgroundColor: selected ? 'var(--brand-zafiro)' : 'var(--surface-raised)',
          color: selected ? '#fff' : 'var(--fg-muted)',
        }"
        aria-hidden="true"
      >
        <i :class="icon" />
      </span>
      <span class="min-w-0 flex-1 pt-0.5">
        <span class="block text-[15px] font-semibold leading-snug" :style="{ color: 'var(--fg-default)' }">{{ title }}</span>
        <span v-if="description" class="block text-xs mt-1.5 leading-relaxed" :style="{ color: 'var(--fg-muted)' }">
          {{ description }}
        </span>
      </span>
    </div>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  icon?: string;
  selected?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [];
}>();
</script>
