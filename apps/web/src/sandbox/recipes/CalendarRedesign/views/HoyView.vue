<script setup lang="ts">
import { computed, ref } from 'vue';
import { ymd, urgencyForActuacion, fmtHora } from '../urgency';
import { displayNameById, USUARIOS, type Actuacion, type Expediente, type SinoePendiente, type Usuario } from '../mocks';
import DayHeader from '../patterns/DayHeader.vue';
import PulseChips, { type PulseChip } from '../patterns/PulseChips.vue';
import EventRow from '../patterns/EventRow.vue';
import SevenDayStrip from '../patterns/SevenDayStrip.vue';
const props = withDefaults(
  defineProps<{
    date: Date;
    scope: 'mine' | 'team';
    actuaciones: Actuacion[];
    sinoe: SinoePendiente[];
    miUsuarioId: string;
    /** Producción: usuarios reales; sandbox: omitir (USUARIOS). */
    usuarios?: Usuario[];
    /** Producción: expedientes para meta en filas; sandbox: omitir. */
    expedientes?: Expediente[];
    /** Si true, no renderiza DayHeader (cabecera del día en el padre, p. ej. PageHeader). */
    hideDayHeader?: boolean;
  }>(),
  { hideDayHeader: false },
);

const usuariosResolved = computed(() => props.usuarios ?? USUARIOS);

const filterChip = ref<string | null>(null);

const dayKey = computed(() => ymd(props.date));

const scoped = computed(() => {
  if (props.scope === 'team') return props.actuaciones;
  return props.actuaciones.filter((a) => a.asignadoId === props.miUsuarioId);
});

const dayActs = computed(() =>
  scoped.value.filter((a) => a.fechaIso.slice(0, 10) === dayKey.value),
);

const venceHoy = computed(
  () =>
    dayActs.value.filter(
      (a) => a.tipo === 'plazo' && a.estado !== 'presentado' && a.estado !== 'cumplido',
    ).length,
);

const proximas48h = computed(() => {
  const start = new Date(props.date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  return scoped.value.filter((a) => {
    const f = new Date(a.fechaIso);
    return a.tipo === 'plazo' && f >= start && f < end;
  }).length;
});

const audiencias = computed(() =>
  dayActs.value.filter((a) => a.tipo === 'audiencia' || a.tipo === 'diligencia'),
);

const audienciaPrimera = computed(() => {
  if (!audiencias.value.length) return undefined;
  const first = [...audiencias.value].sort((a, b) =>
    a.fechaIso.localeCompare(b.fechaIso),
  )[0];
  return first ? fmtHora(new Date(first.fechaIso)) : undefined;
});

const sinoePendientes = computed(() => props.sinoe.length);

const sinAsignar = computed(() => dayActs.value.filter((a) => !a.asignadoId).length);

const chips = computed<PulseChip[]>(() => [
  {
    key: 'venceHoy',
    label: 'vencen hoy',
    count: venceHoy.value,
    variant: 'danger',
    icon: 'pi pi-exclamation-circle',
    forceShow: true,
  },
  {
    key: 'prox48',
    label: 'en 48h',
    count: proximas48h.value,
    variant: 'warn',
    icon: 'pi pi-clock',
  },
  {
    key: 'audiencias',
    label: 'audiencias',
    count: audiencias.value.length,
    variant: 'info',
    icon: 'pi pi-megaphone',
    hint: audienciaPrimera.value ? `desde ${audienciaPrimera.value}` : undefined,
  },
  {
    key: 'sinoe',
    label: 'SINOE sin revisar',
    count: sinoePendientes.value,
    variant: 'info',
    icon: 'pi pi-inbox',
  },
  {
    key: 'sinAsignar',
    label: 'sin asignar',
    count: sinAsignar.value,
    variant: 'mute',
    icon: 'pi pi-user-plus',
  },
]);

const filteredDayActs = computed(() => {
  let list = [...dayActs.value];
  switch (filterChip.value) {
    case 'venceHoy':
      list = list.filter((a) => a.tipo === 'plazo');
      break;
    case 'audiencias':
      list = list.filter((a) => a.tipo === 'audiencia' || a.tipo === 'diligencia');
      break;
    case 'sinAsignar':
      list = list.filter((a) => !a.asignadoId);
      break;
    case 'prox48':
      list = list.filter((a) => a.tipo === 'plazo');
      break;
    case 'sinoe':
    default:
      break;
  }
  return list.sort((a, b) => {
    if (a.horaSignificativa !== b.horaSignificativa) return a.horaSignificativa ? -1 : 1;
    if (a.horaSignificativa) return a.fechaIso.localeCompare(b.fechaIso);
    const pr = (p: Actuacion['prioridad']) => (p === 'urgente' ? 0 : p === 'alta' ? 1 : 2);
    return pr(a.prioridad) - pr(b.prioridad);
  });
});

const sectionTitle = computed(() =>
  props.scope === 'mine' ? 'Mi día' : 'Hoy en el despacho',
);

const stripStart = computed(() => {
  const d = new Date(props.date);
  d.setHours(0, 0, 0, 0);
  return d;
});

const emit = defineEmits<{
  (e: 'open', a: Actuacion): void;
  (e: 'select-day', d: Date): void;
}>();

function asignadoLabel(a: Actuacion) {
  return displayNameById(a.asignadoId, usuariosResolved.value);
}

function levelOf(a: Actuacion) {
  return urgencyForActuacion(a.tipo, new Date(a.fechaIso), a.estado);
}

void levelOf; // avoid unused warning
</script>

<template>
  <section class="hoy">
    <DayHeader v-if="!hideDayHeader" :scope="scope" />
    <PulseChips :chips="chips" :active="filterChip" @select="(k) => (filterChip = k)" />

    <div class="hoy__section">
      <header class="hoy__section-head">
        <span class="hoy__section-eyebrow">{{ sectionTitle }}</span>
        <span class="hoy__section-meta">
          {{ filteredDayActs.length }} actuación{{ filteredDayActs.length === 1 ? '' : 'es' }}
        </span>
      </header>
      <div v-if="filteredDayActs.length" class="hoy__list">
        <EventRow
          v-for="a in filteredDayActs"
          :key="a.id"
          :actuacion="a"
          :asignado-label="asignadoLabel(a)"
          :now="date"
          :expedientes="expedientes"
          @open="(act) => emit('open', act)"
        />
      </div>
      <div v-else class="hoy__empty">
        <i class="pi pi-inbox" aria-hidden="true" />
        <div>
          <p class="hoy__empty-title">
            {{
              scope === 'mine'
                ? 'No tienes actuaciones para hoy.'
                : 'El despacho no tiene actuaciones programadas hoy.'
            }}
          </p>
          <p class="hoy__empty-sub">
            Revisa tu bandeja SINOE o consulta los próximos 7 días.
          </p>
        </div>
      </div>
    </div>

    <div class="hoy__section">
      <header class="hoy__section-head">
        <span class="hoy__section-eyebrow">Próximos 7 días</span>
        <span class="hoy__section-meta">incluye días no hábiles</span>
      </header>
      <SevenDayStrip
        :start-date="stripStart"
        :actuaciones="scoped"
        @select-day="(d) => emit('select-day', d)"
      />
    </div>
  </section>
</template>

<style scoped>
.hoy {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.hoy__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hoy__section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px;
}
.hoy__section-eyebrow {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-muted);
}
.hoy__section-meta {
  font-size: 11px;
  color: var(--fg-subtle);
}
.hoy__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.hoy__empty {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px 18px;
  border-radius: 8px;
  background: var(--surface-raised);
  border: 1px dashed var(--surface-border-strong);
  color: var(--fg-muted);
}
.hoy__empty i { font-size: 22px; color: var(--fg-subtle); }
.hoy__empty-title { margin: 0; font-size: 13px; font-weight: 600; color: var(--fg-default); }
.hoy__empty-sub { margin: 2px 0 0; font-size: 12px; color: var(--fg-muted); }
</style>
