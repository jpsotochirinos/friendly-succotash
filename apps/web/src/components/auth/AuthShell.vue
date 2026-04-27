<template>
  <div
    class="auth-page relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8 sm:py-12 brand-gradient-soft"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.22]"
      style="
        background-image:
          radial-gradient(circle at 12% 18%, rgba(45, 63, 191, 0.35), transparent 42%),
          radial-gradient(circle at 88% 82%, rgba(27, 32, 128, 0.3), transparent 48%);
      "
    />

    <div class="relative z-[1] w-full" :class="outerMaxClass">
      <!-- Wide layout (e.g. external signature): single column, no showcase -->
      <template v-if="wide">
        <div class="mb-8 text-center">
          <RouterLink to="/" class="mb-5 inline-flex justify-center rounded-lg outline-none focus-visible:ring-2">
            <AppLogo variant="wordmark" size="lg" class="drop-shadow-sm" />
          </RouterLink>
          <h1 class="text-2xl font-semibold tracking-tight text-fg">
            <slot name="title" />
          </h1>
          <p v-if="$slots.subtitle" class="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">
            <slot name="subtitle" />
          </p>
        </div>
        <div
          class="overflow-hidden rounded-2xl border backdrop-blur-sm"
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
      </template>

      <!-- Auth card: split (showcase) or centered compact (no showcase) -->
      <template v-else>
        <div
          class="auth-split-card mx-auto flex min-h-0 w-full overflow-hidden rounded-2xl border shadow-[var(--shadow-lg)] backdrop-blur-sm"
          :class="cardLayoutClass"
          :style="{
            backgroundColor: 'var(--surface-raised)',
            borderColor: 'var(--surface-border)',
          }"
        >
          <!-- Form column -->
          <div
            class="auth-split-left flex min-h-0 min-w-0 flex-1 flex-col"
            :class="leftColClass"
          >
            <div class="auth-stagger flex flex-1 flex-col gap-6 px-6 py-8 sm:px-9 sm:py-10">
              <div class="flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between">
                <RouterLink
                  to="/"
                  class="inline-flex w-fit shrink-0 rounded-lg outline-none focus-visible:ring-2"
                  :aria-label="t('app.name')"
                >
                  <AppLogo variant="wordmark" size="lg" class="drop-shadow-sm" />
                </RouterLink>
                <p
                  v-if="showSidePanel"
                  class="mt-2 max-w-xs text-xs leading-relaxed text-fg-subtle lg:hidden"
                >
                  {{ pitchMobileText }}
                </p>
              </div>

              <header class="flex flex-col gap-2 text-left">
                <h1 class="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
                  <slot name="title" />
                </h1>
                <p v-if="$slots.subtitle" class="max-w-md text-sm leading-relaxed text-fg-muted">
                  <slot name="subtitle" />
                </p>
              </header>

              <div class="min-h-0 flex-1">
                <slot />
              </div>

              <div v-if="$slots.footer" class="text-sm leading-relaxed text-fg-muted">
                <slot name="footer" />
              </div>

              <div
                class="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-4 text-xs text-fg-subtle"
                :style="{ borderColor: 'var(--surface-border)' }"
              >
                <span>{{ t('auth.loginCopyright', { year: copyrightYear }) }}</span>
                <RouterLink
                  :to="{ path: '/settings/privacy' }"
                  class="font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline-none"
                >
                  {{ t('auth.loginPrivacyPolicy') }}
                </RouterLink>
              </div>
            </div>
          </div>

          <!-- Right: brand panel + product visual -->
          <aside
            v-if="showSidePanel"
            class="auth-split-aside relative hidden min-h-[20rem] w-full flex-col justify-between overflow-hidden lg:flex lg:flex-none"
            :class="asideWidthClass"
          >
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-0 bg-brand-gradient opacity-100"
            />
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-0 opacity-90"
              style="
                background-image:
                  radial-gradient(100% 70% at 100% 0%, color-mix(in srgb, #ffffff 16%, transparent), transparent 55%),
                  radial-gradient(80% 60% at 0% 100%, color-mix(in srgb, var(--brand-medianoche) 45%, transparent), transparent 50%);
              "
            />
            <div
              v-if="!reduceMotion"
              class="auth-split-shimmer pointer-events-none absolute inset-0 opacity-30 mix-blend-soft-light"
              aria-hidden="true"
            />

            <div class="relative z-[1] flex flex-1 flex-col justify-between gap-8 p-8 sm:p-10">
              <header class="flex flex-col gap-3">
                <h2
                  class="font-semibold leading-tight tracking-tight text-fg-on-brand sm:text-3xl"
                  :class="sideTitleClass"
                >
                  <slot name="sideTitle">{{ t('auth.loginShowcaseTitle') }}</slot>
                </h2>
                <p
                  class="max-w-sm text-sm leading-relaxed sm:max-w-md"
                  :style="{ color: 'color-mix(in srgb, var(--fg-on-brand) 88%, transparent)' }"
                >
                  <slot name="sideSubtitle">{{ t('auth.loginShowcaseSubtitle') }}</slot>
                </p>
              </header>

              <slot name="sideShowcase">
                <LoginShowcasePanel :variant="showcaseVariant" />
              </slot>
            </div>
          </aside>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppLogo from '@/components/brand/AppLogo.vue';
import LoginShowcasePanel from '@/components/auth/LoginShowcasePanel.vue';

export type AuthShowcaseVariant = 'login' | 'register' | 'invite' | 'magic';

const props = withDefaults(
  defineProps<{
    /** Wider main column for PDF + side panel (e.g. external sign). */
    wide?: boolean;
    /** Show right brand column + showcase (desktop). */
    showShowcase?: boolean;
    /** Narrower form column on large screens (split layout only). */
    narrow?: boolean;
    /** Short line under logo on small screens (match right-panel copy). */
    pitchMobile?: string;
    /** Visual in the right panel (product mock variant). */
    showcaseVariant?: AuthShowcaseVariant;
  }>(),
  { wide: false, showShowcase: true, narrow: false, pitchMobile: undefined, showcaseVariant: 'login' },
);

const { t } = useI18n();
const reduceMotion = ref(false);
let mq: MediaQueryList | null = null;
function readReduceMotion() {
  reduceMotion.value =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
onMounted(() => {
  readReduceMotion();
  mq = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  mq?.addEventListener('change', readReduceMotion);
});
onUnmounted(() => {
  mq?.removeEventListener('change', readReduceMotion);
});

const showSidePanel = computed(() => !props.wide && props.showShowcase);

const outerMaxClass = computed(() => {
  if (props.wide) return 'max-w-7xl';
  if (showSidePanel.value && props.showcaseVariant === 'register') return 'max-w-[1200px]';
  if (showSidePanel.value) return 'max-w-[1120px]';
  return 'max-w-md';
});

const cardLayoutClass = computed(() => {
  if (!showSidePanel.value) {
    return 'flex-col';
  }
  return 'flex-col lg:min-h-[min(36rem,88vh)] lg:flex-row';
});

const leftColClass = computed(() => {
  if (!showSidePanel.value) return '';
  return props.narrow ? 'lg:max-w-md lg:flex-none' : '';
});

const asideWidthClass = computed(() => {
  if (props.showcaseVariant === 'register') {
    return 'lg:max-w-[min(54%,38rem)] xl:max-w-[min(50%,40rem)]';
  }
  return 'lg:max-w-[min(46%,28rem)] xl:max-w-[min(44%,30rem)]';
});

const sideTitleClass = computed(() =>
  props.showcaseVariant === 'register' ? 'text-2xl sm:text-[1.75rem] lg:text-3xl' : 'text-2xl',
);

const pitchMobileText = computed(() => props.pitchMobile ?? t('auth.loginShowcaseSubtitle'));

const copyrightYear = computed(() => new Date().getFullYear());
</script>

<style scoped>
.auth-stagger > :deep(*) {
  animation: auth-shell-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}
.auth-stagger > :deep(*:nth-child(1)) {
  animation-delay: 0ms;
}
.auth-stagger > :deep(*:nth-child(2)) {
  animation-delay: 60ms;
}
.auth-stagger > :deep(*:nth-child(3)) {
  animation-delay: 120ms;
}
.auth-stagger > :deep(*:nth-child(4)) {
  animation-delay: 180ms;
}
.auth-stagger > :deep(*:nth-child(5)) {
  animation-delay: 240ms;
}
.auth-stagger > :deep(*:nth-child(6)) {
  animation-delay: 300ms;
}
.auth-stagger > :deep(*:nth-child(7)) {
  animation-delay: 360ms;
}

@keyframes auth-shell-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-stagger > :deep(*) {
    animation: none !important;
  }
  .auth-split-shimmer {
    display: none !important;
  }
}

.auth-split-shimmer {
  background: linear-gradient(
    115deg,
    transparent 0%,
    color-mix(in srgb, #ffffff 14%, transparent) 45%,
    transparent 90%
  );
  animation: auth-shimmer 10s ease-in-out infinite;
}

@keyframes auth-shimmer {
  0%,
  100% {
    transform: translateX(-12%) skewX(-6deg);
  }
  50% {
    transform: translateX(18%) skewX(-6deg);
  }
}
</style>
