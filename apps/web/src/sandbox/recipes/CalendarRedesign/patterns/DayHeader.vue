<script setup lang="ts">
import { computed, onBeforeMount, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { fmtFechaLarga, isDiaHabil, getFeriado, isWeekend } from '../urgency';

const props = defineProps<{
  scope: 'mine' | 'team';
}>();

const { t, locale } = useI18n();

/** Hora local del “ahora” (día de hoy), independiente del día mostrado en el calendario. */
const nowTime = ref('');
const nowIso = ref('');
let clockTimer: ReturnType<typeof setInterval> | undefined;

const clockLocaleTag = computed(() => (String(locale.value).toLowerCase().startsWith('en') ? 'en-GB' : 'es-PE'));

/** Ancla de reloj: al actualizarse, refresca hora y fecha larga del título (día local actual). */
const clockNow = ref(new Date());

const fechaHoy = computed(() => {
  const d = clockNow.value;
  return fmtFechaLarga(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
});

function tickClock() {
  clockNow.value = new Date();
  const d = clockNow.value;
  nowIso.value = d.toISOString();
  nowTime.value = new Intl.DateTimeFormat(clockLocaleTag.value, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

onBeforeMount(() => {
  tickClock();
});

onMounted(() => {
  clockTimer = setInterval(tickClock, 1000);
});

onUnmounted(() => {
  if (clockTimer !== undefined) clearInterval(clockTimer);
});

const semana = computed(() => {
  const d = clockNow.value;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const start = new Date(day.getFullYear(), 0, 1);
  const days = Math.floor((day.getTime() - start.getTime()) / 86_400_000);
  return Math.ceil((days + start.getDay() + 1) / 7);
});

const tipoDia = computed(() => {
  const d = clockNow.value;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const f = getFeriado(day);
  if (f) return { kind: 'feriado' as const, label: f.nombre };
  if (isWeekend(day)) return { kind: 'weekend' as const, label: 'no laborable' };
  if (isDiaHabil(day)) return { kind: 'habil' as const, label: 'día hábil judicial' };
  return { kind: 'inhabil' as const, label: 'día no hábil' };
});

const subtitulo = computed(() =>
  props.scope === 'mine'
    ? 'Tus actuaciones y plazos.'
    : 'Todas las actuaciones del despacho, por expediente.',
);

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLocaleUpperCase('es') + s.slice(1);
}
</script>

<template>
  <header class="day-header">
    <p class="day-header__eyebrow">{{ subtitulo }}</p>
    <h1 class="day-header__title">
      <span class="day-header__title-date">{{ fechaHoy }}</span>
      <span class="day-header__title-now">
        <time
          class="day-header__title-time"
          :datetime="nowIso"
          :aria-label="`${t('globalCalendar.dayHeaderLocalTimeAria')}: ${nowTime}`"
        >
          {{ nowTime }}
        </time>
      </span>
    </h1>
    <p class="day-header__meta">
      <span v-if="tipoDia.kind === 'feriado'" class="day-header__pill day-header__pill--warn">
        <i class="pi pi-flag-fill" aria-hidden="true" />
        Feriado · plazos no corren · {{ tipoDia.label }}
      </span>
      <span v-else-if="tipoDia.kind === 'weekend'" class="day-header__pill day-header__pill--mute">
        <i class="pi pi-moon" aria-hidden="true" />
        {{ capitalizeFirst(tipoDia.label) }}
      </span>
      <span v-else class="day-header__meta-text">
        {{ capitalizeFirst(tipoDia.label) }} · semana {{ semana }}
      </span>
    </p>
  </header>
</template>

<style scoped>
.day-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.day-header__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-subtle);
}
.day-header__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--fg-default);
  line-height: 1.2;
  text-transform: capitalize;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 0.35rem;
  row-gap: 0.15rem;
}
.day-header__title-date {
  text-transform: capitalize;
}
.day-header__title-now {
  display: inline-flex;
  align-items: baseline;
  font-weight: 600;
  text-transform: none;
}
.day-header__title-time {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  color: var(--fg-muted);
  font-size: 0.82em;
  font-weight: 600;
}
.day-header__meta {
  margin: 0;
  font-size: 12px;
  line-height: 1.25;
  color: var(--fg-muted);
  display: inline-flex;
  align-items: center;
  min-height: 24px;
}
.day-header__meta-text {
  font-weight: 500;
  display: inline-flex;
  align-items: center;
}
.day-header__pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: inherit;
  font-weight: 600;
  line-height: inherit;
  border: 1px solid transparent;
  box-sizing: border-box;
}
.day-header__pill--warn {
  background: rgba(217,119,6,0.10);
  color: #6d3f06;
  border-color: rgba(217,119,6,0.22);
}
.day-header__pill--mute {
  background: var(--surface-sunken);
  color: var(--fg-muted);
  border-color: var(--surface-border);
}
.day-header__pill i {
  font-size: 0.875rem;
  line-height: 1;
}
</style>
