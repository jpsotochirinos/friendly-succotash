<script setup lang="ts">
import { ref } from 'vue';
import Dropdown from 'primevue/dropdown';
import MultiSelect from 'primevue/multiselect';
import ExampleFrame from '../../_shared/ExampleFrame.vue';

const selected = ref<string | null>(null);
const selectedMatter = ref<string | null>(null);
const selectedAssignee = ref<string | null>(null);
const selectedTags = ref<string[]>([]);

const typeOptions = [
  { label: 'Caso', value: 'caso' },
  { label: 'Proceso', value: 'proceso' },
  { label: 'Proyecto', value: 'proyecto' },
  { label: 'Auditoría', value: 'auditoria' },
];

const matterTypeOptions = [
  { label: 'Litigio', value: 'litigio' },
  { label: 'Corporativo', value: 'corporativo' },
  { label: 'Familia', value: 'familia' },
  { label: 'Laboral', value: 'laboral' },
  { label: 'Constitucional', value: 'constitucional' },
];

const users = [
  { id: 'u1', name: 'Carlos Mendoza', initials: 'CM', color: '#3b5bdb' },
  { id: 'u2', name: 'Ana Torres', initials: 'AT', color: '#0ca678' },
  { id: 'u3', name: 'Luis Paredes', initials: 'LP', color: '#e67700' },
  { id: 'u4', name: 'Sofía Vega', initials: 'SV', color: '#862e9c' },
];

const userOptions = users.map(u => ({ label: u.name, value: u.id, ...u }));

const tagOptions = [
  { label: 'Urgente', value: 'urgente' },
  { label: 'Revisión pendiente', value: 'revision' },
  { label: 'Audiencia próxima', value: 'audiencia' },
  { label: 'Documentación incompleta', value: 'docs' },
  { label: 'Cliente VIP', value: 'vip' },
];

const clientOptions = [
  { id: 'c1', name: 'Grupo Andino S.A.C.' },
  { id: 'c2', name: 'García Hermanos E.I.R.L.' },
  { id: 'c3', name: 'María del Carmen Quispe' },
  { id: 'c4', name: 'Constructora Lima Norte S.A.' },
  { id: 'c5', name: 'Textiles del Sur S.R.L.' },
];
const selectedClient = ref<string | null>(null);

const codeDropdown = `<!-- Dropdown simple con show-clear -->
<Dropdown
  v-model="selected"
  :options="typeOptions"
  option-label="label"
  option-value="value"
  placeholder="Seleccionar tipo"
  show-clear
/>

<!-- Con filter (para listas largas) -->
<Dropdown
  v-model="selected"
  :options="clients"
  option-label="name"
  option-value="id"
  placeholder="Seleccionar cliente"
  filter
  show-clear
/>`;

const codeDropdownAvatar = `<!-- Dropdown con avatar en opción (abogado asignado) -->
<Dropdown
  v-model="assigneeId"
  :options="userOptions"
  option-label="name"
  option-value="id"
  placeholder="Sin asignar"
  show-clear
>
  <template #option="{ option }">
    <div class="flex items-center gap-2">
      <div
        class="w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-semibold"
        :style="{ background: option.color }"
      >{{ option.initials }}</div>
      <span>{{ option.name }}</span>
    </div>
  </template>
  <template #value="{ value }">
    <div v-if="value" class="flex items-center gap-2">
      <div
        class="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-semibold"
        :style="{ background: userOptions.find(u => u.value === value)?.color }"
      >{{ userOptions.find(u => u.value === value)?.initials }}</div>
      <span>{{ userOptions.find(u => u.value === value)?.name }}</span>
    </div>
  </template>
</Dropdown>`;

const antiPatterns = [
  { bad: 'Dropdown con < 3 opciones', good: 'Menos de 3 opciones → usar SelectButton (ver /sandbox/components/selectbutton-toggle).' },
  { bad: 'Dropdown sin placeholder', good: 'Siempre placeholder descriptivo. Nunca vacío.' },
  { bad: 'Dropdown opcional sin show-clear', good: 'show-clear si el campo es opcional. El usuario necesita poder deseleccionar.' },
  { bad: 'option-label sin option-value en lista de objetos', good: 'Siempre ambos: option-label para la etiqueta visible, option-value para el valor real (id).' },
  { bad: 'Dropdown con > 100 opciones sin filter', good: 'filter obligatorio para > 20 opciones. Para > 200 opciones, usar InputText con autocomplete remoto.' },
];
</script>

<template>
  <div class="flex flex-col gap-10">
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">Componentes / Select</p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Dropdown / Select, MultiSelect</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">Selección de una o múltiples opciones. Regla: siempre placeholder + show-clear cuando es opcional + filter cuando > 20 opciones.</p>
    </div>

    <!-- Dropdown simple -->
    <ExampleFrame title="Dropdown simple" description="Uso básico con option-label/option-value y show-clear." :code="codeDropdown">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Tipo de seguimiento <span style="color: #dc2626;">*</span></label>
          <Dropdown v-model="selected" :options="typeOptions" option-label="label" option-value="value" placeholder="Seleccionar tipo" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Materia</label>
          <Dropdown v-model="selectedMatter" :options="matterTypeOptions" option-label="label" option-value="value" placeholder="Seleccionar materia" show-clear />
        </div>
      </div>
    </ExampleFrame>

    <!-- Dropdown con filter (clientes) -->
    <ExampleFrame title="Dropdown con filter — clientes" description="filter + show-clear para listas medianas (5-50 opciones). Patrón de campo de cliente en dialog.">
      <div class="flex flex-col gap-1">
        <label class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Cliente representado</label>
        <Dropdown v-model="selectedClient" :options="clientOptions" option-label="name" option-value="id" placeholder="Buscar cliente…" filter show-clear />
        <small class="text-xs" style="color: var(--fg-subtle);">Opcional. Podrás vincularlo después desde el detalle.</small>
      </div>
    </ExampleFrame>

    <!-- Dropdown con avatar en opción -->
    <ExampleFrame title="Dropdown con avatar — abogado asignado" description="Slot custom #option y #value para mostrar avatar + nombre. Patrón en toolbar de filtros y formularios." :code="codeDropdownAvatar">
      <div class="flex flex-col gap-1">
        <label class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Abogado asignado</label>
        <Dropdown v-model="selectedAssignee" :options="userOptions" option-label="name" option-value="id" placeholder="Sin asignar" show-clear>
          <template #option="{ option }">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0" :style="{ background: option.color }">{{ option.initials }}</div>
              <span>{{ option.name }}</span>
            </div>
          </template>
          <template #value="{ value }">
            <div v-if="value" class="flex items-center gap-2">
              <div class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0" :style="{ background: userOptions.find(u => u.value === value)?.color }">{{ userOptions.find(u => u.value === value)?.initials }}</div>
              <span>{{ userOptions.find(u => u.value === value)?.name }}</span>
            </div>
            <span v-else style="color: var(--fg-subtle);">Sin asignar</span>
          </template>
        </Dropdown>
      </div>
    </ExampleFrame>

    <!-- MultiSelect -->
    <ExampleFrame title="MultiSelect — etiquetas y equipo" description="Selección múltiple con chips visuales. Usar para etiquetas, equipos, categorías.">
      <div class="flex flex-col gap-1">
        <label class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Etiquetas del expediente</label>
        <MultiSelect v-model="selectedTags" :options="tagOptions" option-label="label" option-value="value" placeholder="Seleccionar etiquetas…" display="chip" filter />
        <small class="text-xs" style="color: var(--fg-subtle);">Opcional. Visible en la vista de lista.</small>
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
      <a href="https://primevue.org/select/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> Dropdown/Select</a>
      <span>·</span>
      <a href="https://primevue.org/multiselect/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> MultiSelect</a>
    </div>
  </div>
</template>
