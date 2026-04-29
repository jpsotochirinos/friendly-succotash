<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TrackableListingUrgency, TrackableListFacets } from '@/api/trackables';

const props = withDefaults(
  defineProps<{
    facets: TrackableListFacets;
    modelValue: TrackableListingUrgency | null;
    /** Quick filter: expedientes asignados al usuario actual */
    assignedToMeActive?: boolean;
    /** Total en lista cuando el filtro «a mí» está activo (p. ej. totalRecords) */
    mineCount?: number | null;
    showMineChip?: boolean;
  }>(),
  {
    assignedToMeActive: false,
    mineCount: null,
    showMineChip: true,
  },
);

const emit = defineEmits<{
  'update:modelValue': [v: TrackableListingUrgency | null];
  toggleAssignedToMe: [];
}>();

const { t } = useI18n();

/** Semantic accents per bucket (align with bandas / KPI legacy map). */
const CHIP_ACCENTS: Record<
  'total' | 'overdue' | 'due_today' | 'due_week' | 'due_month' | 'no_deadline',
  string
> = {
  total: 'var(--brand-zafiro)',
  overdue: '#dc2626',
  due_today: '#d97706',
  due_week: '#ca8a04',
  due_month: '#0f766e',
  no_deadline: '#64748b',
};

const chips = computed(() => {
  const f = props.facets;
  return [
    {
      key: 'total' as const,
      count: f.total,
      label: t('trackables.listingChipTotal'),
      icon: 'pi pi-folder',
      accent: CHIP_ACCENTS.total,
    },
    {
      key: 'overdue' as const,
      count: f.overdue,
      label: t('trackables.listingChipOverdue'),
      icon: 'pi pi-exclamation-circle',
      accent: CHIP_ACCENTS.overdue,
    },
    {
      key: 'due_today' as const,
      count: f.dueToday,
      label: t('trackables.listingChipDueToday'),
      icon: 'pi pi-bolt',
      accent: CHIP_ACCENTS.due_today,
    },
    {
      key: 'due_week' as const,
      count: f.dueWeek,
      label: t('trackables.listingChipDueWeek'),
      icon: 'pi pi-calendar',
      accent: CHIP_ACCENTS.due_week,
    },
    {
      key: 'due_month' as const,
      count: f.dueMonth,
      label: t('trackables.listingChipDueMonth'),
      icon: 'pi pi-calendar-plus',
      accent: CHIP_ACCENTS.due_month,
    },
    {
      key: 'no_deadline' as const,
      count: f.noDeadline,
      label: t('trackables.listingChipNoDeadline'),
      icon: 'pi pi-clock',
      accent: CHIP_ACCENTS.no_deadline,
    },
  ];
});

function isActive(key: typeof chips.value[number]['key']) {
  if (key === 'total') return props.modelValue == null;
  return props.modelValue === key;
}

function isDisabled(chip: typeof chips.value[number]) {
  return chip.key !== 'total' && chip.count === 0 && !isActive(chip.key);
}

function onChip(key: typeof chips.value[number]['key']) {
  const chip = chips.value.find((c) => c.key === key);
  if (chip && isDisabled(chip)) return;
  if (key === 'total') {
    emit('update:modelValue', null);
    return;
  }
  if (isActive(key)) emit('update:modelValue', null);
  else emit('update:modelValue', key as TrackableListingUrgency);
}
</script>

<template>
  <div
    class="flex flex-wrap gap-2"
    role="toolbar"
    :aria-label="t('trackables.listingUrgencyChipsAria')"
  >
    <button
      v-for="chip in chips"
      :key="chip.key"
      type="button"
      class="listing-urgency-chip"
      :class="{
        'listing-urgency-chip--active': isActive(chip.key),
        'listing-urgency-chip--disabled': isDisabled(chip),
        'listing-urgency-chip--corner-pulse':
          chip.key === 'overdue' && chip.count > 0 && !isDisabled(chip),
      }"
      :style="{ '--chip-accent': chip.accent }"
      :data-urgency="chip.key"
      :aria-pressed="isActive(chip.key) ? 'true' : 'false'"
      :aria-disabled="isDisabled(chip) ? 'true' : 'false'"
      :disabled="isDisabled(chip)"
      @click="onChip(chip.key)"
    >
      <!-- KPI-card style: pulse anchored top-right (exp-kpi-card pulse dot) -->
      <span
        v-if="chip.key === 'overdue' && chip.count > 0 && !isDisabled(chip)"
        class="listing-urgency-chip__pulse-dot pointer-events-none"
        aria-hidden="true"
      />
      <i :class="[chip.icon, 'listing-urgency-chip__icon text-[11px]']" aria-hidden="true" />
      <span class="listing-urgency-chip__label">{{ chip.label }}</span>
      <span class="listing-urgency-chip__count tabular-nums">{{ chip.count }}</span>
    </button>
    <button
      v-if="showMineChip"
      type="button"
      class="listing-urgency-chip listing-mine-chip"
      :class="{ 'listing-urgency-chip--active': assignedToMeActive }"
      :style="{ '--chip-accent': 'var(--accent)' }"
      data-chip="mine"
      :aria-pressed="assignedToMeActive ? 'true' : 'false'"
      :aria-label="t('trackables.listingChipMineAria')"
      @click="emit('toggleAssignedToMe')"
    >
      <i class="pi pi-user listing-urgency-chip__icon text-[11px]" aria-hidden="true" />
      <span class="listing-urgency-chip__label">{{ t('trackables.listingChipMine') }}</span>
      <span
        v-if="assignedToMeActive && mineCount != null && mineCount >= 0"
        class="listing-urgency-chip__count tabular-nums"
      >{{ mineCount }}</span>
    </button>
  </div>
</template>

<style scoped>
.listing-urgency-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.25rem;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid color-mix(in srgb, var(--chip-accent, var(--accent)) 28%, var(--surface-border));
  background: color-mix(in srgb, var(--chip-accent, var(--accent)) 9%, var(--surface-raised));
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--fg-default);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}
.listing-urgency-chip__icon {
  color: var(--chip-accent, var(--accent));
}
.listing-urgency-chip:hover:not(.listing-urgency-chip--disabled) {
  border-color: color-mix(in srgb, var(--chip-accent, var(--accent)) 45%, var(--surface-border));
  background: color-mix(in srgb, var(--chip-accent, var(--accent)) 14%, var(--surface-raised));
}
.listing-urgency-chip--active {
  border-color: var(--chip-accent, var(--accent));
  background: color-mix(in srgb, var(--chip-accent, var(--accent)) 22%, var(--surface-raised));
  color: var(--chip-accent, var(--accent));
}
.listing-urgency-chip--disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.listing-urgency-chip--disabled:hover {
  border-color: var(--surface-border);
  color: var(--fg-muted);
}
.listing-urgency-chip__count {
  font-size: 0.6875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  color: var(--fg-subtle);
}
.listing-urgency-chip--active .listing-urgency-chip__count {
  color: color-mix(in srgb, var(--chip-accent, var(--accent)) 92%, var(--fg-default));
}
/* Space so count doesn’t sit under the corner pulse (matches exp-kpi-card intent). */
.listing-urgency-chip--corner-pulse {
  padding-right: 1.125rem;
}
.listing-urgency-chip__pulse-dot {
  position: absolute;
  top: 0.35rem;
  right: 0.45rem;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--chip-accent, #dc2626);
  animation: listingUrgencyPulseDot 1.75s ease-in-out infinite;
}
@keyframes listingUrgencyPulseDot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--chip-accent, #dc2626) 55%, transparent);
  }
  50% {
    opacity: 0.72;
    transform: scale(1.18);
    box-shadow: 0 0 0 8px color-mix(in srgb, var(--chip-accent, #dc2626) 0%, transparent);
  }
}
@media (prefers-reduced-motion: reduce) {
  .listing-urgency-chip__pulse-dot {
    animation: none;
    opacity: 1;
    transform: none;
    box-shadow: none;
  }
}
</style>
