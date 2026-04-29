<script setup lang="ts">
import { ref } from 'vue';
import Calendar from 'primevue/calendar';
import ExampleFrame from '../../_shared/ExampleFrame.vue';

const singleDate = ref<Date | null>(null);
const dateRange = ref<Date[] | null>(null);
const dateTime = ref<Date | null>(null);
const inlineDate = ref<Date>(new Date());

const codeCalendar = `<!-- Single date con locale es/PE -->
<Calendar
  v-model="dueDate"
  date-format="dd/mm/yy"
  :placeholder="t('trackables.matterDialog.placeholderDate')"
  show-icon
/>

<!-- Restricciones de fecha -->
<Calendar
  v-model="deadline"
  date-format="dd/mm/yy"
  :min-date="new Date()"
  :disabled-days="[0, 6]"
  show-icon
/>`;

const antiPatterns = [
  { bad: 'Calendar sin show-icon en formularios', good: 'show-icon siempre en formularios para trigger accesible.' },
  { bad: 'date-format="mm/dd/yy" (formato US)', good: 'date-format="dd/mm/yy" para locale PE/ES.' },
  { bad: 'Calendar sin min-date cuando el campo es "fecha límite futura"', good: ':min-date="new Date()" para impedir seleccionar fechas pasadas en campos de plazo.' },
  { bad: 'Calendar time sin step claro', good: 'hour-format="12" y :step-minute="15" o "30" para usabilidad.' },
];
</script>

<template>
  <div class="flex flex-col gap-10">
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">Componentes / Calendar</p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Calendar / DatePicker</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">Selector de fecha y hora. Siempre date-format="dd/mm/yy" (formato PE/ES), show-icon y localización ES configurada en main.ts.</p>
    </div>

    <!-- Single date -->
    <ExampleFrame title="Fecha única — campo estándar" description="date-format dd/mm/yy + show-icon. Patrón de campo 'Fecha límite' en dialog de expediente." :code="codeCalendar">
      <div class="flex flex-col gap-1">
        <label class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Fecha límite</label>
        <Calendar v-model="singleDate" date-format="dd/mm/yy" placeholder="dd/mm/aaaa" show-icon />
        <small class="text-xs" style="color: var(--fg-subtle);">Las actuaciones tienen su propia fecha.</small>
      </div>
    </ExampleFrame>

    <!-- Con restricciones -->
    <ExampleFrame title="Fecha con restricciones" description=":min-date=new Date() para impedir fechas pasadas. :disabled-days=[0,6] para excluir fines de semana.">
      <div class="flex flex-col gap-1">
        <label class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Próxima audiencia (días hábiles)</label>
        <Calendar
          v-model="singleDate"
          date-format="dd/mm/yy"
          placeholder="dd/mm/aaaa"
          :min-date="new Date()"
          :disabled-days="[0, 6]"
          show-icon
        />
        <small class="text-xs" style="color: var(--fg-subtle);">No se pueden seleccionar fechas pasadas ni fines de semana.</small>
      </div>
    </ExampleFrame>

    <!-- Rango de fechas -->
    <ExampleFrame title="Rango de fechas" description="selection-mode=range para seleccionar inicio y fin en una sola interacción.">
      <div class="flex flex-col gap-1">
        <label class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Período de búsqueda</label>
        <Calendar v-model="dateRange" selection-mode="range" date-format="dd/mm/yy" placeholder="dd/mm/aaaa – dd/mm/aaaa" show-icon />
        <small class="text-xs" style="color: var(--fg-subtle);">Filtra expedientes creados en este período.</small>
      </div>
    </ExampleFrame>

    <!-- Fecha + hora -->
    <ExampleFrame title="Fecha y hora — audiencias y eventos">
      <div class="flex flex-col gap-1">
        <label class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Fecha y hora de audiencia</label>
        <Calendar v-model="dateTime" date-format="dd/mm/yy" placeholder="dd/mm/aaaa HH:mm" :show-time="true" hour-format="24" :step-minute="15" show-icon />
        <small class="text-xs" style="color: var(--fg-subtle);">Paso de 15 minutos para audiencias.</small>
      </div>
    </ExampleFrame>

    <!-- Inline -->
    <ExampleFrame title="Inline calendar (vista de mes)" description="Para widgets de calendario en dashboard. Sin show-icon. :inline=true.">
      <div class="flex justify-center">
        <Calendar v-model="inlineDate" :inline="true" date-format="dd/mm/yy" />
      </div>
    </ExampleFrame>

    <!-- Anti-patterns -->
    <div class="flex flex-col gap-3">
      <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">Anti-patrones</h2>
      <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--surface-border);">
        <table class="w-full text-xs">
          <thead><tr style="background: var(--surface-sunken); border-bottom: 1px solid var(--surface-border);"><th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Anti-patrón</th><th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Corrección</th></tr></thead>
          <tbody>
            <tr v-for="(row, i) in antiPatterns" :key="i" style="border-bottom: 1px solid var(--surface-border);">
              <td class="px-4 py-2.5" style="color: #dc2626;">{{ row.bad }}</td>
              <td class="px-4 py-2.5" style="color: var(--fg-default);">{{ row.good }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <a href="https://primevue.org/datepicker/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> Calendar/DatePicker</a>
    </div>
  </div>
</template>
