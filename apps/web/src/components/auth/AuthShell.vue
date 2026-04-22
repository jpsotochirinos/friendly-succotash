<template>
  <div class="relative h-full min-h-0 flex flex-col items-center justify-center px-4 py-12 brand-gradient-soft overflow-y-auto">
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.22]"
      style="
        background-image:
          radial-gradient(circle at 12% 18%, rgba(45, 63, 191, 0.35), transparent 42%),
          radial-gradient(circle at 88% 82%, rgba(27, 32, 128, 0.3), transparent 48%);
      "
    />

    <div class="relative w-full max-w-[440px]">
      <div class="text-center mb-8">
        <RouterLink to="/" class="inline-flex justify-center mb-5 rounded-lg outline-none focus-visible:ring-2">
          <AppLogo variant="wordmark" size="lg" class="drop-shadow-sm" />
        </RouterLink>
        <h1 class="text-2xl font-semibold tracking-tight text-fg">
          <slot name="title" />
        </h1>
        <p
          v-if="$slots.subtitle"
          class="text-sm mt-2 max-w-sm mx-auto leading-relaxed text-fg-muted"
        >
          <slot name="subtitle" />
        </p>
      </div>

      <div
        class="rounded-2xl overflow-hidden border backdrop-blur-sm"
        :style="{
          backgroundColor: 'var(--surface-raised)',
          borderColor: 'var(--surface-border)',
          boxShadow: 'var(--shadow-lg)',
        }"
      >
        <div class="p-8 sm:p-9">
          <slot />
        </div>
      </div>

      <div v-if="$slots.footer" class="mt-8 text-center text-sm leading-relaxed text-fg-muted">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import AppLogo from '@/components/brand/AppLogo.vue';
</script>
