<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import SplitButton from 'primevue/splitbutton';
import ExampleFrame from '../../_shared/ExampleFrame.vue';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const loading = ref(false);

function simulateLoad() {
  loading.value = true;
  setTimeout(() => { loading.value = false; }, 1500);
}

const splitItems = [
  { label: 'Guardar borrador', icon: 'pi pi-save', command: () => toast.add({ severity: 'info', summary: 'Borrador guardado', life: 2000 }) },
  { label: 'Guardar y enviar', icon: 'pi pi-send', command: () => toast.add({ severity: 'success', summary: 'Enviado', life: 2000 }) },
];

const antiPatterns = [
  { bad: 'Múltiples botones primary en la misma vista', good: 'Un único CTA primario por pantalla. Los demás: outlined / text / secondary.' },
  { bad: 'Icon-only sin aria-label', good: 'Siempre aria-label + v-tooltip.top en icon-only buttons.' },
  { bad: 'font-bold en botones', good: 'PrimeVue usa font-semibold por defecto. No sobreescribir.' },
  { bad: 'Button con :loading pero sin :disabled', good: ':loading automáticamente deshabilita. No agregar :disabled="loading" por separado.' },
  { bad: 'Mezclar severity y variant aleatoriamente', good: 'Seguir la jerarquía: solid primary → outlined secondary → text para acciones terciarias.' },
];
</script>

<template>
  <div class="flex flex-col gap-10">
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">Componentes / Button</p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Button — todas las variantes</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">Jerarquía: solid primary → outlined/secondary → text. Un único CTA primario por pantalla.</p>
    </div>

    <!-- Severity -->
    <ExampleFrame title="Severidades (solid)" description="primary (accent), secondary, success, info, warning, danger, contrast.">
      <div class="flex flex-wrap gap-3">
        <Button label="Primary" />
        <Button label="Secondary" severity="secondary" />
        <Button label="Success" severity="success" />
        <Button label="Info" severity="info" />
        <Button label="Warning" severity="warning" />
        <Button label="Danger" severity="danger" />
        <Button label="Contrast" severity="contrast" />
      </div>
    </ExampleFrame>

    <!-- Variants -->
    <ExampleFrame title="Variantes: solid · outlined · text · link">
      <div class="flex flex-wrap gap-3 items-center">
        <Button label="Solid (default)" />
        <Button label="Outlined" variant="outlined" />
        <Button label="Text" variant="text" />
        <Button label="Link" variant="link" />
      </div>
    </ExampleFrame>

    <!-- Sizes -->
    <ExampleFrame title="Tamaños: small · default · large">
      <div class="flex flex-wrap items-center gap-3">
        <Button label="Small" size="small" />
        <Button label="Default" />
        <Button label="Large" size="large" />
      </div>
    </ExampleFrame>

    <!-- Con iconos -->
    <ExampleFrame title="Botones con iconos">
      <div class="flex flex-wrap gap-3 items-center">
        <Button label="Nuevo expediente" icon="pi pi-plus" />
        <Button label="Exportar" icon="pi pi-download" variant="outlined" severity="secondary" />
        <Button label="Siguiente" icon="pi pi-arrow-right" icon-pos="right" />
        <Button icon="pi pi-pencil" variant="text" rounded severity="secondary" aria-label="Editar" v-tooltip.top="'Editar'" />
        <Button icon="pi pi-trash" variant="text" rounded severity="danger" aria-label="Eliminar" v-tooltip.top="'Eliminar'" />
        <Button icon="pi pi-eye" variant="outlined" rounded size="small" severity="secondary" aria-label="Ver" v-tooltip.top="'Ver'" />
      </div>
    </ExampleFrame>

    <!-- Modifiers -->
    <ExampleFrame title="Modificadores: rounded, raised, loading">
      <div class="flex flex-wrap gap-3 items-center">
        <Button label="Rounded" rounded />
        <Button label="Raised" raised />
        <Button label="Rounded + Raised" rounded raised />
        <Button label="Cargando…" :loading="loading" @click="simulateLoad" />
        <Button label="Disabled" disabled />
      </div>
    </ExampleFrame>

    <!-- SplitButton -->
    <ExampleFrame title="SplitButton — acción primaria + menú" description="Cuando hay una acción principal y variantes secundarias (guardar / guardar borrador / guardar y enviar).">
      <SplitButton
        label="Guardar expediente"
        icon="pi pi-check"
        :model="splitItems"
        @click="toast.add({ severity: 'success', summary: 'Guardado', life: 2000 })"
      />
    </ExampleFrame>

    <!-- ButtonGroup -->
    <ExampleFrame title="ButtonGroup — acciones agrupadas" description="Para acciones mutuamente relacionadas sin espacio entre ellas (zoom in/out, alinear izq/centro/der).">
      <div class="flex items-center gap-4">
        <div class="flex">
          <Button label="Día" variant="outlined" severity="secondary" style="border-radius: 8px 0 0 8px; border-right: 0;" />
          <Button label="Semana" variant="outlined" severity="secondary" style="border-radius: 0; border-right: 0;" />
          <Button label="Mes" variant="outlined" severity="secondary" style="border-radius: 0 8px 8px 0;" />
        </div>
        <div class="flex">
          <Button icon="pi pi-align-left" variant="outlined" severity="secondary" style="border-radius: 8px 0 0 8px; border-right: 0;" aria-label="Izquierda" />
          <Button icon="pi pi-align-center" variant="outlined" severity="secondary" style="border-radius: 0; border-right: 0;" aria-label="Centrado" />
          <Button icon="pi pi-align-right" variant="outlined" severity="secondary" style="border-radius: 0 8px 8px 0;" aria-label="Derecha" />
        </div>
      </div>
    </ExampleFrame>

    <!-- Patrones de footer de dialog -->
    <ExampleFrame title="Footer de dialog — jerarquía de botones" description="Cancelar (text) siempre a la izquierda. Acción primaria a la derecha. Atrás/Siguiente en wizard.">
      <div class="flex items-center justify-between p-4 rounded-xl" style="border: 1px solid var(--surface-border); background: var(--surface-sunken);">
        <Button label="Cancelar" variant="text" severity="secondary" />
        <div class="flex items-center gap-2">
          <Button label="Atrás" icon="pi pi-arrow-left" variant="outlined" severity="secondary" />
          <Button label="Siguiente" icon="pi pi-arrow-right" icon-pos="right" />
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
      <a href="https://primevue.org/button/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> Button</a>
      <span>·</span>
      <a href="https://primevue.org/splitbutton/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> SplitButton</a>
    </div>
  </div>
</template>
