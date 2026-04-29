<script setup lang="ts">
import Button from 'primevue/button';
import ExampleFrame from '../../_shared/ExampleFrame.vue';

const codeBasic = `<!-- Directiva v-tooltip (registrada globalmente en main.ts) -->

<!-- Posición top (default Alega) -->
<Button
  icon="pi pi-pencil"
  variant="text"
  rounded
  size="small"
  severity="secondary"
  aria-label="Editar expediente"
  v-tooltip.top="'Editar expediente'"
/>

<!-- Posición right, bottom, left -->
<Button icon="pi pi-info" v-tooltip.right="'Más información'" aria-label="Más información" />
<Button icon="pi pi-download" v-tooltip.bottom="'Descargar'" aria-label="Descargar" />
<Button icon="pi pi-share-alt" v-tooltip.left="'Compartir'" aria-label="Compartir" />`;

const codeCounter = `<!-- Counter con tooltip (cockpit-row__counter pattern) -->
<span
  class="cockpit-row__counter"
  v-tooltip="'Documentos adjuntos'"
  role="status"
  :aria-label="\`\${count} documentos\`"
>
  <i class="pi pi-file" aria-hidden="true" />
  {{ count }}
</span>`;

const codeReactive = `<!-- Tooltip con valor reactivo (i18n) -->
<Button
  icon="pi pi-trash"
  v-tooltip.top="t('trackables.tooltipDelete')"
  :aria-label="t('trackables.tooltipDelete')"
/>`;

const antiPatterns = [
  { bad: 'Tooltip en botón que ya tiene label visible', good: 'Solo en icon-only buttons o counters sin contexto' },
  { bad: 'Tooltip de > 8 palabras', good: 'Máximo 8 palabras. Para más contexto usar Popover.' },
  { bad: 'Sin aria-label en icon-only + tooltip', good: 'Siempre aria-label complementario (tooltip no funciona con screen reader)' },
  { bad: 'Tooltip redundante: label "Guardar" + tooltip "Guardar"', good: 'Tooltip solo si el botón carece de texto visible' },
  { bad: 'v-tooltip sin modificador de posición', good: 'Usar .top (default Alega); evitar tooltip que tape el contenido de acción' },
];
</script>

<template>
  <div class="flex flex-col gap-10">
    <!-- Page header -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">
        Componentes / Tooltip
      </p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Tooltip</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
        Directiva <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-sunken);">v-tooltip</code>
        registrada globalmente en <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-sunken);">main.ts</code>.
        Hover o foco activa el tooltip. Hover sobre los botones para ver el efecto.
      </p>
    </div>

    <!-- Reglas -->
    <div
      class="flex gap-3 rounded-lg px-4 py-3 text-sm"
      style="border: 1px solid var(--surface-border); background: var(--accent-soft); color: var(--fg-default);"
    >
      <i class="pi pi-info-circle shrink-0 mt-0.5" style="color: var(--accent);" />
      <p class="m-0">
        <strong>Regla principal:</strong> usar SIEMPRE en icon-only buttons. El tooltip NO es accesible vía screen reader — acompañar siempre con <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-raised);">aria-label</code>.
      </p>
    </div>

    <!-- Posiciones -->
    <ExampleFrame
      title="Posiciones: top · right · bottom · left"
      description="La posición .top es el default Alega. Elegir la dirección que no tape el contenido principal."
      :code="codeBasic"
    >
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex flex-col items-center gap-2">
          <Button
            icon="pi pi-pencil"
            variant="outlined"
            rounded
            size="small"
            severity="secondary"
            aria-label="Editar"
            v-tooltip.top="'Editar expediente (top)'"
          />
          <span class="text-[10px]" style="color: var(--fg-subtle);">.top</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Button
            icon="pi pi-info-circle"
            variant="outlined"
            rounded
            size="small"
            severity="secondary"
            aria-label="Información"
            v-tooltip.right="'Información adicional (right)'"
          />
          <span class="text-[10px]" style="color: var(--fg-subtle);">.right</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Button
            icon="pi pi-download"
            variant="outlined"
            rounded
            size="small"
            severity="secondary"
            aria-label="Descargar"
            v-tooltip.bottom="'Descargar documento (bottom)'"
          />
          <span class="text-[10px]" style="color: var(--fg-subtle);">.bottom</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Button
            icon="pi pi-share-alt"
            variant="outlined"
            rounded
            size="small"
            severity="secondary"
            aria-label="Compartir"
            v-tooltip.left="'Compartir enlace (left)'"
          />
          <span class="text-[10px]" style="color: var(--fg-subtle);">.left</span>
        </div>
      </div>
    </ExampleFrame>

    <!-- Toolbar row de acciones (uso real) -->
    <ExampleFrame
      title="Acciones por fila en tabla (uso real)"
      description="Patrón de TrackablesListView: icon-only buttons con v-tooltip.top + aria-label. Hover para ver."
    >
      <div class="flex items-center gap-1">
        <Button
          icon="pi pi-eye"
          variant="text"
          rounded
          size="small"
          severity="secondary"
          aria-label="Ver expediente"
          v-tooltip.top="'Ver expediente'"
        />
        <Button
          icon="pi pi-pencil"
          variant="text"
          rounded
          size="small"
          severity="secondary"
          aria-label="Editar"
          v-tooltip.top="'Editar'"
        />
        <Button
          icon="pi pi-inbox"
          variant="text"
          rounded
          size="small"
          severity="warn"
          aria-label="Archivar"
          v-tooltip.top="'Archivar'"
        />
        <Button
          icon="pi pi-trash"
          variant="text"
          rounded
          size="small"
          severity="danger"
          aria-label="Eliminar"
          v-tooltip.top="'Eliminar'"
        />
      </div>
    </ExampleFrame>

    <!-- Counter chips con tooltip -->
    <ExampleFrame
      title="Counter chips (cockpit-row__counter)"
      description="Patrón de TrackablesCockpit: icono + número + tooltip que aclara qué se está contando."
      :code="codeCounter"
    >
      <div class="flex items-center gap-3">
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-default"
          style="background: var(--surface-sunken); color: var(--fg-muted); border: 1px solid var(--surface-border);"
          v-tooltip="'14 documentos adjuntos'"
          aria-label="14 documentos"
        >
          <i class="pi pi-file text-[11px]" aria-hidden="true" />
          14
        </span>
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-default"
          style="background: var(--surface-sunken); color: var(--fg-muted); border: 1px solid var(--surface-border);"
          v-tooltip="'6 eventos del expediente'"
          aria-label="6 eventos"
        >
          <i class="pi pi-calendar text-[11px]" aria-hidden="true" />
          6
        </span>
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-default"
          style="background: var(--surface-sunken); color: var(--fg-muted); border: 1px solid var(--surface-border);"
          v-tooltip="'3 notas'"
          aria-label="3 notas"
        >
          <i class="pi pi-comment text-[11px]" aria-hidden="true" />
          3
        </span>
      </div>
    </ExampleFrame>

    <!-- Avatar con tooltip -->
    <ExampleFrame
      title="Avatar con tooltip (asignado)"
      description="Patrón de cockpit: el avatar del abogado a cargo lleva tooltip con el nombre completo."
      :code="codeReactive"
    >
      <div class="flex items-center gap-4">
        <div
          class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white cursor-default"
          style="background: #3b5bdb;"
          v-tooltip.top="'Carlos Mendoza (abogado a cargo)'"
          aria-label="Asignado a Carlos Mendoza"
        >
          CM
        </div>
        <div
          class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white cursor-default"
          style="background: #0ca678;"
          v-tooltip.top="'Ana Torres'"
          aria-label="Asignado a Ana Torres"
        >
          AT
        </div>
        <div
          class="w-9 h-9 rounded-full flex items-center justify-center cursor-default"
          style="background: var(--surface-sunken); border: 1.5px dashed var(--surface-border); color: var(--fg-subtle);"
          v-tooltip.top="'Sin asignar'"
          aria-label="Sin asignar"
        >
          <i class="pi pi-user-plus text-sm" />
        </div>
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
      <a href="https://primevue.org/tooltip/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);">
        <i class="pi pi-external-link text-[10px]" /> Docs PrimeVue Tooltip
      </a>
      <span>·</span>
      <span>Hub: <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">.agents/skills/alega-primevue-components/SKILL.md</code></span>
    </div>
  </div>
</template>
