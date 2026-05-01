<script setup lang="ts">
import { ref } from 'vue';
import Menu from 'primevue/menu';
import Popover from 'primevue/popover';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import ExampleFrame from '../../_shared/ExampleFrame.vue';
import { useToast } from 'primevue/usetoast';
import CalendarFilterTrigger from '@/views/calendar/components/CalendarFilterTrigger.vue';

const toast = useToast();
const rowMenuRef = ref<InstanceType<typeof Menu> | null>(null);
const toolbarMenuRef = ref<InstanceType<typeof Menu> | null>(null);
const filtersPopoverRef = ref<InstanceType<typeof Popover> | null>(null);
const compactFilterRef = ref<InstanceType<typeof Popover> | null>(null);
const savedViewsRef = ref<InstanceType<typeof Popover> | null>(null);
const filterSearch = ref('');
const compactFilterOpen = ref(false);

const rowMenuItems = [
  {
    items: [
      { label: 'Ver expediente', icon: 'pi pi-eye', command: () => toast.add({ severity: 'info', summary: 'Ver expediente', life: 2000 }) },
      { label: 'Editar', icon: 'pi pi-pencil', command: () => toast.add({ severity: 'info', summary: 'Editar', life: 2000 }) },
    ],
  },
  { separator: true },
  {
    items: [
      { label: 'Archivar', icon: 'pi pi-inbox', command: () => toast.add({ severity: 'warn', summary: 'Archivado', life: 2000 }) },
      { label: 'Eliminar', icon: 'pi pi-trash', class: 'text-red-600', command: () => toast.add({ severity: 'error', summary: 'Eliminado', life: 2000 }) },
    ],
  },
];

const toolbarMenuItems = [
  { label: 'Exportar CSV', icon: 'pi pi-file-excel', command: () => toast.add({ severity: 'success', summary: 'Exportando…', life: 2000 }) },
  { label: 'Exportar PDF', icon: 'pi pi-file-pdf', command: () => toast.add({ severity: 'success', summary: 'Exportando…', life: 2000 }) },
  { separator: true },
  { label: 'Importar expedientes', icon: 'pi pi-upload', command: () => toast.add({ severity: 'info', summary: 'Importar', life: 2000 }) },
];

const activeFilters = [
  { id: 'type', label: 'Tipo', value: 'Caso' },
  { id: 'assignee', label: 'Asignado', value: 'Carlos Mendoza' },
  { id: 'date', label: 'Fecha', value: 'Esta semana' },
];

const savedViews = [
  { id: 'sv1', label: 'Mis expedientes urgentes' },
  { id: 'sv2', label: 'Clientes García' },
  { id: 'sv3', label: 'Litigios pendientes' },
];

const codeMenu = `<!-- Menu popup (kebab trigger en fila de tabla) -->
<Button
  icon="pi pi-ellipsis-h"
  variant="text"
  rounded
  size="small"
  severity="secondary"
  aria-label="Más acciones"
  @click="(e) => menuRef?.toggle(e)"
/>
<Menu ref="menuRef" :model="menuItems" popup />

// menuItems estructura:
const menuItems = [
  {
    items: [
      { label: 'Ver', icon: 'pi pi-eye', command: () => { } },
      { label: 'Editar', icon: 'pi pi-pencil', command: () => { } },
    ],
  },
  { separator: true },
  {
    items: [
      { label: 'Eliminar', icon: 'pi pi-trash', command: () => { } },
    ],
  },
];`;

const codePopover = `<!-- Popover con contenido custom -->
<Button
  icon="pi pi-filter"
  variant="outlined"
  size="small"
  aria-label="Filtros activos"
  @click="(e) => popoverRef?.toggle(e)"
/>
<Popover ref="popoverRef" class="w-[min(100vw-2rem,22rem)]">
  <div class="flex flex-col gap-2 p-3">
    <!-- contenido personalizado -->
  </div>
</Popover>`;

const codeFilterTrigger = `<!-- Trigger compacto para filtros + Popover -->
<CalendarFilterTrigger
  a11y-label="Tipo"
  icon="pi pi-th-large"
  :expanded="open"
  @toggle="(e) => popoverRef?.toggle(e)"
/>
<Popover ref="popoverRef">...</Popover>`;

const antiPatterns = [
  { bad: 'Menu con > 7 ítems sin separadores ni agrupación', good: 'Agrupar en secciones con separator. Si supera 7, considerar submenu o página de acciones.' },
  { bad: 'Popover con form completo (varios campos + submit)', good: 'Para forms con > 3 campos usar Dialog. Popover para filtros, mini-info o acciones simples.' },
  { bad: 'Menu anclado a posición fija en lugar de al evento', good: 'Siempre menuRef?.toggle(e) para que el menú aparezca junto al trigger.' },
  { bad: 'Popover sin width responsive', good: 'class="w-[min(100vw-2rem,22rem)]" — no se sale en móvil.' },
];
</script>

<template>
  <div class="flex flex-col gap-10">
    <!-- Page header -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">
        Componentes / Menu · Popover
      </p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Menu & Popover</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
        <strong>Menu</strong> — menú popup con lista de acciones. <strong>Popover</strong> — overlay custom con contenido arbitrario (filtros, saved views, mini-panels).
      </p>
    </div>

    <!-- Menu en fila de tabla (kebab) -->
    <ExampleFrame
      title="Menu popup — fila de tabla (kebab)"
      description="Patrón de TrackablesListView: botón ellipsis (...) abre un menú popup con acciones por fila. Click el botón para ver el menú."
      :code="codeMenu"
    >
      <div class="flex items-center gap-4">
        <!-- Simulated table row -->
        <div
          class="flex items-center justify-between flex-1 rounded-xl px-4 py-3"
          style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
        >
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-semibold" style="color: var(--fg-default);">García vs. Municipalidad de Lima</span>
            <span class="text-xs" style="color: var(--fg-subtle);">01234-2024-0-1801-JR-CI-05</span>
          </div>
          <Button
            icon="pi pi-ellipsis-h"
            variant="text"
            rounded
            size="small"
            severity="secondary"
            aria-label="Más acciones"
            v-tooltip.top="'Más acciones'"
            @click="(e) => rowMenuRef?.toggle(e)"
          />
        </div>
        <Menu ref="rowMenuRef" :model="rowMenuItems" popup />
      </div>
    </ExampleFrame>

    <!-- Menu en toolbar -->
    <ExampleFrame
      title="Menu popup — toolbar (más acciones)"
      description="Patrón de toolbar en TrackablesListView: botón con icono pi-ellipsis-h para acciones secundarias (exportar, importar)."
    >
      <div class="flex items-center gap-2">
        <Button label="Nuevo expediente" icon="pi pi-plus" size="small" />
        <Button
          icon="pi pi-ellipsis-h"
          variant="outlined"
          size="small"
          severity="secondary"
          aria-label="Más acciones"
          v-tooltip.top="'Más acciones'"
          @click="(e) => toolbarMenuRef?.toggle(e)"
        />
        <Menu ref="toolbarMenuRef" :model="toolbarMenuItems" popup />
      </div>
    </ExampleFrame>

    <!-- Popover de filtros activos -->
    <ExampleFrame
      title="Popover — filtros activos"
      description="Patrón de TrackablesListView: popover mostrando los filtros activos con opción de limpiar cada uno. Width responsive."
      :code="codePopover"
    >
      <div class="flex items-center gap-2">
        <Button
          icon="pi pi-filter"
          label="Filtros (3)"
          variant="outlined"
          size="small"
          severity="secondary"
          aria-label="Filtros activos"
          @click="(e) => filtersPopoverRef?.toggle(e)"
        />
        <Popover ref="filtersPopoverRef" class="w-[min(100vw-2rem,22rem)]">
          <div class="flex flex-col gap-2 p-3">
            <p class="m-0 text-[10px] font-semibold uppercase tracking-[0.08em]" style="color: var(--fg-muted);">
              Filtros activos
            </p>
            <ul class="m-0 flex list-none flex-col gap-1 p-0">
              <li
                v-for="filter in activeFilters"
                :key="filter.id"
                class="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
                style="background: var(--surface-sunken);"
              >
                <div class="flex flex-col gap-0">
                  <span class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--fg-subtle);">{{ filter.label }}</span>
                  <span class="text-sm" style="color: var(--fg-default);">{{ filter.value }}</span>
                </div>
                <Button icon="pi pi-times" text rounded size="small" severity="secondary" :aria-label="`Quitar filtro ${filter.label}`" />
              </li>
            </ul>
          </div>
        </Popover>
      </div>
    </ExampleFrame>

    <!-- Compact filter trigger -->
    <ExampleFrame
      title="Popover pattern — trigger compacto de filtros"
      description="Botón pill de 32px con icono/avatar + chevron. Ideal para toolbars densos con filtros en popover."
      :code="codeFilterTrigger"
    >
      <div class="flex items-center gap-2">
        <CalendarFilterTrigger
          a11y-label="Tipo"
          label="Tipo"
          icon="pi pi-th-large"
          :expanded="compactFilterOpen"
          @toggle="(e) => compactFilterRef?.toggle(e)"
        />
        <Popover
          ref="compactFilterRef"
          class="w-[min(100vw-2rem,20rem)] border border-[var(--surface-border)] bg-[var(--surface-raised)] shadow-lg"
          @show="compactFilterOpen = true"
          @hide="compactFilterOpen = false"
        >
          <div class="flex max-h-[min(280px,50vh)] flex-col gap-1 overflow-hidden rounded-xl">
            <div class="shrink-0 border-b border-[var(--surface-border)] px-3 py-2">
              <p class="m-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Tipo</p>
            </div>
            <ul class="m-0 min-h-0 list-none space-y-0.5 overflow-y-auto overscroll-contain p-1">
              <li v-for="kind in ['Audiencia', 'Plazo', 'Escrito', 'SINOE']" :key="kind">
                <button
                  type="button"
                  class="flex w-full cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent px-2 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--accent-soft)_50%,transparent)]"
                  style="color: var(--fg-default);"
                >
                  <span class="cal-filter-trigger-empty" aria-hidden="true">
                    <i class="pi pi-circle-fill" />
                  </span>
                  <span class="min-w-0 flex-1 truncate text-sm">{{ kind }}</span>
                </button>
              </li>
            </ul>
          </div>
        </Popover>
      </div>
    </ExampleFrame>

    <!-- Popover de saved views -->
    <ExampleFrame
      title="Popover — saved views / vista guardada"
      description="Popover con lista de vistas guardadas por el usuario. Incluye input de búsqueda y acción de guardar nueva."
    >
      <div>
        <Button
          icon="pi pi-bookmark"
          label="Vistas guardadas"
          variant="outlined"
          size="small"
          severity="secondary"
          aria-label="Vistas guardadas"
          @click="(e) => savedViewsRef?.toggle(e)"
        />
        <Popover ref="savedViewsRef" class="w-[min(100vw-2rem,20rem)]">
          <div class="flex flex-col gap-2 p-3">
            <p class="m-0 text-[10px] font-semibold uppercase tracking-[0.08em]" style="color: var(--fg-muted);">Mis vistas</p>
            <InputText
              v-model="filterSearch"
              placeholder="Buscar vista…"
              size="small"
              class="w-full"
            />
            <ul class="m-0 list-none p-0 flex flex-col gap-0.5">
              <li
                v-for="view in savedViews.filter(v => !filterSearch || v.label.toLowerCase().includes(filterSearch.toLowerCase()))"
                :key="view.id"
                class="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-colors"
                style="color: var(--fg-default);"
                @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background = 'var(--surface-sunken)'"
                @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'"
                @click="toast.add({ severity: 'info', summary: view.label, life: 2000 })"
              >
                <i class="pi pi-bookmark text-xs" style="color: var(--fg-subtle);" />
                <span class="text-sm">{{ view.label }}</span>
              </li>
            </ul>
            <div class="pt-1 border-t" style="border-color: var(--surface-border);">
              <Button label="Guardar vista actual" icon="pi pi-plus" text size="small" class="w-full" @click="toast.add({ severity: 'success', summary: 'Vista guardada', life: 2000 })" />
            </div>
          </div>
        </Popover>
      </div>
    </ExampleFrame>

    <!-- Anti-patterns -->
    <div class="flex flex-col gap-3">
      <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">Anti-patrones</h2>
      <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--surface-border);">
        <table class="w-full text-xs">
          <thead>
            <tr style="background: var(--surface-sunken); border-bottom: 1px solid var(--surface-border);">
              <th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Anti-patrón</th>
              <th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Corrección</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in antiPatterns" :key="i" style="border-bottom: 1px solid var(--surface-border);">
              <td class="px-4 py-2.5" style="color: #dc2626;">{{ row.bad }}</td>
              <td class="px-4 py-2.5" style="color: var(--fg-default);">{{ row.good }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <a href="https://primevue.org/menu/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> Menu</a>
      <span>·</span>
      <a href="https://primevue.org/popover/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> Popover</a>
    </div>
  </div>
</template>
