<script setup lang="ts">
import ExampleFrame from '../../_shared/ExampleFrame.vue';

const typeScale = [
  {
    role: 'Display',
    sample: 'Bienvenido a Alega',
    class: 'text-3xl font-semibold tracking-tight',
    color: 'var(--fg-default)',
    spec: 'text-3xl font-semibold tracking-tight',
    size: '30px',
    use: 'Onboarding / landing únicamente',
    note: 'Raramente usado. No en vistas lawyer-grade.',
  },
  {
    role: 'Page title H1',
    sample: 'Expedientes',
    class: 'text-xl sm:text-2xl font-semibold leading-tight',
    color: 'var(--fg-default)',
    spec: 'text-xl sm:text-2xl font-semibold leading-tight',
    size: '20–24px',
    use: 'PageHeader — Tier 2 de cada vista',
    note: 'Un solo H1 por vista. Sin font-bold.',
  },
  {
    role: 'Section H2',
    sample: 'Componentes',
    class: 'text-base font-semibold',
    color: 'var(--fg-default)',
    spec: 'text-base font-semibold',
    size: '16px',
    use: 'Título de sección en sandbox y settings',
    note: '',
  },
  {
    role: 'Card / dialog title',
    sample: 'Nuevo expediente',
    class: 'text-[1.0625rem] font-semibold leading-tight',
    color: 'var(--fg-default)',
    spec: 'text-[1.0625rem] font-semibold leading-tight',
    size: '17px',
    use: 'Dialog title (.matter-dialog-title), card h3',
    note: 'No usar text-lg ni text-xl en modales.',
  },
  {
    role: 'Eyebrow (brand)',
    sample: 'ASISTENTE · 3 PASOS',
    class: 'text-[0.6875rem] font-semibold uppercase tracking-[0.06em]',
    color: 'var(--brand-zafiro)',
    spec: 'text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--brand-zafiro)]',
    size: '11px',
    use: 'Dialog eyebrow, paso de wizard (.matter-dialog-eyebrow)',
    note: 'Color var(--brand-zafiro) claro / var(--accent) dark.',
  },
  {
    role: 'Eyebrow (page)',
    sample: 'friendly-succotash',
    class: 'text-xs font-semibold uppercase tracking-widest',
    color: 'var(--fg-subtle)',
    spec: 'text-xs font-semibold uppercase tracking-widest text-[var(--fg-subtle)]',
    size: '12px',
    use: 'Eyebrow sobre PageHeader en sandbox (muted)',
    note: '',
  },
  {
    role: 'Subtitle / lead',
    sample: 'Ejemplos interactivos sin backend ni autenticación.',
    class: 'text-sm',
    color: 'var(--fg-muted)',
    spec: 'text-sm text-[var(--fg-muted)] mt-1',
    size: '14px',
    use: 'Subtítulo bajo H1 (PageHeader subtitle)',
    note: '',
  },
  {
    role: 'Body',
    sample: 'Completar el título del expediente para poder continuar.',
    class: 'text-sm',
    color: 'var(--fg-default)',
    spec: 'text-sm text-[var(--fg-default)]',
    size: '14px',
    use: 'Párrafos, descripciones, cuerpo de formularios',
    note: '',
  },
  {
    role: 'Step hint',
    sample: 'Identidad del expediente',
    class: 'text-[0.8125rem]',
    color: 'var(--fg-muted)',
    spec: 'text-[0.8125rem] text-[var(--fg-muted)]',
    size: '13px',
    use: '.matter-dialog-stephint — hint bajo el título del dialog',
    note: '',
  },
  {
    role: 'Field label',
    sample: 'Título del expediente',
    class: 'text-[0.8125rem] font-medium',
    color: 'var(--fg-default)',
    spec: 'text-[0.8125rem] font-medium (.matter-field-label)',
    size: '13px',
    use: 'Labels de campos en formularios',
    note: 'Nunca font-bold en labels.',
  },
  {
    role: 'Helper',
    sample: 'Opcional. Podrás vincularlo después desde el detalle.',
    class: 'text-xs',
    color: 'var(--fg-subtle)',
    spec: 'text-xs text-[var(--fg-subtle)] (.matter-field-help)',
    size: '12px',
    use: 'Helper text debajo de campos de formulario',
    note: '',
  },
  {
    role: 'Caption / table header',
    sample: 'EXPEDIENTE',
    class: 'text-[0.6875rem] font-semibold uppercase tracking-[0.06em]',
    color: 'var(--fg-subtle)',
    spec: 'text-[0.6875rem] font-semibold uppercase tracking-[0.06em] font-feature-settings: tnum',
    size: '11px',
    use: 'Encabezados de columna en DataTable',
    note: 'Activa tnum para alineación de columnas numéricas.',
  },
  {
    role: 'Tag chip text',
    sample: 'CASO',
    class: 'text-[10px] font-medium uppercase tracking-wide',
    color: 'var(--fg-default)',
    spec: 'text-[10px] font-medium uppercase tracking-wide',
    size: '10px',
    use: 'Pills de tipo, severity chips, status tags',
    note: '',
  },
  {
    role: 'Code inline',
    sample: 'font-mono-num',
    class: 'font-mono text-xs px-1.5 py-0.5 rounded',
    color: 'var(--fg-default)',
    spec: 'font-mono text-xs px-1.5 py-0.5 rounded bg-[var(--surface-sunken)]',
    size: '12px',
    use: 'Fragmentos de código en docs y sandbox',
    note: 'Background var(--surface-sunken).',
  },
];

const antiPatterns = [
  { bad: 'font-bold en títulos de modal o formulario', good: 'font-semibold (máximo peso en UI lawyer-grade)' },
  { bad: 'text-2xl o text-xl en card/dialog titles', good: 'text-[1.0625rem] — card title canónico' },
  { bad: 'font-mono para texto general', good: 'font-mono sólo para código; font-mono-num para números legales (tnum)' },
  { bad: 'Literals directos en plantilla («Título», «Cancelar»)', good: 'Todo a través de t() — i18n obligatorio' },
  { bad: 'Colores hex o Tailwind color-* en texto', good: 'var(--fg-default), var(--fg-muted), var(--fg-subtle), var(--brand-zafiro), var(--accent)' },
  { bad: 'H1 múltiple en una vista', good: 'Un solo H1 (PageHeader), secciones usan H2/H3' },
];

const codeMonoNum = `<!-- Números legales (expediente, fechas, montos) -->
<InputText class="font-mono-num" v-model="expedientNumber" />

<!-- .font-mono-num aplica solo feature settings, NO cambia fuente -->
<style scoped>
.font-mono-num :deep(.p-inputtext) {
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: 0.01em;
}
</style>`;

const codeEyebrow = `<!-- Eyebrow en dialog header -->
<span class="matter-dialog-eyebrow">
  {{ t('trackables.matterDialog.eyebrowCreate') }}
</span>

<!-- CSS canónico -->
.matter-dialog-eyebrow {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--brand-zafiro);
}
html.dark .matter-dialog-eyebrow {
  color: var(--accent);
}`;
</script>

<template>
  <div class="flex flex-col gap-10">
    <!-- Page header -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">
        Foundations / Typography
      </p>
      <h1 class="text-xl sm:text-2xl font-semibold leading-tight m-0" style="color: var(--fg-default);">Escala tipográfica</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
        Todos los roles tipográficos de Alega con Inter. Anclados a tokens de color semántico y clases Tailwind canónicas.
        Requiere Inter cargado (ver <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-sunken);">index.html</code>).
      </p>
    </div>

    <!-- Aviso Inter -->
    <div
      class="flex gap-3 rounded-lg px-4 py-3 text-sm"
      style="border: 1px solid var(--surface-border); background: var(--accent-soft); color: var(--fg-default);"
    >
      <i class="pi pi-info-circle shrink-0 mt-0.5" style="color: var(--accent);" />
      <p class="m-0">
        La fuente <strong>Inter</strong> se carga desde <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-raised);">rsms.me/inter</code>.
        Para offline-first: <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-raised);">pnpm --filter @tracker/web add @fontsource-variable/inter</code>
        y <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-raised);">import '@fontsource-variable/inter';</code> en <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-raised);">main.ts</code>.
      </p>
    </div>

    <!-- Tabla de escala -->
    <ExampleFrame
      title="Escala completa renderizada"
      description="Cada fila muestra el estilo en vivo, la clase Tailwind canónica y el tamaño en px."
    >
      <div class="flex flex-col gap-0 overflow-x-auto">
        <div
          class="grid gap-4 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider border-b"
          style="grid-template-columns: 160px 1fr 220px; color: var(--fg-subtle); border-color: var(--surface-border);"
        >
          <span>Rol</span>
          <span>Muestra</span>
          <span>Clase / spec</span>
        </div>
        <div
          v-for="item in typeScale"
          :key="item.role"
          class="grid gap-4 px-3 py-3 border-b hover:bg-[var(--surface-sunken)] transition-colors"
          style="grid-template-columns: 160px 1fr 220px; border-color: var(--surface-border);"
        >
          <div class="flex flex-col gap-0.5">
            <span class="text-xs font-semibold" style="color: var(--fg-default);">{{ item.role }}</span>
            <span class="text-[11px]" style="color: var(--fg-subtle);">{{ item.size }}</span>
          </div>
          <div
            :class="item.class"
            :style="{ color: item.color, ...(item.role === 'Code inline' ? { background: 'var(--surface-sunken)' } : {}) }"
          >
            {{ item.sample }}
          </div>
          <div class="flex flex-col gap-0.5">
            <code
              class="text-[10px] font-mono leading-relaxed break-words"
              style="color: var(--fg-muted);"
            >{{ item.spec }}</code>
            <span v-if="item.note" class="text-[10px]" style="color: var(--fg-subtle);">{{ item.note }}</span>
          </div>
        </div>
      </div>
    </ExampleFrame>

    <!-- Tabular numbers -->
    <ExampleFrame
      title="Números legales (font-mono-num)"
      description="Clase utilitaria que activa font-feature-settings: tnum + lnum. NO cambia la fuente a monospace. Obligatorio en n.º expediente, fechas en tabla, montos."
      :code="codeMonoNum"
    >
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold" style="color: var(--fg-subtle);">Sin font-mono-num (default)</span>
          <div class="flex flex-col gap-1 text-sm" style="color: var(--fg-default);">
            <span>01234-2024-0-1801-JR-CI-05</span>
            <span>01111-2024-0-1801-JR-CI-12</span>
            <span>01000-2024-0-1801-JR-CI-01</span>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold" style="color: var(--fg-subtle);">Con font-mono-num (tnum + lnum)</span>
          <div
            class="flex flex-col gap-1 text-sm"
            style="color: var(--fg-default); font-feature-settings: 'tnum' 1, 'lnum' 1; font-variant-numeric: tabular-nums lining-nums; letter-spacing: 0.01em;"
          >
            <span>01234-2024-0-1801-JR-CI-05</span>
            <span>01111-2024-0-1801-JR-CI-12</span>
            <span>01000-2024-0-1801-JR-CI-01</span>
          </div>
        </div>
      </div>
    </ExampleFrame>

    <!-- Eyebrow detail -->
    <ExampleFrame
      title="Eyebrow variants"
      description="Dos variantes del eyebrow: brand (zafiro/accent) para dialogs, page (muted) para sandbox y encabezados de sección."
      :code="codeEyebrow"
    >
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-1">
          <span class="text-xs" style="color: var(--fg-subtle);">Brand eyebrow — dialogs y wizard</span>
          <span
            class="text-[0.6875rem] font-semibold uppercase tracking-[0.06em]"
            style="color: var(--brand-zafiro);"
          >ASISTENTE · 3 PASOS</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs" style="color: var(--fg-subtle);">Page eyebrow — sandbox y secciones</span>
          <span
            class="text-xs font-semibold uppercase tracking-widest"
            style="color: var(--fg-subtle);"
          >friendly-succotash</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs" style="color: var(--fg-subtle);">Required asterisk + error inline</span>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">
              Título <span style="color: #dc2626;">*</span>
            </span>
            <span class="text-xs" style="color: #dc2626;">El título es obligatorio.</span>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs" style="color: var(--fg-subtle);">Dirty-dot inline + helper text</span>
          <div class="flex items-center gap-1.5">
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span class="text-[0.8125rem]" style="color: #d97706;">Cambios sin guardar</span>
          </div>
          <span class="text-xs" style="color: var(--fg-subtle);">Opcional. Podrás vincularlo después desde el detalle.</span>
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
            <tr
              v-for="(row, i) in antiPatterns"
              :key="i"
              style="border-bottom: 1px solid var(--surface-border);"
            >
              <td class="px-4 py-2.5" style="color: #dc2626;">{{ row.bad }}</td>
              <td class="px-4 py-2.5" style="color: var(--fg-default);">{{ row.good }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer links -->
    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <span>Skill: <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">.agents/skills/alega-ui-coherence/SKILL.md</code></span>
      <span>·</span>
      <span>Tokens: <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">/sandbox/foundations/tokens</code></span>
    </div>
  </div>
</template>
