<script setup lang="ts">
import { computed } from 'vue';
import {
  ymd,
  isWeekend,
  getFeriado,
  isDiaHabil,
  urgencyForActuacion,
  URGENCY_TOKENS,
  type UrgencyLevel,
} from '../urgency';
import type { Actuacion } from '../mocks';
import UrgencyPill from '../atoms/UrgencyPill.vue';

const props = defineProps<{
  startDate: Date;
  actuaciones: Actuacion[];
}>();

const emit = defineEmits<{ (e: 'select-day', d: Date): void }>();

interface DayRow {
  date: Date;
  key: string;
  weekday: string;
  dayLabel: string;
  isToday: boolean;
  isWeekend: boolean;
  feriado: { nombre: string; aplicaAPlazos: boolean } | null;
  isHabil: boolean;
  plazos: Actuacion[];
  audiencias: Actuacion[];
  summary: string;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

const rows = computed<DayRow[]>(() => {
  const out: DayRow[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(
      props.startDate.getFullYear(),
      props.startDate.getMonth(),
      props.startDate.getDate() + i,
    );
    const key = ymd(d);
    const isTodayRow = ymd(d) === ymd(today);
    const f = getFeriado(d);
    const dayActs = props.actuaciones.filter((a) => a.fechaIso.slice(0, 10) === key);
    const plazos = dayActs.filter((a) => a.tipo === 'plazo');
    const audiencias = dayActs.filter(
      (a) => a.tipo === 'audiencia' || a.tipo === 'diligencia',
    );

    let summary: string;
    if (f) summary = f.nombre;
    else if (isWeekend(d) && plazos.length === 0 && audiencias.length === 0)
      summary = 'no laborable';
    else if (plazos.length === 0 && audiencias.length === 0) summary = 'sin actividad';
    else {
      const parts: string[] = [];
      if (plazos.length) parts.push(`${plazos.length} plazo${plazos.length === 1 ? '' : 's'}`);
      if (audiencias.length)
        parts.push(`${audiencias.length} audiencia${audiencias.length === 1 ? '' : 's'}`);
      summary = parts.join(' · ');
    }

    const weekday = d.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '');
    const dayNum = d.getDate();
    const monthShort = d.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
    const dayLabel = isTodayRow
      ? `${dayNum} · hoy`
      : i === 0 || dayNum === 1
        ? `${dayNum} ${monthShort}`
        : `${dayNum}`;

    out.push({
      date: d,
      key,
      weekday,
      dayLabel,
      isToday: isTodayRow,
      isWeekend: isWeekend(d),
      feriado: f ? { nombre: f.nombre, aplicaAPlazos: f.aplicaAPlazos } : null,
      isHabil: isDiaHabil(d),
      plazos,
      audiencias,
      summary,
    });
  }
  return out;
});

function urgencyOf(a: Actuacion): UrgencyLevel {
  return urgencyForActuacion(a.tipo, new Date(a.fechaIso), a.estado);
}
</script>

<template>
  <div class="strip">
    <div
      v-for="row in rows"
      :key="row.key"
      class="strip__row"
      :class="{
        'strip__row--today': row.isToday,
        'strip__row--weekend': row.isWeekend && !row.feriado && !row.isToday,
        'strip__row--feriado': !!row.feriado && !row.isToday,
      }"
      tabindex="0"
      role="button"
      @click="emit('select-day', row.date)"
      @keydown.enter="emit('select-day', row.date)"
      @keydown.space.prevent="emit('select-day', row.date)"
    >
      <div class="strip__day">
        <span class="strip__weekday">{{ row.weekday }}</span>
        <span class="strip__num">{{ row.dayLabel }}</span>
        <span v-if="row.feriado" class="strip__feriado">feriado</span>
      </div>
      <div class="strip__events">
        <template v-if="row.feriado">
          <span class="strip__hint">día no hábil · plazos no corren</span>
        </template>
        <template v-else-if="!row.isHabil && !row.audiencias.length && !row.plazos.length">
          <span class="strip__hint">no laborable</span>
        </template>
        <template v-else-if="!row.audiencias.length && !row.plazos.length">
          <span class="strip__hint">sin actividad programada</span>
        </template>
        <template v-else>
          <UrgencyPill
            v-for="a in row.plazos"
            :key="a.id"
            :level="urgencyOf(a)"
            tipo="plazo"
            :label="a.titulo"
          />
          <UrgencyPill
            v-for="a in row.audiencias"
            :key="a.id"
            :level="urgencyOf(a)"
            :tipo="a.tipo"
            :label="a.titulo"
          />
        </template>
      </div>
      <div class="strip__summary">{{ row.summary }}</div>
    </div>
  </div>
</template>

<style scoped>
.strip {
  background: var(--surface-raised);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
  container-type: inline-size;
}
.strip__row {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr) 160px;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--surface-border);
  cursor: pointer;
  transition: background 0.1s ease, box-shadow 0.1s ease;
  background: var(--surface-raised);
}
.strip__row:last-child { border-bottom: none; }
.strip__row:hover { background: var(--surface-sunken); }
.strip__row:focus-visible {
  outline: 2px solid var(--accent-ring);
  outline-offset: -2px;
}
/* Hoy: acento zafiro (frío / “acción”) — claramente distinto de sáb–dom y de feriados. */
.strip__row--today {
  background: color-mix(in srgb, var(--brand-zafiro) 20%, var(--surface-raised));
  box-shadow: inset 4px 0 0 var(--brand-zafiro);
}
.strip__row--today:hover {
  background: color-mix(in srgb, var(--brand-zafiro) 26%, var(--surface-sunken));
}
/* Sábado / domingo: gris pizarra frío, sin barra lateral (≠ hoy ≠ feriado cálido). */
.strip__row--weekend {
  background: color-mix(in srgb, #64748b 13%, var(--surface-sunken));
  color: var(--fg-muted);
}
.strip__row--weekend:hover {
  background: color-mix(in srgb, #64748b 20%, var(--surface-sunken));
}
/* Feriado: ámbar / cálido (≠ frío fin de semana, ≠ zafiro hoy). */
.strip__row--feriado {
  background: color-mix(in srgb, #d97706 18%, var(--surface-sunken));
  box-shadow: inset 3px 0 0 color-mix(in srgb, #d97706 55%, transparent);
}
.strip__row--feriado:hover {
  background: color-mix(in srgb, #d97706 24%, var(--surface-sunken));
}

.strip__day {
  display: flex;
  flex-direction: column;
  gap: 1px;
  text-transform: capitalize;
}
.strip__weekday {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-subtle);
}
.strip__num {
  font-size: 14px;
  font-weight: 600;
  font-feature-settings: 'tnum' 1;
  color: var(--fg-default);
}
.strip__row--today .strip__num { color: var(--brand-zafiro); }
.strip__feriado {
  font-size: 9px;
  font-weight: 700;
  color: #6d3f06;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.strip__events {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-width: 0;
}
.strip__hint {
  font-size: 11px;
  font-style: italic;
  color: var(--fg-subtle);
}

.strip__summary {
  font-size: 11px;
  color: var(--fg-muted);
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 720px) {
  .strip__row {
    grid-template-columns: 90px 1fr;
    grid-template-rows: auto auto;
  }
  .strip__summary {
    grid-column: 2;
    text-align: left;
  }
}

@container (max-width: 520px) {
  .strip__row {
    grid-template-columns: 84px minmax(0, 1fr);
    grid-template-rows: auto auto;
    align-items: start;
    gap: 6px 10px;
    padding: 9px 11px;
  }
  .strip__summary {
    grid-column: 2;
    text-align: left;
    white-space: normal;
  }
}
</style>
