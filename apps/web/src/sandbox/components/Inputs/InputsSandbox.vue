<script setup lang="ts">
import { ref } from 'vue';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputGroup from 'primevue/inputgroup';
import InputGroupAddon from 'primevue/inputgroupaddon';
import Button from 'primevue/button';
import ExampleFrame from '../../_shared/ExampleFrame.vue';
import { useToast } from 'primevue/usetoast';
import CalendarToolbarSearch from '@/views/calendar/components/CalendarToolbarSearch.vue';

const toast = useToast();
const title = ref('');
const titleError = ref('');
const caseNumber = ref('');
const description = ref('');
const searchQuery = ref('');

function validateTitle() {
  titleError.value = title.value.trim() ? '' : 'El título es obligatorio.';
}

function copyCase() {
  navigator.clipboard.writeText(caseNumber.value || '01234-2024-0-1801-JR-CI-05');
  toast.add({ severity: 'success', summary: 'Copiado', life: 2000 });
}

const codeIconField = `<!-- Buscador con icono izquierdo (toolbar) -->
<IconField>
  <InputIcon class="pi pi-search" style="color: var(--fg-subtle);" />
  <InputText v-model="search" placeholder="Buscar expedientes…" size="small" class="w-full" />
</IconField>

<!-- Con botón de limpiar (derecho) -->
<IconField>
  <InputText v-model="search" placeholder="Buscar…" />
  <InputIcon v-if="search" class="pi pi-times cursor-pointer" @click="search = ''" />
</IconField>`;

const codeToolbarSearch = `<!-- Buscador reutilizable para toolbars -->
<CalendarToolbarSearch
  v-model="search"
  placeholder="Buscar expediente o actividad…"
  a11y-label="Buscar"
  input-id="toolbar-search"
/>`;

const codeInputGroup = `<!-- InputGroup: input + botón (copiar n.º expediente) -->
<InputGroup>
  <InputText v-model="caseNum" class="font-mono-num" />
  <Button icon="pi pi-copy" outlined @click="copy()" />
</InputGroup>

<!-- Con prefijo y sufijo texto -->
<InputGroup>
  <InputGroupAddon>EXP-</InputGroupAddon>
  <InputText v-model="code" />
  <InputGroupAddon>{{ year }}</InputGroupAddon>
</InputGroup>`;

const antiPatterns = [
  { bad: 'Input sin <label> visible (solo placeholder)', good: 'Siempre <label for="..."> visible. El placeholder es complementario.' },
  { bad: 'placeholder="Opcional" o placeholder="Ingrese..."', good: 'Placeholder realista: "Ej. García vs. Municipalidad de Lima" o "01234-2024-0-1801-JR-CI-05".' },
  { bad: 'autocomplete="on" en campos sensibles', good: 'autocomplete="off" en campos de texto libre de formularios legales.' },
  { bad: 'Textarea con rows fijo sin auto-resize', good: 'auto-resize para que crezca con el contenido. Fijar rows="2" como mínimo.' },
  { bad: 'Números legales sin font-mono-num', good: 'N.º expediente, fechas, montos → clase font-mono-num para tnum+lnum.' },
];
</script>

<template>
  <div class="flex flex-col gap-10">
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">Componentes / Inputs</p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">InputText, Textarea, IconField, InputGroup</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">Campos de texto libre en Alega. Regla: siempre label visible, placeholder realista, autocomplete="off" en formularios legales.</p>
    </div>

    <!-- InputText sizes -->
    <ExampleFrame title="InputText — tamaños" description="small (32px) · default (38px) · large (44px). En toolbars usar small; en formularios usar default.">
      <div class="flex flex-col gap-4">
        <div v-for="size in ['small', undefined, 'large']" :key="String(size)" class="flex flex-col gap-1">
          <label :for="`inp-size-${String(size ?? 'default')}`" class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">
            {{ size === 'small' ? 'Small' : size === 'large' ? 'Large' : 'Default' }}
          </label>
          <InputText
            :id="`inp-size-${String(size ?? 'default')}`"
            :size="size as any"
            :placeholder="size === 'small' ? 'Buscar expedientes…' : 'Ej. Pérez vs. Constructora Andina'"
          />
        </div>
      </div>
    </ExampleFrame>

    <!-- Estados -->
    <ExampleFrame title="InputText — estados" description="Default, disabled, invalid + mensaje de error. Limpiar el error en @input, mostrarlo en @blur o al submit.">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label for="inp-default" class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Título del expediente <span style="color: #dc2626;">*</span></label>
          <InputText id="inp-default" v-model="title" placeholder="Ej. Pérez vs. Constructora Andina" :invalid="!!titleError" autocomplete="off" @blur="validateTitle" @input="titleError = ''" />
          <small v-if="titleError" class="text-xs" style="color: #dc2626;">{{ titleError }}</small>
          <small v-else class="text-xs" style="color: var(--fg-subtle);">Aparecerá como título en el expediente.</small>
        </div>
        <div class="flex flex-col gap-1">
          <label for="inp-disabled" class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">N.º Interno (solo lectura)</label>
          <InputText id="inp-disabled" value="EXP-2024-0047" disabled />
        </div>
      </div>
    </ExampleFrame>

    <!-- Números legales -->
    <ExampleFrame title="InputText — números legales (font-mono-num)">
      <div class="flex flex-col gap-1">
        <label for="inp-case" class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">N.º Expediente</label>
        <InputText id="inp-case" v-model="caseNumber" class="font-mono-num" placeholder="01234-2024-0-1801-JR-CI-05" autocomplete="off" />
        <small class="text-xs" style="color: var(--fg-subtle);">Clase <code class="font-mono" style="background: var(--surface-sunken); padding: 0 2px; border-radius: 2px;">font-mono-num</code> activa tnum + lnum. No es fuente monospace.</small>
      </div>
    </ExampleFrame>

    <!-- Textarea -->
    <ExampleFrame title="Textarea — con auto-resize" description="rows=2 como mínimo. auto-resize permite crecer con el contenido.">
      <div class="flex flex-col gap-1">
        <label for="txt-desc" class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Descripción del expediente</label>
        <Textarea id="txt-desc" v-model="description" rows="2" placeholder="Breve descripción del caso, partes involucradas y objeto del litigio…" auto-resize />
        <small class="text-xs" style="color: var(--fg-subtle);">Opcional. Se muestra en el detalle del expediente.</small>
      </div>
    </ExampleFrame>

    <!-- IconField -->
    <ExampleFrame title="IconField — buscador con icono" description="IconField envuelve InputText + InputIcon. Icono izquierdo (search) o derecho (clear)." :code="codeIconField">
      <div class="flex flex-col gap-4">
        <IconField>
          <InputIcon class="pi pi-search" style="color: var(--fg-subtle);" />
          <InputText v-model="searchQuery" placeholder="Buscar expedientes…" size="small" class="w-full" />
        </IconField>
        <IconField>
          <InputText v-model="searchQuery" placeholder="Buscar…" />
          <InputIcon v-if="searchQuery" class="pi pi-times" style="color: var(--fg-subtle); cursor: pointer;" @click="searchQuery = ''" />
        </IconField>
      </div>
    </ExampleFrame>

    <!-- Toolbar search component -->
    <ExampleFrame
      title="Input pattern — toolbar search"
      description="Componente reusable con IconField + InputText small. Para toolbars, filtros de listas y búsquedas inline."
      :code="codeToolbarSearch"
    >
      <div class="max-w-md">
        <CalendarToolbarSearch
          v-model="searchQuery"
          input-id="inputs-toolbar-search"
          placeholder="Buscar expediente o actividad…"
          a11y-label="Buscar"
        />
      </div>
    </ExampleFrame>

    <!-- InputGroup -->
    <ExampleFrame title="InputGroup — prefijo / sufijo / botón" description="Para copiar n.º expediente, añadir unidades o prefijos visuales." :code="codeInputGroup">
      <div class="flex flex-col gap-4">
        <div>
          <small class="text-xs mb-1 block" style="color: var(--fg-subtle);">Input + botón copiar</small>
          <InputGroup>
            <InputText v-model="caseNumber" class="font-mono-num" placeholder="01234-2024-0-1801-JR-CI-05" />
            <Button icon="pi pi-copy" outlined aria-label="Copiar n.º expediente" v-tooltip.top="'Copiar'" @click="copyCase" />
          </InputGroup>
        </div>
        <div>
          <small class="text-xs mb-1 block" style="color: var(--fg-subtle);">Con prefijo texto</small>
          <InputGroup>
            <InputGroupAddon>EXP-</InputGroupAddon>
            <InputText placeholder="2024-0047" class="font-mono-num" />
          </InputGroup>
        </div>
        <div>
          <small class="text-xs mb-1 block" style="color: var(--fg-subtle);">Con sufijo (días)</small>
          <InputGroup>
            <InputText placeholder="30" class="font-mono-num" />
            <InputGroupAddon>días</InputGroupAddon>
          </InputGroup>
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
      <a href="https://primevue.org/inputtext/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> InputText</a>
      <span>·</span>
      <a href="https://primevue.org/iconfield/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> IconField</a>
    </div>
  </div>
</template>
