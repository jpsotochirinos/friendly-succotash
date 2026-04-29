<script setup lang="ts">
import { computed } from 'vue';
import {
  URGENCY_TOKENS,
  TIPO_LABEL,
  fmtHora,
  fmtRelativo,
  urgencyForActuacion,
} from '../urgency';
import type { Actuacion } from '../mocks';
import { findExpediente, MATERIA_LABEL, type Expediente } from '../mocks';
import CaseKey from '../atoms/CaseKey.vue';
import AssigneeAvatar from '../atoms/AssigneeAvatar.vue';

const props = defineProps<{
  actuacion: Actuacion;
  asignadoLabel: string;
  now?: Date;
  /** Lista de expedientes (producción); si no se pasa, usa mocks. */
  expedientes?: Expediente[];
}>();

const fecha = computed(() => new Date(props.actuacion.fechaIso));
const expediente = computed(() => {
  const id = props.actuacion.expedienteId;
  if (props.expedientes?.length) {
    return props.expedientes.find((e) => e.id === id) ?? findExpediente(id);
  }
  return findExpediente(id);
});

const emit = defineEmits<{ (e: 'open', a: Actuacion): void }>();

const level = computed(() =>
  urgencyForActuacion(props.actuacion.tipo, fecha.value, props.actuacion.estado, props.now ?? new Date()),
);
const tokens = computed(() => URGENCY_TOKENS[level.value]);

const horaLabel = computed(() => {
  if (props.actuacion.horaSignificativa) return fmtHora(fecha.value);
  return '23:59';
});

const horaSubLabel = computed(() => {
  if (props.actuacion.horaSignificativa) return TIPO_LABEL[props.actuacion.tipo];
  return 'plazo';
});

const countdown = computed(() => {
  if (level.value === 'done') return 'Cumplido';
  if (level.value === 'overdue') return 'Vencido';
  return fmtRelativo(fecha.value, props.now ?? new Date());
});
</script>

<template>
  <button
    type="button"
    class="event-row"
    :class="[`event-row--${level}`, { 'event-row--done': level === 'done' }]"
    @click="emit('open', actuacion)"
  >
    <span
      class="event-row__bar"
      :style="{ background: tokens.bar }"
      aria-hidden="true"
    />
    <div class="event-row__time">
      <span
        v-if="actuacion.horaSignificativa"
        class="event-row__t-main"
      >{{ horaLabel }}</span>
      <span
        v-else
        class="event-row__t-pill"
        :style="{ background: tokens.bg, color: tokens.text, borderColor: tokens.border }"
      >{{ horaLabel }}</span>
      <span class="event-row__t-sub">{{ horaSubLabel }}</span>
    </div>
    <div class="event-row__body">
      <p class="event-row__title">{{ actuacion.titulo }}</p>
      <div v-if="expediente" class="event-row__meta">
        <CaseKey :value="expediente.numero" class="event-row__meta-key" />
        <span class="event-row__sep" aria-hidden="true">·</span>
        <span class="event-row__caratula">{{ expediente.caratula }}</span>
        <span class="event-row__sep" aria-hidden="true">·</span>
        <span class="event-row__materia">{{ MATERIA_LABEL[expediente.materia] }}</span>
        <span class="event-row__sep" aria-hidden="true">·</span>
        <span class="event-row__organo">{{ expediente.organo }}</span>
      </div>
    </div>
    <div class="event-row__side">
      <AssigneeAvatar
        class="event-row__avatar"
        :name="asignadoLabel === 'Sin asignar' ? null : asignadoLabel"
        :size="20"
      />
      <span class="event-row__assignee">{{ asignadoLabel }}</span>
      <span class="event-row__countdown" :style="{ color: tokens.bar }">{{ countdown }}</span>
    </div>
  </button>
</template>

<style scoped>
.event-row {
  display: grid;
  grid-template-columns: 6px minmax(4.25rem, 5.5rem) minmax(0, 1fr) minmax(0, max-content);
  grid-template-areas: 'bar time body side';
  align-items: stretch;
  gap: 0;
  width: 100%;
  text-align: left;
  background: var(--surface-raised);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.12s ease, box-shadow 0.12s ease, transform 0.08s ease;
  font-family: inherit;
  padding: 0;
  overflow: hidden;
  container-type: inline-size;
  container-name: event-row;
}
.event-row:hover {
  border-color: var(--surface-border-strong);
  box-shadow: var(--shadow-sm);
}
.event-row:focus-visible {
  outline: 2px solid var(--accent-ring);
  outline-offset: 2px;
}
.event-row--done {
  opacity: 0.7;
}

.event-row__bar {
  grid-area: bar;
  background: var(--fg-subtle);
}

.event-row__time {
  grid-area: time;
  padding: 10px 0 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  justify-content: flex-start;
  min-width: 0;
}
.event-row__t-main {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  font-feature-settings: 'tnum' 1;
  font-variant-numeric: tabular-nums;
  color: var(--brand-zafiro);
}
.event-row__t-pill {
  display: inline-flex;
  align-self: flex-start;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid transparent;
  font-feature-settings: 'tnum' 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}
.event-row__t-sub {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-subtle);
}

.event-row__body {
  grid-area: body;
  padding: 10px 12px 10px 10px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: flex-start;
}
.event-row__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--fg-default);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.event-row__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.1rem 0.28rem;
  row-gap: 0.2rem;
  font-size: 12px;
  color: var(--fg-muted);
  min-width: 0;
  line-height: 1.35;
}
.event-row__meta-key {
  flex-shrink: 0;
}
.event-row__sep {
  flex-shrink: 0;
  color: var(--surface-border-strong);
  margin: 0;
  user-select: none;
}
.event-row__caratula {
  flex: 1 1 8rem;
  min-width: 0;
  font-weight: 500;
  color: var(--fg-default);
  overflow-wrap: anywhere;
}
.event-row__materia,
.event-row__organo {
  flex-shrink: 1;
  min-width: 0;
  color: var(--fg-muted);
  overflow-wrap: anywhere;
}

.event-row__side {
  grid-area: side;
  padding: 10px 12px 10px 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 3px;
  min-width: 0;
  max-width: 11rem;
}
.event-row__avatar {
  flex-shrink: 0;
}

@container event-row (min-width: 720px) {
  .event-row__side {
    min-width: 6.5rem;
    max-width: 10.5rem;
  }
}
.event-row__assignee {
  font-size: 11px;
  color: var(--fg-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-align: right;
}
.event-row__countdown {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  font-feature-settings: 'tnum' 1;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Stacked layout: bar + main column; footer aligned with body (not under bar). */
@container event-row (max-width: 719px) {
  .event-row {
    grid-template-columns: 6px 1fr;
    grid-template-rows: auto auto auto;
    grid-template-areas:
      'bar time'
      'bar body'
      'bar side';
  }
  .event-row__time {
    padding: 10px 12px 6px 12px;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 10px;
  }
  .event-row__body {
    padding: 0 12px 8px 12px;
    min-width: 0;
  }
  .event-row__title {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
    overflow-wrap: anywhere;
  }
  .event-row__side {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: center;
    gap: 6px 10px;
    min-width: 0;
    max-width: none;
    padding: 0 12px 10px 12px;
  }
  .event-row__assignee {
    flex: 1 1 8rem;
    min-width: 0;
    text-align: left;
  }
  .event-row__countdown {
    margin-left: auto;
  }
}

@media (max-width: 719px) {
  .event-row {
    grid-template-columns: 6px 1fr;
    grid-template-rows: auto auto auto;
    grid-template-areas:
      'bar time'
      'bar body'
      'bar side';
  }
  .event-row__time {
    padding: 10px 12px 6px 12px;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 10px;
  }
  .event-row__body {
    padding: 0 12px 8px 12px;
    min-width: 0;
  }
  .event-row__title {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
    overflow-wrap: anywhere;
  }
  .event-row__side {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: center;
    gap: 6px 10px;
    min-width: 0;
    max-width: none;
    padding: 0 12px 10px 12px;
  }
  .event-row__assignee {
    flex: 1 1 8rem;
    min-width: 0;
    text-align: left;
  }
  .event-row__countdown {
    margin-left: auto;
  }
}

@container event-row (max-width: 380px) {
  .event-row__time {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 380px) {
  .event-row__time {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
