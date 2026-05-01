<script setup lang="ts">
import { computed } from 'vue';
import {
  ymd,
  isWeekend,
  getFeriado,
  urgencyForActuacion,
  URGENCY_TOKENS,
  type UrgencyLevel,
} from '../urgency';
import type { Actuacion } from '../mocks';

const props = defineProps<{
  monthDate: Date;
  actuaciones: Actuacion[];
}>();

const emit = defineEmits<{ (e: 'select-day', d: Date): void }>();

const URGENCY_RANK: Record<UrgencyLevel, number> = {
  done: 0,
  info: 1,
  normal: 2,
  warn: 3,
  urgent: 4,
  overdue: 5,
};

interface Cell {
  date: Date;
  key: string;
  num: number;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  feriado: string | null;
  acts: Actuacion[];
  maxLevel: UrgencyLevel | null;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

const cells = computed<Cell[]>(() => {
  const first = new Date(props.monthDate.getFullYear(), props.monthDate.getMonth(), 1);
  const dow = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(start.getDate() - dow);

  const out: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = ymd(d);
    const acts = props.actuaciones.filter((a) => a.fechaIso.slice(0, 10) === key);
    let max: UrgencyLevel | null = null;
    for (const a of acts) {
      const lvl = urgencyForActuacion(a.tipo, new Date(a.fechaIso), a.estado);
      if (!max || URGENCY_RANK[lvl] > URGENCY_RANK[max]) max = lvl;
    }
    const f = getFeriado(d);
    out.push({
      date: d,
      key,
      num: d.getDate(),
      inMonth: d.getMonth() === props.monthDate.getMonth(),
      isToday: ymd(d) === ymd(today),
      isWeekend: isWeekend(d),
      feriado: f ? f.nombre : null,
      acts,
      maxLevel: max,
    });
  }
  return out;
});

const totales = computed(() => {
  const inMonth = cells.value.filter((c) => c.inMonth);
  const plazos = inMonth.flatMap((c) => c.acts).filter((a) => a.tipo === 'plazo').length;
  const audiencias = inMonth
    .flatMap((c) => c.acts)
    .filter((a) => a.tipo === 'audiencia' || a.tipo === 'diligencia').length;
  const feriados = inMonth.filter((c) => c.feriado).length;
  return { plazos, audiencias, feriados };
});

const dows = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

function chipFor(a: Actuacion) {
  const lvl = urgencyForActuacion(a.tipo, new Date(a.fechaIso), a.estado);
  return URGENCY_TOKENS[lvl];
}
</script>

<template>
  <section class="mes">
    <div class="mes__summary">
      <span><strong>{{ totales.plazos }}</strong> plazos</span>
      <span class="mes__sep">·</span>
      <span><strong>{{ totales.audiencias }}</strong> audiencias</span>
      <span class="mes__sep">·</span>
      <span><strong>{{ totales.feriados }}</strong> feriados</span>
    </div>
    <div class="mes__grid">
      <div v-for="d in dows" :key="d" class="mes__dow">{{ d }}</div>
      <button
        v-for="cell in cells"
        :key="cell.key"
        type="button"
        class="mes__cell"
        :class="{
          'mes__cell--muted': !cell.inMonth,
          'mes__cell--weekend': cell.isWeekend && !cell.feriado,
          'mes__cell--feriado': !!cell.feriado,
          'mes__cell--today': cell.isToday,
        }"
        @click="emit('select-day', cell.date)"
      >
        <span class="mes__num">{{ cell.num }}</span>
        <span v-if="cell.feriado" class="mes__feriado">{{ cell.feriado }}</span>
        <template v-if="cell.maxLevel">
          <span
            v-for="(a, i) in cell.acts.slice(0, 3)"
            :key="a.id"
            class="mes__event"
            :style="{
              background: chipFor(a).bg,
              borderLeftColor: chipFor(a).bar,
              color: chipFor(a).text,
            }"
          >{{ a.titulo }}</span>
          <span v-if="cell.acts.length > 3" class="mes__more">
            +{{ cell.acts.length - 3 }} más
          </span>
        </template>
      </button>
    </div>
  </section>
</template>

<style scoped>
.mes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100%;
  container-type: inline-size;
}
.mes__summary {
  font-size: 12px;
  color: var(--fg-muted);
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 2px;
}
.mes__summary strong { color: var(--fg-default); font-feature-settings: 'tnum' 1; }
.mes__sep { color: var(--surface-border-strong); }

.mes__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-template-rows: auto repeat(6, minmax(5.75rem, 1fr));
  background: var(--surface-raised);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
  flex: 1;
  min-height: clamp(32rem, 68vh, 48rem);
}
.mes__dow {
  background: var(--surface-sunken);
  padding: 7px 10px;
  font-size: 10px;
  font-weight: 700;
  color: var(--fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-right: 1px solid var(--surface-border);
  border-bottom: 1px solid var(--surface-border);
}
.mes__dow:nth-child(7n + 7) { border-right: none; }
.mes__cell {
  background: transparent;
  border: none;
  border-right: 1px solid var(--surface-border);
  border-bottom: 1px solid var(--surface-border);
  padding: 6px 8px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}
.mes__cell:nth-child(7n + 14) { border-right: none; }
.mes__cell:hover { background: var(--surface-sunken); }
.mes__cell--muted { background: var(--surface-app); color: var(--fg-subtle); }
.mes__cell--weekend { background: var(--surface-sunken); }
.mes__cell--feriado { background: rgba(217,119,6,0.06); }
.mes__cell--today {
  background: var(--accent-soft);
}
.mes__num {
  font-size: 12px;
  font-weight: 600;
  font-feature-settings: 'tnum' 1;
  color: var(--fg-default);
  align-self: flex-start;
}
.mes__cell--today .mes__num {
  background: var(--brand-zafiro);
  color: var(--fg-on-brand);
  border-radius: 999px;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  font-size: 11px;
}
.mes__cell--muted .mes__num { color: var(--fg-subtle); }
.mes__cell--feriado .mes__num { color: #6d3f06; }
.mes__feriado {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6d3f06;
}
.mes__event {
  font-size: 10px;
  padding: 2px 5px;
  border-radius: 2px;
  border-left: 2px solid var(--fg-subtle);
  background: var(--surface-app);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.mes__more {
  font-size: 9px;
  color: var(--fg-subtle);
  font-weight: 600;
}

@container (max-width: 760px) {
  .mes__grid {
    overflow-x: auto;
    grid-template-columns: repeat(7, minmax(7.25rem, 1fr));
  }
  .mes__cell {
    min-height: 5.75rem;
  }
}
</style>
