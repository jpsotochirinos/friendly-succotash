<script setup lang="ts">
import { computed } from 'vue';
import {
  ymd,
  isWeekend,
  getFeriado,
  fmtHora,
  urgencyForActuacion,
  URGENCY_TOKENS,
  type UrgencyLevel,
} from '../urgency';
import { displayNameById, USUARIOS, EXPEDIENTES, findExpediente, type Actuacion, type Expediente, type Usuario } from '../mocks';

const props = withDefaults(
  defineProps<{
    startDate: Date;
    actuaciones: Actuacion[];
    expedientes?: Expediente[];
    usuarios?: Usuario[];
  }>(),
  {},
);

const expedientesResolved = computed(() => props.expedientes ?? EXPEDIENTES);
const usuariosResolved = computed(() => props.usuarios ?? USUARIOS);

function expFor(id: string) {
  return expedientesResolved.value.find((e) => e.id === id) ?? findExpediente(id);
}

const emit = defineEmits<{ (e: 'select', a: Actuacion): void }>();

const today = new Date();
today.setHours(0, 0, 0, 0);

const days = computed(() => {
  const monday = new Date(props.startDate);
  const dow = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - dow);
  monday.setHours(0, 0, 0, 0);

  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const key = ymd(d);
    const dayActs = props.actuaciones.filter((a) => a.fechaIso.slice(0, 10) === key);
    const audiencias = dayActs
      .filter((a) => a.tipo === 'audiencia' || a.tipo === 'diligencia')
      .sort((a, b) => a.fechaIso.localeCompare(b.fechaIso));
    const plazos = dayActs
      .filter((a) => a.tipo === 'plazo')
      .sort((a, b) => {
        const pr = (p: Actuacion['prioridad']) =>
          p === 'urgente' ? 0 : p === 'alta' ? 1 : 2;
        return pr(a.prioridad) - pr(b.prioridad);
      });
    const f = getFeriado(d);
    out.push({
      date: d,
      key,
      isToday: ymd(d) === ymd(today),
      isWeekend: isWeekend(d),
      feriado: f ? f.nombre : null,
      audiencias,
      plazos,
      total: dayActs.length,
    });
  }
  return out;
});

function levelOf(a: Actuacion): UrgencyLevel {
  return urgencyForActuacion(a.tipo, new Date(a.fechaIso), a.estado);
}
</script>

<template>
  <section class="wk">
    <div class="wk__grid">
      <div
        v-for="day in days"
        :key="day.key"
        class="wk__col"
        :class="{
          'wk__col--feriado': !!day.feriado,
          'wk__col--weekend': day.isWeekend && !day.feriado,
        }"
      >
        <header class="wk__head" :class="{ 'wk__head--today': day.isToday }">
          <span class="wk__dow">
            {{ day.date.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '') }}
          </span>
          <div class="wk__numline">
            <span class="wk__num">{{ day.date.getDate() }}</span>
            <span v-if="day.feriado" class="wk__feriado">{{ day.feriado }}</span>
          </div>
        </header>

        <div class="wk__section">
          <span class="wk__section-label">Hora fija</span>
          <button
            v-for="a in day.audiencias"
            :key="a.id"
            type="button"
            class="wk__event"
            :style="{
              background: URGENCY_TOKENS[levelOf(a)].bg,
              borderLeftColor: URGENCY_TOKENS[levelOf(a)].bar,
              color: URGENCY_TOKENS[levelOf(a)].text,
            }"
            @click="emit('select', a)"
          >
            <span class="wk__time">{{ fmtHora(new Date(a.fechaIso)) }}</span>
            <span class="wk__title">{{ a.titulo }}</span>
            <span class="wk__exp">
              {{ expFor(a.expedienteId)?.numero }} · {{ displayNameById(a.asignadoId, usuariosResolved) }}
            </span>
          </button>
          <span v-if="!day.audiencias.length" class="wk__empty">—</span>
        </div>

        <div class="wk__section">
          <span class="wk__section-label">Plazos · 23:59</span>
          <button
            v-for="a in day.plazos"
            :key="a.id"
            type="button"
            class="wk__event"
            :style="{
              background: URGENCY_TOKENS[levelOf(a)].bg,
              borderLeftColor: URGENCY_TOKENS[levelOf(a)].bar,
              color: URGENCY_TOKENS[levelOf(a)].text,
            }"
            @click="emit('select', a)"
          >
            <span class="wk__title">{{ a.titulo }}</span>
            <span class="wk__exp">
              {{ expFor(a.expedienteId)?.numero }} · {{ displayNameById(a.asignadoId, usuariosResolved) }}
            </span>
          </button>
          <span v-if="!day.plazos.length" class="wk__empty">—</span>
        </div>

        <footer class="wk__foot">
          <template v-if="day.feriado">feriado</template>
          <template v-else-if="day.isWeekend && day.total === 0">no laborable</template>
          <template v-else-if="day.total === 0">sin actividad</template>
          <template v-else>
            {{ day.plazos.length }} plazos · {{ day.audiencias.length }} aud.
          </template>
        </footer>
      </div>
    </div>
  </section>
</template>

<style scoped>
.wk {
  background: var(--surface-raised);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow-x: auto;
  overflow-y: hidden;
}
.wk__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(8.75rem, 1fr));
  min-width: min(100%, 61.25rem);
  min-height: clamp(26rem, 58vh, 42rem);
}
.wk__col {
  border-right: 1px solid var(--surface-border);
  display: flex;
  flex-direction: column;
}
.wk__col:last-child { border-right: none; }
.wk__col--weekend, .wk__col--feriado { background: var(--surface-sunken); }

.wk__head {
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--surface-border);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.wk__head--today { background: var(--accent-soft); }
.wk__dow {
  font-size: 10px;
  font-weight: 700;
  color: var(--fg-subtle);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.wk__numline {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.wk__num {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 700;
  font-feature-settings: 'tnum' 1;
  color: var(--fg-default);
  letter-spacing: -0.01em;
  line-height: 1;
}
.wk__head--today .wk__num { color: var(--brand-zafiro); }
.wk__feriado {
  min-width: 0;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6d3f06;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wk__section {
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.wk__section + .wk__section { border-top: 1px dashed var(--surface-border); }
.wk__section-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-subtle);
  padding: 0 2px;
}
.wk__event {
  text-align: left;
  background: var(--surface-app);
  border: none;
  border-left: 3px solid var(--fg-subtle);
  padding: 5px 7px;
  border-radius: 3px;
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.wk__time { font-weight: 700; font-size: 10px; font-feature-settings: 'tnum' 1; }
.wk__title { font-weight: 600; }
.wk__exp {
  font-size: 10px;
  opacity: 0.8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wk__empty {
  font-size: 10px;
  font-style: italic;
  color: var(--fg-subtle);
  padding: 0 2px;
}
.wk__foot {
  margin-top: auto;
  padding: 6px 10px 8px;
  border-top: 1px dashed var(--surface-border);
  font-size: 10px;
  color: var(--fg-muted);
}
</style>
