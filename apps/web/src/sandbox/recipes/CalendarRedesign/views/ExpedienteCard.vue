<script setup lang="ts">
import { computed } from 'vue';
import {
  fmtRelativo,
  urgencyForActuacion,
  URGENCY_TOKENS,
  type UrgencyLevel,
} from '../urgency';
import {
  type Actuacion,
  type Expediente,
  MATERIA_LABEL,
  displayNameById,
  USUARIOS,
  type Usuario,
} from '../mocks';
import CaseKey from '../atoms/CaseKey.vue';
import AssigneeAvatar from '../atoms/AssigneeAvatar.vue';

const props = withDefaults(
  defineProps<{
    expediente: Expediente;
    actuaciones: Actuacion[];
    usuarios?: Usuario[];
  }>(),
  {},
);

const usuariosResolved = computed(() => props.usuarios ?? USUARIOS);

const emit = defineEmits<{
  (e: 'open', a: Actuacion): void;
  (e: 'add', exp: Expediente): void;
}>();

const proximas = computed(() =>
  [...props.actuaciones]
    .filter((a) => a.estado !== 'cumplido' && a.estado !== 'presentado')
    .sort((a, b) => a.fechaIso.localeCompare(b.fechaIso))
    .slice(0, 5),
);

const proxLevel = computed<UrgencyLevel | null>(() => {
  if (!proximas.value.length) return null;
  const a = proximas.value[0];
  return urgencyForActuacion(a.tipo, new Date(a.fechaIso), a.estado);
});

const tone = computed<'crit' | 'warn' | 'ok' | 'idle'>(() => {
  if (!proxLevel.value) return 'idle';
  if (proxLevel.value === 'overdue' || proxLevel.value === 'urgent') return 'crit';
  if (proxLevel.value === 'warn') return 'warn';
  return 'ok';
});

const responsable = computed(() => {
  if (props.expediente.responsableId) {
    return displayNameById(props.expediente.responsableId, usuariosResolved.value);
  }
  const acts = [...props.actuaciones].sort((a, b) => a.fechaIso.localeCompare(b.fechaIso));
  const nextOpen = acts.find((a) => a.estado !== 'cumplido' && a.estado !== 'presentado');
  if (nextOpen?.asignadoId) {
    return displayNameById(nextOpen.asignadoId, usuariosResolved.value);
  }
  const anyAssigned = acts.find((a) => a.asignadoId);
  if (anyAssigned?.asignadoId) {
    return displayNameById(anyAssigned.asignadoId, usuariosResolved.value);
  }
  return displayNameById(null, usuariosResolved.value);
});

function levelOf(a: Actuacion): UrgencyLevel {
  return urgencyForActuacion(a.tipo, new Date(a.fechaIso), a.estado);
}

const totals = computed(() => {
  const all = props.actuaciones;
  const proxs = proximas.value.length;
  const aud = all.filter((a) => a.tipo === 'audiencia' || a.tipo === 'diligencia').length;
  const plz = all.filter((a) => a.tipo === 'plazo').length;
  return { proxs, aud, plz };
});
</script>

<template>
  <article
    class="exp-card"
    :class="`exp-card--${tone}`"
  >
    <header class="exp-card__head">
      <div class="exp-card__title-row">
        <h3 class="exp-card__title">{{ expediente.caratula }}</h3>
        <CaseKey :value="expediente.numero" size="md" />
        <span class="exp-card__tag">{{ MATERIA_LABEL[expediente.materia] }}</span>
      </div>
      <div class="exp-card__meta">
        <span>{{ expediente.organo }}</span>
        <span class="exp-card__sep">·</span>
        <span>{{ expediente.cliente }}</span>
        <span class="exp-card__sep">·</span>
        <span class="exp-card__resp">
          <AssigneeAvatar :name="responsable === 'Sin asignar' ? null : responsable" :size="18" />
          <span>{{ responsable }}</span>
        </span>
      </div>
      <div class="exp-card__status-row">
        <span class="exp-card__status" :class="`exp-card__status--${tone}`">
          <template v-if="tone === 'crit'">Acción inmediata</template>
          <template v-else-if="tone === 'warn'">Vence pronto</template>
          <template v-else-if="tone === 'ok'">Al día</template>
          <template v-else>Sin actividad programada · verificar</template>
        </span>
      </div>
    </header>

    <div class="exp-card__timeline">
      <div class="exp-card__rail">
        <span class="exp-card__line" />
        <span class="exp-card__now">
          <span class="exp-card__now-label">HOY</span>
        </span>
        <button
          v-for="(a, i) in proximas"
          :key="a.id"
          type="button"
          class="exp-card__mark"
          :class="i % 2 === 0 ? '' : 'exp-card__mark--below'"
          :style="{
            left: `${10 + (i + 1) * (78 / Math.max(1, proximas.length))}%`,
            color: URGENCY_TOKENS[levelOf(a)].bar,
          }"
          @click="emit('open', a)"
        >
          <span class="exp-card__label">
            <span class="exp-card__lbl-date">{{ fmtRelativo(new Date(a.fechaIso)) }}</span>
            <span class="exp-card__lbl-type">{{ a.titulo }}</span>
          </span>
          <span class="exp-card__dot" :style="{ background: URGENCY_TOKENS[levelOf(a)].bar }" />
        </button>
        <p v-if="!proximas.length" class="exp-card__empty">
          Sin actuaciones programadas — verificar bandeja SINOE.
        </p>
      </div>
    </div>

    <footer class="exp-card__foot">
      <span class="exp-card__foot-item">
        <i class="pi pi-flag" /> Próximas <strong>{{ totals.proxs }}</strong>
      </span>
      <span class="exp-card__foot-item">
        <i class="pi pi-megaphone" /> Audiencias <strong>{{ totals.aud }}</strong>
      </span>
      <span class="exp-card__foot-item">
        <i class="pi pi-clock" /> Plazos <strong>{{ totals.plz }}</strong>
      </span>
      <span v-if="expediente.ultimoSinoe" class="exp-card__sinoe">
        <i class="pi pi-inbox" /> SINOE {{ expediente.ultimoSinoe.fecha }} · {{ expediente.ultimoSinoe.resumen }}
      </span>
      <button class="exp-card__add" type="button" @click="emit('add', expediente)">
        <i class="pi pi-plus" /> Agregar actuación
      </button>
    </footer>
  </article>
</template>

<style scoped>
.exp-card {
  background: var(--surface-raised);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.12s ease;
}
.exp-card:hover { border-color: var(--surface-border-strong); }

.exp-card--crit { border-left: 4px solid #dc2626; }
.exp-card--warn { border-left: 4px solid #d97706; }
.exp-card--ok { border-left: 4px solid #0ca678; }
.exp-card--idle { border-left: 4px solid var(--fg-subtle); }

.exp-card__head {
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--surface-border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.exp-card__title-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.exp-card__title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--fg-default);
}
.exp-card__tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 3px;
  background: var(--surface-sunken);
  color: var(--fg-muted);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.exp-card__meta {
  font-size: 12px;
  color: var(--fg-muted);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.exp-card__sep { color: var(--surface-border-strong); }
.exp-card__resp { display: inline-flex; align-items: center; gap: 6px; }

.exp-card__status-row { margin-top: 2px; }
.exp-card__status {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 3px 9px;
  border-radius: 3px;
}
.exp-card__status--crit { background: rgba(220,38,38,0.12); color: #7a1f19; }
.exp-card__status--warn { background: rgba(217,119,6,0.12); color: #6d3f06; }
.exp-card__status--ok { background: rgba(12,166,120,0.12); color: #1c4023; }
.exp-card__status--idle { background: var(--surface-sunken); color: var(--fg-muted); }

.exp-card__timeline {
  padding: 18px 18px 26px;
  overflow-x: auto;
}
.exp-card__rail {
  position: relative;
  height: 80px;
  margin: 0 8px;
  min-width: 480px;
}
.exp-card__line {
  position: absolute;
  top: 38px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--surface-border);
}
.exp-card__now {
  position: absolute;
  top: 28px;
  left: 8%;
  width: 2px;
  height: 22px;
  background: var(--brand-zafiro);
  z-index: 2;
}
.exp-card__now-label {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  font-weight: 800;
  color: var(--brand-zafiro);
  letter-spacing: 0.08em;
  white-space: nowrap;
}
.exp-card__mark {
  position: absolute;
  top: 32px;
  background: transparent;
  border: none;
  cursor: pointer;
  transform: translateX(-50%);
  font-family: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.exp-card__mark--below { top: 36px; flex-direction: column-reverse; }
.exp-card__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--fg-subtle);
  border: 2px solid var(--surface-raised);
  box-shadow: 0 0 0 1px var(--surface-border);
}
.exp-card__label {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 10px;
  text-align: center;
  white-space: nowrap;
  color: var(--fg-default);
}
.exp-card__lbl-date {
  font-weight: 700;
  font-feature-settings: 'tnum' 1;
}
.exp-card__lbl-type {
  font-size: 9px;
  text-transform: uppercase;
  color: var(--fg-muted);
  letter-spacing: 0.04em;
  font-weight: 600;
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.exp-card__empty {
  margin: 0;
  padding-top: 32px;
  font-size: 12px;
  color: var(--fg-muted);
  font-style: italic;
  text-align: center;
}

.exp-card__foot {
  padding: 8px 16px;
  background: var(--surface-sunken);
  border-top: 1px solid var(--surface-border);
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 11px;
  color: var(--fg-muted);
  align-items: center;
}
.exp-card__foot-item { display: inline-flex; align-items: center; gap: 5px; }
.exp-card__foot-item strong { color: var(--fg-default); font-feature-settings: 'tnum' 1; }
.exp-card__sinoe {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--fg-muted);
}
.exp-card__add {
  margin-left: auto;
  background: var(--surface-raised);
  border: 1px solid var(--surface-border);
  color: var(--fg-default);
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.exp-card__add:hover { background: var(--surface-sunken); }
</style>
