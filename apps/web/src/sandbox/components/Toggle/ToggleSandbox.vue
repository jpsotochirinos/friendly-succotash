<script setup lang="ts">
import { ref } from 'vue';
import Checkbox from 'primevue/checkbox';
import RadioButton from 'primevue/radiobutton';
import InputSwitch from 'primevue/inputswitch';
import ExampleFrame from '../../_shared/ExampleFrame.vue';

const checkSingle = ref(false);
const checkGroup = ref<string[]>([]);
const checkIndeterminate = ref<boolean | null>(null);
const radioRole = ref('representada');
const switchNotif = ref(true);
const switchDraft = ref(false);
const switchDark = ref(false);

const checkCategories = ['Litigio', 'Corporativo', 'Familia', 'Laboral'];

const codeSwitch = `<!-- InputSwitch con label y helper -->
<div class="flex items-start gap-3">
  <InputSwitch v-model="enabled" input-id="sw-notif" />
  <div class="flex flex-col gap-0.5">
    <label for="sw-notif" class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">
      Notificaciones por email
    </label>
    <small class="text-xs" style="color: var(--fg-subtle);">
      Recibe alertas sobre actuaciones y vencimientos.
    </small>
  </div>
</div>`;

const antiPatterns = [
  { bad: 'InputSwitch en form que requiere "Guardar" para aplicar', good: 'Switch solo si el cambio es inmediato (sin botón Guardar). Si necesita confirm → Checkbox.' },
  { bad: 'Checkbox sin label asociado (for/id)', good: 'Siempre <label :for="id"> o :input-id="id" para asociar. Clic en label activa el control.' },
  { bad: 'Grupo de radios sin fieldset/legend', good: 'Envolver en <fieldset> con <legend> para accesibilidad en grupos de radio.' },
  { bad: 'RadioButton de 2 opciones', good: 'Con solo 2 opciones usar InputSwitch (on/off) o SelectButton.' },
];
</script>

<template>
  <div class="flex flex-col gap-10">
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">Componentes / Toggle</p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Checkbox, RadioButton, InputSwitch</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">Controles binarios y de selección. Regla: Switch = cambio inmediato; Checkbox = parte de form con "Guardar"; Radio = una opción exclusiva de ≥ 3.</p>
    </div>

    <!-- Checkbox -->
    <ExampleFrame title="Checkbox — solo y en grupo">
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold" style="color: var(--fg-subtle);">Checkbox único</span>
          <div class="flex items-center gap-2">
            <Checkbox v-model="checkSingle" input-id="chk-single" :binary="true" />
            <label for="chk-single" class="text-[0.8125rem] font-medium cursor-pointer" style="color: var(--fg-default);">
              Marcar como urgente
            </label>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-xs font-semibold" style="color: var(--fg-subtle);">Grupo (filtros de materia)</span>
          <div class="flex flex-wrap gap-4">
            <div v-for="cat in checkCategories" :key="cat" class="flex items-center gap-2">
              <Checkbox :input-id="`chk-${cat}`" v-model="checkGroup" :value="cat" />
              <label :for="`chk-${cat}`" class="text-sm cursor-pointer" style="color: var(--fg-default);">{{ cat }}</label>
            </div>
          </div>
          <small class="text-xs" style="color: var(--fg-subtle);">Seleccionadas: {{ checkGroup.join(', ') || 'ninguna' }}</small>
        </div>
      </div>
    </ExampleFrame>

    <!-- RadioButton -->
    <ExampleFrame title="RadioButton — rol de parte">
      <fieldset class="border-0 m-0 p-0 flex flex-col gap-2">
        <legend class="text-[0.8125rem] font-medium mb-2" style="color: var(--fg-default);">Rol en el expediente</legend>
        <div v-for="role in [{ value: 'representada', label: 'Representada' }, { value: 'contraparte', label: 'Contraparte' }, { value: 'tercero', label: 'Tercero' }]" :key="role.value" class="flex items-center gap-2">
          <RadioButton :input-id="`role-${role.value}`" v-model="radioRole" :value="role.value" />
          <label :for="`role-${role.value}`" class="text-sm cursor-pointer" style="color: var(--fg-default);">{{ role.label }}</label>
        </div>
      </fieldset>
    </ExampleFrame>

    <!-- InputSwitch -->
    <ExampleFrame title="InputSwitch — preferencias de usuario" description="Cambio inmediato sin botón Guardar. Con label izquierdo y helper. Patrón propuesto para Settings." :code="codeSwitch">
      <div class="flex flex-col gap-5">
        <div class="flex items-start gap-3">
          <InputSwitch v-model="switchNotif" input-id="sw-notif" />
          <div class="flex flex-col gap-0.5">
            <label for="sw-notif" class="text-[0.8125rem] font-medium cursor-pointer" style="color: var(--fg-default);">Notificaciones por email</label>
            <small class="text-xs" style="color: var(--fg-subtle);">Recibe alertas sobre actuaciones y vencimientos.</small>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <InputSwitch v-model="switchDraft" input-id="sw-draft" />
          <div class="flex flex-col gap-0.5">
            <label for="sw-draft" class="text-[0.8125rem] font-medium cursor-pointer" style="color: var(--fg-default);">Guardar borrador automáticamente</label>
            <small class="text-xs" style="color: var(--fg-subtle);">Guarda cada 30 segundos mientras redactas.</small>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <InputSwitch v-model="switchDark" input-id="sw-dark" />
          <div class="flex flex-col gap-0.5">
            <label for="sw-dark" class="text-[0.8125rem] font-medium cursor-pointer" style="color: var(--fg-default);">Modo oscuro</label>
            <small class="text-xs" style="color: var(--fg-subtle);">Cambia el tema sin recargar la página.</small>
          </div>
        </div>
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
      <a href="https://primevue.org/checkbox/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> Checkbox</a>
      <span>·</span>
      <a href="https://primevue.org/radiobutton/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> RadioButton</a>
      <span>·</span>
      <a href="https://primevue.org/toggleswitch/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> InputSwitch</a>
    </div>
  </div>
</template>
