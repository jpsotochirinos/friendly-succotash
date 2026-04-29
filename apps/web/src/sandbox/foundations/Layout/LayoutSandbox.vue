<script setup lang="ts">
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import ExampleFrame from '../../_shared/ExampleFrame.vue';
import PageHeader from '@/components/common/PageHeader.vue';

const codePageHeader = `<PageHeader
  eyebrow="Expedientes"
  title="Mis expedientes"
  subtitle="8 expedientes activos · 2 archivados"
>
  <template #actions>
    <Button label="Nuevo expediente" icon="pi pi-plus" @click="..." />
  </template>
</PageHeader>`;

const codeAppCard = `<!-- Contenedor base para secciones y panels -->
<div
  class="rounded-2xl border p-5"
  style="
    background: var(--surface-raised);
    border-color: var(--surface-border);
    box-shadow: var(--shadow-sm);
  "
>
  <!-- contenido -->
</div>`;

const codeDivider = `<!-- Divider PrimeVue con label -->
<Divider align="left" type="solid">
  <span class="text-xs font-semibold uppercase tracking-wider"
    style="color: var(--fg-subtle);">
    Partes del expediente
  </span>
</Divider>

<!-- Divider dashed (patrón .matter-form-section) -->
<h3 class="matter-form-section__title">Identidad</h3>
<!-- CSS:
.matter-form-section__title {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--fg-subtle);
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed var(--surface-border);
}
-->`;
</script>

<template>
  <div class="flex flex-col gap-10">
    <!-- Page header -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">
        Foundations / Layout
      </p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Patrones de página</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
        Contenedores base, PageHeader, Divider y grids de dos columnas usados en vistas Alega.
      </p>
    </div>

    <!-- PageHeader -->
    <ExampleFrame
      title="PageHeader"
      description="Componente reutilizable para el encabezado de Tier 2. Eyebrow + H1 + subtitle + slot acciones."
      :code="codePageHeader"
    >
      <div
        class="rounded-xl p-5"
        style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
      >
        <PageHeader
          eyebrow="Expedientes"
          title="Mis expedientes"
          subtitle="8 expedientes activos · 2 archivados"
        >
          <template #actions>
            <Button label="Nuevo expediente" icon="pi pi-plus" size="small" />
          </template>
        </PageHeader>
      </div>
    </ExampleFrame>

    <!-- PageHeader variants -->
    <ExampleFrame
      title="PageHeader — variantes"
      description="Sin eyebrow, sin subtitle, sólo título."
    >
      <div class="flex flex-col gap-4">
        <div
          class="rounded-xl p-5"
          style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
        >
          <PageHeader title="Clientes" subtitle="Gestión de clientes del despacho." />
        </div>
        <div
          class="rounded-xl p-5"
          style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
        >
          <PageHeader eyebrow="Admin" title="Usuarios" />
        </div>
      </div>
    </ExampleFrame>

    <!-- app-card (contenedor base) -->
    <ExampleFrame
      title=".app-card — contenedor base"
      description="Superficie raised con border, shadow-sm y border-radius 1rem. Usar para secciones, panels y widgets."
      :code="codeAppCard"
    >
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          v-for="(label, i) in ['Shadow sm', 'Shadow md', 'Shadow lg']"
          :key="i"
          class="rounded-2xl border p-5 flex flex-col gap-2"
          :style="{
            background: 'var(--surface-raised)',
            borderColor: 'var(--surface-border)',
            boxShadow: `var(--shadow-${['sm','md','lg'][i]})`
          }"
        >
          <span class="text-xs font-semibold" style="color: var(--fg-muted);">{{ label }}</span>
          <p class="text-sm m-0" style="color: var(--fg-default);">Contenido de ejemplo para mostrar la elevación.</p>
        </div>
      </div>
    </ExampleFrame>

    <!-- Nested surfaces -->
    <ExampleFrame
      title="Jerarquía de superficies"
      description="App → Raised → Sunken. Cada nivel es el siguiente plano visual. Los inputs viven en Sunken dentro de Raised."
    >
      <div
        class="rounded-2xl p-4"
        style="background: var(--surface-app); border: 1px solid var(--surface-border);"
      >
        <span class="text-xs" style="color: var(--fg-subtle);">surface-app (fondo global)</span>
        <div
          class="mt-3 rounded-xl p-4"
          style="background: var(--surface-raised); border: 1px solid var(--surface-border); box-shadow: var(--shadow-sm);"
        >
          <span class="text-xs" style="color: var(--fg-subtle);">surface-raised (card)</span>
          <div
            class="mt-3 rounded-lg p-3 flex flex-col gap-2"
            style="background: var(--surface-sunken); border: 1px solid var(--surface-border);"
          >
            <span class="text-xs" style="color: var(--fg-subtle);">surface-sunken (input area, dialog header)</span>
            <div
              class="rounded px-3 py-2 text-sm"
              style="background: var(--surface-raised); border: 1px solid var(--surface-border); color: var(--fg-default);"
            >
              Input / campo
            </div>
          </div>
        </div>
      </div>
    </ExampleFrame>

    <!-- Dividers -->
    <ExampleFrame
      title="Dividers y separadores de sección"
      description="PrimeVue Divider (sólido con label) y separador dashed canónico de formularios (.matter-form-section__title)."
      :code="codeDivider"
    >
      <div class="flex flex-col gap-6">
        <div>
          <Divider align="left" type="solid">
            <span
              class="text-xs font-semibold uppercase tracking-wider"
              style="color: var(--fg-subtle);"
            >Partes del expediente</span>
          </Divider>
          <p class="text-sm m-0 mt-2" style="color: var(--fg-muted);">Contenido bajo el divider.</p>
        </div>

        <div>
          <Divider type="dashed" />
          <p class="text-sm m-0 mt-2" style="color: var(--fg-muted);">Divider dashed PrimeVue.</p>
        </div>

        <div>
          <h3
            class="m-0 pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.07em]"
            style="color: var(--fg-subtle); border-bottom: 1px dashed var(--surface-border);"
          >
            Identidad
          </h3>
          <p class="text-sm m-0 mt-3" style="color: var(--fg-muted);">
            Separador canónico de secciones de formulario (<code class="font-mono text-xs px-1 rounded" style="background: var(--surface-sunken);">.matter-form-section__title</code>).
          </p>
        </div>
      </div>
    </ExampleFrame>

    <!-- Two-column layout -->
    <ExampleFrame
      title="Dos columnas: sidebar + contenido"
      description="Patrón para páginas de configuración y detalle. 260px sidebar fijo + minmax(0,1fr) contenido. Colapsa a 1 columna en móvil."
    >
      <div
        class="rounded-xl overflow-hidden"
        style="border: 1px solid var(--surface-border); height: 200px;"
      >
        <div class="grid h-full" style="grid-template-columns: 200px minmax(0,1fr);">
          <div
            class="flex flex-col gap-2 p-4 border-r"
            style="background: var(--surface-sunken); border-color: var(--surface-border);"
          >
            <span class="text-[0.6875rem] font-semibold uppercase tracking-wider" style="color: var(--fg-subtle);">Navegación</span>
            <div
              v-for="item in ['General', 'Usuarios', 'Facturación', 'Integraciones']"
              :key="item"
              class="text-sm px-2 py-1.5 rounded-lg cursor-pointer"
              style="color: var(--fg-muted);"
            >
              {{ item }}
            </div>
          </div>
          <div class="p-6 flex flex-col gap-2" style="background: var(--surface-raised);">
            <span class="text-base font-semibold" style="color: var(--fg-default);">Contenido principal</span>
            <p class="text-sm m-0" style="color: var(--fg-muted);">El contenido de la sección va aquí.</p>
          </div>
        </div>
      </div>
    </ExampleFrame>

    <!-- Footer links -->
    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <span>Skill: <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">.agents/skills/alega-ui-coherence/SKILL.md</code></span>
      <span>·</span>
      <a
        href="https://primevue.org/divider/"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors"
        style="color: var(--fg-muted);"
      >
        <i class="pi pi-external-link text-[10px]" />
        Docs PrimeVue Divider
      </a>
    </div>
  </div>
</template>
