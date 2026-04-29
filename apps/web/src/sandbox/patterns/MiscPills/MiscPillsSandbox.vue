<script setup lang="ts">
import Button from 'primevue/button';
import ExampleFrame from '../../_shared/ExampleFrame.vue';

const codeCaseKey = `<!-- matter-case-key pill (n.º expediente en tabla) -->
<span
  class="matter-case-key inline-flex w-fit max-w-full truncate rounded-md border px-1.5 py-0.5
         font-mono text-[10px] font-semibold uppercase tracking-[0.04em]"
  style="
    border-color: var(--surface-border);
    background: color-mix(in srgb, var(--surface-raised) 88%, var(--accent-soft));
    color: var(--fg-muted);
  "
>
  {{ caseKey }}
</span>`;

const codeDirtyDot = `<!-- Dirty-dot inline en header de dialog o hint -->
<p
  class="flex items-center gap-1.5 text-[0.8125rem]"
  style="color: #d97706;"
>
  <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
  Cambios sin guardar
</p>`;

const codeCounterChip = `<!-- Counter chip (cockpit-row__counter) -->
<span
  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-default"
  style="
    background: var(--surface-sunken);
    color: var(--fg-muted);
    border: 1px solid var(--surface-border);
  "
  v-tooltip="tooltipText"
  :aria-label="ariaLabel"
>
  <i :class="icon" aria-hidden="true" />
  {{ count }}
</span>`;

const codeEmptyState = `<!-- Empty state en tabla/lista vacía -->
<div class="flex flex-col items-center gap-3 py-16 text-center">
  <i class="pi pi-inbox text-4xl opacity-40" style="color: var(--fg-subtle);" />
  <div class="flex flex-col gap-1">
    <p class="text-sm font-semibold m-0" style="color: var(--fg-default);">Sin expedientes activos</p>
    <p class="text-xs m-0" style="color: var(--fg-subtle);">Crea un expediente para empezar a organizar tu despacho.</p>
  </div>
  <Button label="Nuevo expediente" icon="pi pi-plus" size="small" />
</div>`;
</script>

<template>
  <div class="flex flex-col gap-10">
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">Patrones / Misc Pills</p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Misc pills & empty states</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">Patrones atómicos pequeños: case-key pill, dirty-dot, counter-chip y empty-states. Todos con tokens canónicos.</p>
    </div>

    <!-- Case key pill -->
    <ExampleFrame title="matter-case-key — pill de n.º expediente" description="Pill monoespaciada con color-mix background. Se muestra en columna de tabla y cabecera de detalle." :code="codeCaseKey">
      <div class="flex flex-wrap gap-3 items-center">
        <span
          class="inline-flex w-fit rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.04em]"
          style="border-color: var(--surface-border); background: color-mix(in srgb, var(--surface-raised) 88%, var(--accent-soft)); color: var(--fg-muted);"
        >
          01234-2024-0-1801-JR-CI-05
        </span>
        <span
          class="inline-flex w-fit rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.04em]"
          style="border-color: var(--surface-border); background: color-mix(in srgb, var(--surface-raised) 88%, var(--accent-soft)); color: var(--fg-muted);"
        >
          CORP-2024-0112
        </span>
        <span
          class="inline-flex w-fit rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.04em]"
          style="border-color: var(--surface-border); background: color-mix(in srgb, var(--surface-raised) 88%, var(--accent-soft)); color: var(--fg-muted);"
        >
          AUD-2024-0023
        </span>
      </div>
    </ExampleFrame>

    <!-- Dirty dot -->
    <ExampleFrame title="dirty-dot — indicador de cambios sin guardar" description="Punto ámbar inline + texto. Aparece en el header de dialog y en step hints cuando isDirty." :code="codeDirtyDot">
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-1.5">
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
          <span class="text-[0.8125rem]" style="color: #d97706;">Cambios sin guardar</span>
        </div>
        <!-- En header de dialog -->
        <div
          class="rounded-xl p-4 flex items-start gap-3"
          style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
        >
          <div class="matter-dialog-icon-demo" style="width: 44px; height: 44px; border-radius: 12px; border: 1px solid color-mix(in srgb, var(--brand-zafiro) 22%, var(--surface-border)); background: color-mix(in srgb, var(--brand-zafiro) 8%, var(--surface-raised)); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">⚖️</div>
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-[0.6875rem] font-semibold uppercase tracking-[0.06em]" style="color: var(--brand-zafiro);">Editar expediente</span>
            <h2 class="text-[1.0625rem] font-semibold m-0" style="color: var(--fg-default);">García vs. Municipalidad de Lima</h2>
            <p class="m-0 flex items-center gap-1.5 text-[0.8125rem]" style="color: #d97706;">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              Cambios sin guardar
            </p>
          </div>
        </div>
      </div>
    </ExampleFrame>

    <!-- Counter chip -->
    <ExampleFrame title="counter-chip — badge inline con tooltip" description="Patrón cockpit-row__counter: icon + count + tooltip descriptivo. Solo visible si count > 0." :code="codeCounterChip">
      <div class="flex items-center gap-2 flex-wrap">
        <span
          v-for="item in [
            { icon: 'pi pi-file', count: 14, tip: '14 documentos adjuntos' },
            { icon: 'pi pi-calendar', count: 6, tip: '6 eventos del expediente' },
            { icon: 'pi pi-comment', count: 3, tip: '3 notas' },
          ]"
          :key="item.icon"
          class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-default"
          style="background: var(--surface-sunken); color: var(--fg-muted); border: 1px solid var(--surface-border);"
          v-tooltip="item.tip"
          :aria-label="item.tip"
        >
          <i :class="item.icon" class="text-[11px]" aria-hidden="true" />
          {{ item.count }}
        </span>
        <span class="text-xs" style="color: var(--fg-subtle);">← Hover para ver tooltip</span>
      </div>
    </ExampleFrame>

    <!-- Empty states -->
    <ExampleFrame title="Empty states — variantes" description="4 variantes: lista vacía, búsqueda sin resultados, sin permisos, error de red. Icono + título + subtítulo + CTA opcional." :code="codeEmptyState">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Lista vacía -->
        <div
          class="rounded-xl flex flex-col items-center gap-3 py-12 px-6 text-center"
          style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
        >
          <i class="pi pi-inbox text-3xl opacity-40" style="color: var(--fg-subtle);" />
          <div class="flex flex-col gap-1">
            <p class="text-sm font-semibold m-0" style="color: var(--fg-default);">Sin expedientes activos</p>
            <p class="text-xs m-0" style="color: var(--fg-subtle);">Crea un expediente para empezar.</p>
          </div>
          <Button label="Nuevo expediente" icon="pi pi-plus" size="small" />
        </div>

        <!-- Búsqueda sin resultados -->
        <div
          class="rounded-xl flex flex-col items-center gap-3 py-12 px-6 text-center"
          style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
        >
          <i class="pi pi-search text-3xl opacity-40" style="color: var(--fg-subtle);" />
          <div class="flex flex-col gap-1">
            <p class="text-sm font-semibold m-0" style="color: var(--fg-default);">Sin resultados para «García»</p>
            <p class="text-xs m-0" style="color: var(--fg-subtle);">Prueba con otro término o limpia los filtros.</p>
          </div>
          <Button label="Limpiar búsqueda" variant="outlined" severity="secondary" size="small" />
        </div>

        <!-- Sin permisos -->
        <div
          class="rounded-xl flex flex-col items-center gap-3 py-12 px-6 text-center"
          style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
        >
          <i class="pi pi-lock text-3xl opacity-40" style="color: var(--fg-subtle);" />
          <div class="flex flex-col gap-1">
            <p class="text-sm font-semibold m-0" style="color: var(--fg-default);">Sin acceso</p>
            <p class="text-xs m-0" style="color: var(--fg-subtle);">Necesitas el permiso <code class="font-mono" style="background: var(--surface-sunken); padding: 0 3px; border-radius: 3px;">trackable:read</code> para ver esta sección.</p>
          </div>
        </div>

        <!-- Error de red -->
        <div
          class="rounded-xl flex flex-col items-center gap-3 py-12 px-6 text-center"
          style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
        >
          <i class="pi pi-wifi text-3xl opacity-40" style="color: var(--fg-subtle);" />
          <div class="flex flex-col gap-1">
            <p class="text-sm font-semibold m-0" style="color: var(--fg-default);">Error de conexión</p>
            <p class="text-xs m-0" style="color: var(--fg-subtle);">No se pudo cargar la información. Verifica tu conexión.</p>
          </div>
          <Button label="Reintentar" icon="pi pi-refresh" variant="outlined" severity="secondary" size="small" />
        </div>
      </div>
    </ExampleFrame>

    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <span>case-key: <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">TrackablesListView.vue L517-521</code></span>
      <span>·</span>
      <span>dirty-dot: <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">TrackablesListView.vue L1080</code></span>
      <span>·</span>
      <span>empty-state: <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">TrackablesListView.vue L490-504</code></span>
    </div>
  </div>
</template>
