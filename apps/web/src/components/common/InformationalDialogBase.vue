<template>
  <Dialog
    v-model:visible="open"
    :modal="true"
    :draggable="false"
    :dismissable-mask="!loading"
    :closable="false"
    :close-on-escape="!loading"
    :style="{ width: dialogWidth }"
    :pt="{
      mask: { class: 'alega-confirm-mask' },
      root: {
        class:
          'matter-dialog-root !border-0 !bg-transparent !p-0 !m-0 !shadow-none overflow-visible',
      },
    }"
    @hide="onDialogHide"
  >
    <template #container>
      <div class="matter-dialog-shell">
        <header class="matter-dialog-header" :class="`matter-dialog-header--tone-${variant}`">
          <div class="flex items-start gap-3 min-w-0">
            <div class="matter-dialog-icon" :class="variantStyles.iconWrap">
              <i :class="[resolvedIcon, 'text-xl', variantStyles.iconText]" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0 flex-1">
              <span v-if="eyebrow" class="matter-dialog-eyebrow" :class="variantStyles.eyebrowText">{{ eyebrow }}</span>
              <h2 class="matter-dialog-title">{{ title }}</h2>
              <p
                v-if="subject"
                class="matter-dialog-stephint m-0 truncate font-medium"
                :title="subject"
              >
                «{{ subject }}»
              </p>
            </div>
          </div>
          <button
            v-if="!loading"
            type="button"
            class="dialog-close-btn"
            :aria-label="closeAriaLabel"
            @click="onDismiss"
          >
            <i class="pi pi-times text-sm" />
          </button>
        </header>

        <div class="matter-dialog-body">
          <div class="matter-dialog-body-inner flex flex-col gap-4">
            <p v-if="message" class="m-0 text-sm leading-relaxed text-[var(--fg-muted)]">
              {{ message }}
            </p>

            <dl
              v-if="facts?.length"
              class="info-dialog-facts m-0 grid gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-sunken)] p-3 text-sm"
            >
              <template v-for="(row, i) in facts" :key="i">
                <dt class="m-0 font-medium text-[var(--fg-subtle)]">{{ row.label }}</dt>
                <dd class="m-0 min-w-0 text-[var(--fg-default)] font-mono-num break-words">
                  {{ row.value }}
                </dd>
              </template>
            </dl>

            <template v-for="(section, si) in sections" :key="si">
              <section class="matter-form-section">
                <h3 class="matter-form-section__title">{{ section.title }}</h3>
                <p
                  v-if="section.body"
                  class="m-0 text-sm leading-relaxed text-[var(--fg-muted)] whitespace-pre-wrap"
                >
                  {{ section.body }}
                </p>
                <ul
                  v-if="section.bullets?.length"
                  class="m-0 list-none space-y-1.5 pl-0 text-sm leading-snug text-[var(--fg-muted)]"
                >
                  <li v-for="(b, bi) in section.bullets" :key="bi" class="flex gap-2">
                    <span class="mt-0.5 shrink-0 text-accent" aria-hidden>·</span>
                    <span>{{ b }}</span>
                  </li>
                </ul>
              </section>
            </template>

            <!-- Contenido rico read-only (ProgressBar, timelines, tablas cortas); preferir facts/sections/callout siempre que basten -->
            <slot />

            <div
              v-if="callout"
              class="info-dialog-callout rounded-lg border px-3 py-2.5 text-sm leading-relaxed"
              :class="`info-dialog-callout--${variant}`"
            >
              <p v-if="callout.title" class="m-0 mb-1 text-xs font-semibold uppercase tracking-wide">
                {{ callout.title }}
              </p>
              <p class="m-0">{{ callout.body }}</p>
            </div>
          </div>
        </div>

        <footer class="matter-dialog-footer flex justify-end">
          <Button
            type="button"
            :label="closeLabelResolved"
            icon="pi pi-check"
            :severity="variantStyles.buttonSeverity"
            :loading="loading"
            :disabled="loading"
            @click="onDismiss"
          />
        </footer>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

export type InformationalDialogVariant = 'info' | 'success' | 'warning' | 'neutral';

export interface InformationalDialogSection {
  title: string;
  body?: string;
  bullets?: string[];
}

export interface InformationalDialogFact {
  label: string;
  value: string;
}

export interface InformationalDialogCallout {
  title?: string;
  body: string;
}

const props = withDefaults(
  defineProps<{
    visible: boolean;
    variant?: InformationalDialogVariant;
    eyebrow?: string;
    title: string;
    subject?: string;
    message?: string;
    /** PrimeIcons class, e.g. `pi pi-info-circle`. Defaults by variant. */
    icon?: string;
    sections?: InformationalDialogSection[];
    facts?: InformationalDialogFact[];
    callout?: InformationalDialogCallout;
    /** Primary dismiss label. Prefer passing `t('common.gotIt')` from views. */
    closeLabel?: string;
    /** `aria-label` for the X button. Prefer i18n from parent. */
    closeAriaLabel?: string;
    loading?: boolean;
  }>(),
  {
    variant: 'info',
    eyebrow: '',
    subject: '',
    message: '',
    icon: '',
    sections: () => [],
    facts: () => [],
    callout: undefined,
    closeLabel: '',
    closeAriaLabel: 'Cerrar',
    loading: false,
  },
);

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'hide'): void;
  (e: 'close'): void;
}>();

const open = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v),
});

const closeLabelResolved = computed(() => props.closeLabel || 'Entendido');

const variantMap: Record<
  InformationalDialogVariant,
  {
    defaultIcon: string;
    iconWrap: string;
    iconText: string;
    eyebrowText: string;
    buttonSeverity: 'info' | 'success' | 'warn' | undefined;
  }
> = {
  info: {
    defaultIcon: 'pi pi-info-circle',
    iconWrap: '',
    iconText: 'text-[var(--accent)]',
    eyebrowText: 'text-[var(--accent)]',
    buttonSeverity: undefined,
  },
  success: {
    defaultIcon: 'pi pi-check-circle',
    iconWrap: 'matter-dialog-icon--success',
    iconText: 'text-emerald-600 dark:text-emerald-300',
    eyebrowText: 'matter-dialog-eyebrow--success',
    buttonSeverity: 'success',
  },
  warning: {
    defaultIcon: 'pi pi-exclamation-circle',
    iconWrap: 'matter-dialog-icon--warning',
    iconText: 'text-amber-700 dark:text-amber-300',
    eyebrowText: 'matter-dialog-eyebrow--warning',
    buttonSeverity: 'warn',
  },
  neutral: {
    defaultIcon: 'pi pi-list',
    iconWrap: 'matter-dialog-icon--neutral',
    iconText: 'text-[var(--fg-muted)]',
    eyebrowText: '',
    buttonSeverity: undefined,
  },
};

const variantStyles = computed(() => variantMap[props.variant]);

const resolvedIcon = computed(() => props.icon || variantStyles.value.defaultIcon);

const slots = useSlots();

const dialogWidth = computed(() => {
  const hasSlot = !!(slots.default && slots.default().length > 0);
  const wide =
    hasSlot ||
    (props.subject?.length ?? 0) > 48 ||
    (props.sections?.length ?? 0) > 0 ||
    (props.facts?.length ?? 0) > 0 ||
    !!props.callout ||
    (props.message?.length ?? 0) > 220;
  return wide ? 'min(560px, 96vw)' : 'min(440px, 96vw)';
});

function onDialogHide() {
  emit('hide');
}

function onDismiss() {
  if (props.loading) return;
  emit('close');
  emit('update:visible', false);
}
</script>

<style scoped>
:deep(.matter-dialog-root.p-dialog) {
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  overflow: visible !important;
}

.matter-dialog-shell {
  width: 100%;
  max-height: min(88vh, 720px);
  border-radius: 16px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.matter-dialog-header {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--surface-border);
  flex-shrink: 0;
}

/* Degradado superior por variante (alineado con ConfirmDialogBase) */
.matter-dialog-header--tone-neutral {
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--brand-zafiro) 7%, transparent),
    transparent 90%
  );
}
html.dark .matter-dialog-header--tone-neutral {
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--accent) 18%, transparent),
    transparent 90%
  );
}

.matter-dialog-header--tone-info {
  background: linear-gradient(
    to bottom,
    var(--accent-soft),
    transparent 90%
  );
}
html.dark .matter-dialog-header--tone-info {
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--accent) 22%, transparent),
    transparent 90%
  );
}

.matter-dialog-header--tone-success {
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, #ecfdf5 95%, transparent),
    transparent 90%
  );
}
html.dark .matter-dialog-header--tone-success {
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, #064e3b 50%, transparent),
    transparent 90%
  );
}

.matter-dialog-header--tone-warning {
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, #fffbeb 96%, transparent),
    transparent 90%
  );
}
html.dark .matter-dialog-header--tone-warning {
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, #78350f 38%, transparent),
    transparent 90%
  );
}

.matter-dialog-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--brand-zafiro) 22%, var(--surface-border));
  background: color-mix(in srgb, var(--brand-zafiro) 8%, var(--surface-raised));
  flex-shrink: 0;
}

.matter-dialog-icon--success {
  border-color: color-mix(in srgb, #10b981 28%, var(--surface-border));
  background: color-mix(in srgb, #10b981 10%, var(--surface-raised));
}

.matter-dialog-icon--warning {
  border-color: color-mix(in srgb, #d97706 28%, var(--surface-border));
  background: color-mix(in srgb, #f59e0b 10%, var(--surface-raised));
}

.matter-dialog-icon--neutral {
  border-color: var(--surface-border);
  background: var(--surface-sunken);
}

.matter-dialog-eyebrow {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--brand-zafiro);
}
html.dark .matter-dialog-eyebrow {
  color: var(--accent);
}

/* Eyebrow tintado por variante — sobreescribe el default zafiro */
.matter-dialog-eyebrow--success {
  color: #059669;
}
html.dark .matter-dialog-eyebrow--success {
  color: #34d399;
}
.matter-dialog-eyebrow--warning {
  color: #b45309;
}
html.dark .matter-dialog-eyebrow--warning {
  color: #fbbf24;
}

.matter-dialog-title {
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--fg-default);
  margin: 0;
}

.matter-dialog-stephint {
  font-size: 0.8125rem;
  color: var(--fg-muted);
}

.dialog-close-btn {
  flex-shrink: 0;
  height: 2rem;
  width: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  color: var(--fg-muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 120ms ease;
}
.dialog-close-btn:hover {
  background: var(--surface-sunken);
}

.matter-dialog-body {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
}

.matter-dialog-body-inner {
  max-height: min(56vh, 420px);
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
}

.matter-dialog-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-sunken);
  flex-shrink: 0;
}

.matter-form-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.matter-form-section__title {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--fg-subtle);
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed var(--surface-border);
}

.info-dialog-facts {
  grid-template-columns: minmax(0, 9rem) 1fr;
}

@media (max-width: 480px) {
  .info-dialog-facts {
    grid-template-columns: 1fr;
  }
}

.font-mono-num {
  font-feature-settings: 'tnum' 1, 'lnum' 1;
}

.info-dialog-callout--info {
  border-color: color-mix(in srgb, var(--accent) 35%, var(--surface-border));
  background: color-mix(in srgb, var(--accent) 8%, var(--surface-raised));
  color: var(--fg-muted);
}

.info-dialog-callout--success {
  border-color: color-mix(in srgb, #10b981 40%, var(--surface-border));
  background: color-mix(in srgb, #10b981 12%, var(--surface-raised));
  color: var(--fg-muted);
}
html.dark .info-dialog-callout--success {
  border-color: color-mix(in srgb, #10b981 35%, var(--surface-border));
  background: color-mix(in srgb, #10b981 14%, var(--surface-sunken));
  color: var(--fg-muted);
}

.info-dialog-callout--warning {
  border-color: color-mix(in srgb, #d97706 40%, var(--surface-border));
  background: color-mix(in srgb, #f59e0b 12%, var(--surface-raised));
  color: var(--fg-muted);
}
html.dark .info-dialog-callout--warning {
  border-color: color-mix(in srgb, #f59e0b 35%, var(--surface-border));
  background: color-mix(in srgb, #f59e0b 12%, var(--surface-sunken));
  color: var(--fg-muted);
}

.info-dialog-callout--neutral {
  border-color: var(--surface-border);
  background: var(--surface-sunken);
  color: var(--fg-muted);
}
</style>
