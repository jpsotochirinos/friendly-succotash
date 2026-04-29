<script setup lang="ts">
import { ref } from 'vue';
import Tag from 'primevue/tag';
import Chip from 'primevue/chip';
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import ExampleFrame from '../../_shared/ExampleFrame.vue';

const chips = ref([
  { label: 'Derecho laboral', icon: 'pi pi-tag' },
  { label: 'Urgente', icon: 'pi pi-exclamation-triangle' },
  { label: 'García Hermanos', icon: 'pi pi-building' },
]);

function removeChip(label: string) {
  chips.value = chips.value.filter((c) => c.label !== label);
}

function resetChips() {
  chips.value = [
    { label: 'Derecho laboral', icon: 'pi pi-tag' },
    { label: 'Urgente', icon: 'pi pi-exclamation-triangle' },
    { label: 'García Hermanos', icon: 'pi pi-building' },
  ];
}

const codeTag = `<!-- Tag en columna de tabla (tipeSeverity mapping) -->
<Tag
  :value="typeLabel(data.type).toLocaleUpperCase()"
  :severity="typeSeverity(data.type)"
  class="matter-type-tag tracking-wide"
/>

<!-- typeSeverity mapping:
  caso      → 'info'
  proceso   → 'warn'
  proyecto  → 'success'
  auditoria → 'secondary'
-->`;

const codeChip = `<!-- Chip editable (tags de expediente, partes) -->
<Chip
  v-for="tag in tags"
  :key="tag"
  :label="tag"
  removable
  @remove="removeTag(tag)"
/>`;

const codeBadge = `<!-- Badge sobre icono de notificaciones -->
<i class="pi pi-bell" v-badge.danger="notifCount" />

<!-- Badge como dot (sin número) -->
<i class="pi pi-bell" v-badge.danger />`;

const antiPatterns = [
  { bad: 'Tag para etiquetas editables por el usuario', good: 'Chip (removable) para entidades que el usuario puede añadir/quitar. Tag solo para clasificaciones read-only.' },
  { bad: 'Badge sin icono o elemento ancla', good: 'Badge siempre sobre un elemento de referencia (icono, botón, avatar).' },
  { bad: 'Badge con > 3 dígitos', good: 'Cap a "99+". Números grandes pierden utilidad como badge.' },
  { bad: 'Tag con texto en minúscula y sin tracking', good: 'Tags de tipo: uppercase + tracking-wide (como en tabla de expedientes).' },
];
</script>

<template>
  <div class="flex flex-col gap-10">
    <!-- Page header -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">
        Componentes / Tag · Chip · Badge
      </p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Tag, Chip, Badge</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
        Tres primitivos distintos: <strong>Tag</strong> = clasificación read-only; <strong>Chip</strong> = entidad editable por el usuario; <strong>Badge</strong> = contador adyacente a un icono o botón.
      </p>
    </div>

    <!-- Tag severities -->
    <ExampleFrame
      title="Tag — severidades"
      description="Las severidades mapean a los tipos de expediente en Alega. UPPERCASE + tracking-wide en tablas."
      :code="codeTag"
    >
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex flex-col items-center gap-1">
          <Tag value="CASO" severity="info" class="tracking-wide" />
          <span class="text-[10px]" style="color: var(--fg-subtle);">info</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <Tag value="PROCESO" severity="warn" class="tracking-wide" />
          <span class="text-[10px]" style="color: var(--fg-subtle);">warn</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <Tag value="PROYECTO" severity="success" class="tracking-wide" />
          <span class="text-[10px]" style="color: var(--fg-subtle);">success</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <Tag value="AUDITORÍA" severity="secondary" class="tracking-wide" />
          <span class="text-[10px]" style="color: var(--fg-subtle);">secondary</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <Tag value="ACTIVO" severity="success" />
          <span class="text-[10px]" style="color: var(--fg-subtle);">status</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <Tag value="ARCHIVADO" severity="warn" />
          <span class="text-[10px]" style="color: var(--fg-subtle);">archived</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <Tag value="ELIMINADO" severity="danger" />
          <span class="text-[10px]" style="color: var(--fg-subtle);">danger</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <Tag value="CONTRASTE" severity="contrast" />
          <span class="text-[10px]" style="color: var(--fg-subtle);">contrast</span>
        </div>
      </div>
    </ExampleFrame>

    <!-- Tag con icono -->
    <ExampleFrame
      title="Tag — con icono"
      description="Tag con icono a la izquierda. Usar sparingly — sólo cuando el icono aporta contexto inmediato."
    >
      <div class="flex flex-wrap gap-3 items-center">
        <Tag value="Vencido" severity="danger" icon="pi pi-exclamation-circle" />
        <Tag value="Esta semana" severity="warn" icon="pi pi-clock" />
        <Tag value="Completado" severity="success" icon="pi pi-check" />
        <Tag value="Borrador" severity="secondary" icon="pi pi-file-edit" />
      </div>
    </ExampleFrame>

    <!-- Chip removable -->
    <ExampleFrame
      title="Chip — editable (removable)"
      description="Para etiquetas que el usuario puede añadir o quitar: tags de expediente, partes, categorías."
      :code="codeChip"
    >
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap gap-2">
          <Chip
            v-for="chip in chips"
            :key="chip.label"
            :label="chip.label"
            :icon="chip.icon"
            removable
            @remove="removeChip(chip.label)"
          />
          <span v-if="chips.length === 0" class="text-sm" style="color: var(--fg-subtle);">
            Todos los chips eliminados.
          </span>
        </div>
        <Button label="Restaurar chips" text size="small" @click="resetChips" />
      </div>
    </ExampleFrame>

    <!-- Chip readonly (info) -->
    <ExampleFrame
      title="Chip — read-only (informativo)"
      description="Sin remove. Para mostrar entidades asociadas sin acción de borrar."
    >
      <div class="flex flex-wrap gap-2">
        <Chip label="Carlos Mendoza" icon="pi pi-user" />
        <Chip label="Grupo Andino S.A.C." icon="pi pi-building" />
        <Chip label="Litigio" icon="pi pi-scale" />
      </div>
    </ExampleFrame>

    <!-- Badge -->
    <ExampleFrame
      title="Badge — contador adyacente"
      description="Overlay sobre icono. Usa la directiva v-badge o el componente Badge con overlay."
      :code="codeBadge"
    >
      <div class="flex flex-wrap items-center gap-8">
        <div class="flex flex-col items-center gap-2">
          <div class="relative inline-flex">
            <i class="pi pi-bell text-2xl" style="color: var(--fg-muted);" v-badge.danger="14" />
          </div>
          <span class="text-[10px]" style="color: var(--fg-subtle);">v-badge.danger</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <div class="relative inline-flex">
            <i class="pi pi-envelope text-2xl" style="color: var(--fg-muted);" v-badge.warn="3" />
          </div>
          <span class="text-[10px]" style="color: var(--fg-subtle);">v-badge.warn</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <div class="relative inline-flex">
            <i class="pi pi-comment text-2xl" style="color: var(--fg-muted);" v-badge.info="7" />
          </div>
          <span class="text-[10px]" style="color: var(--fg-subtle);">v-badge.info</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <div class="relative inline-flex">
            <i class="pi pi-calendar text-2xl" style="color: var(--fg-muted);" v-badge.success="2" />
          </div>
          <span class="text-[10px]" style="color: var(--fg-subtle);">v-badge.success</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Badge value="99+" severity="danger" />
          <span class="text-[10px]" style="color: var(--fg-subtle);">Cap 99+</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <div class="relative inline-flex">
            <i class="pi pi-bell text-2xl" style="color: var(--fg-muted);" v-badge.danger />
          </div>
          <span class="text-[10px]" style="color: var(--fg-subtle);">Dot (sin número)</span>
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
      <a href="https://primevue.org/tag/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> Tag</a>
      <span>·</span>
      <a href="https://primevue.org/chip/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> Chip</a>
      <span>·</span>
      <a href="https://primevue.org/badge/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> Badge</a>
    </div>
  </div>
</template>
