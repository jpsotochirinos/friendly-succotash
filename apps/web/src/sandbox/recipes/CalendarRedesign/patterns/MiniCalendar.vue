<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  ymd,
  isWeekend,
  getFeriado,
  urgencyForActuacion,
  URGENCY_TOKENS,
  type UrgencyLevel,
} from '../urgency';
import type { Actuacion } from '../mocks';
import type { CalendarFilterKind } from '@/composables/calendarEventKind';

const props = withDefaults(
  defineProps<{
    modelValue: Date;
    /** Sandbox / expediente: actuaciones mock con urgencia por tipo. */
    actuaciones?: Actuacion[];
    /** Calendario global: kinds agregados por día (puntos de color). */
    kindsByDay?: Record<string, CalendarFilterKind[]>;
  }>(),
  { actuaciones: () => [] },
);

const emit = defineEmits<{
  (e: 'update:modelValue', d: Date): void;
}>();

const { locale, t } = useI18n();

const cursor = ref(new Date(props.modelValue.getFullYear(), props.modelValue.getMonth(), 1));

watch(
  () => props.modelValue,
  (d) => {
    cursor.value = new Date(d.getFullYear(), d.getMonth(), 1);
  },
);

const localeTag = computed(() => (String(locale.value).toLowerCase().startsWith('es') ? 'es-PE' : 'en-US'));

const monthLabel = computed(() =>
  cursor.value.toLocaleDateString(localeTag.value, { month: 'long', year: 'numeric' }),
);

const dowLabels = computed(() => {
  const loc = localeTag.value;
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(2024, 0, 1 + i);
    labels.push(d.toLocaleDateString(loc, { weekday: 'narrow' }));
  }
  return labels;
});

const URGENCY_RANK: Record<UrgencyLevel, number> = {
  done: 0,
  info: 1,
  normal: 2,
  warn: 3,
  urgent: 4,
  overdue: 5,
};

function kindToUrgency(k: CalendarFilterKind): UrgencyLevel {
  switch (k) {
    case 'deadline':
      return 'warn';
    case 'hearing':
    case 'filing':
      return 'warn';
    case 'peruHoliday':
    case 'birthday':
      return 'info';
    default:
      return 'normal';
  }
}

function urgencyFromKinds(kinds: CalendarFilterKind[]): UrgencyLevel | null {
  if (!kinds.length) return null;
  let best: UrgencyLevel = 'info';
  for (const k of kinds) {
    const u = kindToUrgency(k);
    if (URGENCY_RANK[u] > URGENCY_RANK[best]) best = u;
  }
  return best;
}

interface Cell {
  date: Date;
  key: string;
  num: number;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  feriado: boolean;
  level: UrgencyLevel | null;
  count: number;
  isSelected: boolean;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

const cells = computed<Cell[]>(() => {
  const first = new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1);
  const dow = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(start.getDate() - dow);

  const out: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = ymd(d);
    const dayActs = props.actuaciones.filter((a) => a.fechaIso.slice(0, 10) === key);
    let max: UrgencyLevel | null = null;
    for (const a of dayActs) {
      const lvl = urgencyForActuacion(a.tipo, new Date(a.fechaIso), a.estado);
      if (!max || URGENCY_RANK[lvl] > URGENCY_RANK[max]) max = lvl;
    }
    const kinds = props.kindsByDay?.[key];
    if (kinds?.length) {
      const uk = urgencyFromKinds(kinds);
      if (!max || URGENCY_RANK[uk] > URGENCY_RANK[max]) max = uk;
    }
    const count = Math.max(dayActs.length, kinds?.length ?? 0);
    out.push({
      date: d,
      key,
      num: d.getDate(),
      inMonth: d.getMonth() === cursor.value.getMonth(),
      isToday: ymd(d) === ymd(today),
      isWeekend: isWeekend(d),
      feriado: !!getFeriado(d),
      level: max,
      count,
      isSelected: ymd(d) === ymd(props.modelValue),
    });
  }
  return out;
});

function nav(delta: number) {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + delta, 1);
}

function pick(d: Date) {
  emit('update:modelValue', d);
}

function dotAria(cell: Cell): string | undefined {
  if (!cell.count) return undefined;
  return t('globalCalendar.miniCalendarDotAria', { n: cell.count });
}
</script>

<template>
  <div class="mc">
    <div class="mc__head">
      <button
        type="button"
        class="mc__nav"
        :aria-label="t('globalCalendar.miniCalendarPrevMonth')"
        @click="nav(-1)"
      >
        <i class="pi pi-chevron-left" />
      </button>
      <span class="mc__title">{{ monthLabel }}</span>
      <button
        type="button"
        class="mc__nav"
        :aria-label="t('globalCalendar.miniCalendarNextMonth')"
        @click="nav(1)"
      >
        <i class="pi pi-chevron-right" />
      </button>
    </div>
    <div class="mc__grid">
      <span v-for="d in dowLabels" :key="d" class="mc__dow">{{ d }}</span>
      <button
        v-for="cell in cells"
        :key="cell.key"
        type="button"
        class="mc__day"
        :class="{
          'mc__day--muted': !cell.inMonth,
          'mc__day--today': cell.isToday,
          'mc__day--selected': cell.isSelected,
          'mc__day--feriado': cell.feriado,
          'mc__day--weekend': cell.isWeekend && !cell.feriado,
        }"
        @click="pick(cell.date)"
      >
        <span class="mc__num">{{ cell.num }}</span>
        <span
          v-if="cell.level"
          class="mc__dot"
          :style="{ background: URGENCY_TOKENS[cell.level].bar }"
          :aria-label="dotAria(cell)"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.mc {
  container-type: inline-size;
  background: var(--surface-raised);
  border: 1px solid var(--surface-border);
  border-radius: 10px;
  padding: 10px 10px 12px;
  width: 100%;
  max-width: min(100%, 22rem);
  margin-inline: auto;
  box-sizing: border-box;
}
.mc__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.mc__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-default);
  text-transform: capitalize;
}
.mc__nav {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--fg-muted);
  cursor: pointer;
}
.mc__nav:hover { background: var(--surface-sunken); color: var(--fg-default); }

.mc__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}
.mc__dow {
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  color: var(--fg-subtle);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 4px 0;
}
.mc__day {
  position: relative;
  aspect-ratio: 1;
  width: 100%;
  max-width: 2.75rem;
  max-height: 2.75rem;
  margin-inline: auto;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 11px;
  color: var(--fg-default);
  font-feature-settings: 'tnum' 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.mc__day:hover { background: var(--surface-sunken); }
.mc__day--muted { color: var(--fg-subtle); }
.mc__day--feriado { color: #6d3f06; background: rgba(217,119,6,0.06); }
.mc__day--weekend { color: var(--fg-subtle); }
.mc__day--today {
  background: var(--brand-zafiro);
  color: var(--fg-on-brand);
  font-weight: 600;
}
.mc__day--selected:not(.mc__day--today) {
  outline: 2px solid var(--accent-ring);
  outline-offset: -2px;
}
.mc__num { z-index: 1; }
.mc__dot {
  position: absolute;
  bottom: 3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
}
.mc__day--today .mc__dot { background: var(--fg-on-brand) !important; }

@container (min-width: 300px) {
  .mc {
    padding: 12px 12px 14px;
  }
  .mc__title {
    font-size: 14px;
  }
  .mc__nav {
    width: 26px;
    height: 26px;
    border-radius: 6px;
  }
  .mc__dow {
    font-size: 11px;
    padding-block: 6px;
  }
  .mc__day {
    font-size: 12px;
    max-width: 3rem;
    max-height: 3rem;
    border-radius: 8px;
  }
  .mc__dot {
    bottom: 4px;
    width: 5px;
    height: 5px;
  }
}
</style>
