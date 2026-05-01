<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';

const router = useRouter();
const search = ref('');

interface CatalogItem {
  title: string;
  description: string;
  route: string;
  status: 'stable' | 'wip' | 'pending';
  tags: string[];
  section: 'foundation' | 'component' | 'pattern' | 'recipe';
}

const catalog: CatalogItem[] = [
  // ── Foundations ──────────────────────────────────────────────────────────
  {
    title: 'Tipografía',
    description: 'Escala completa de roles tipográficos con Inter: display, H1, H2, eyebrow, body, helper, field-label, error, tabular-nums, code inline.',
    route: '/sandbox/foundations/typography',
    status: 'stable',
    tags: ['inter', 'typography', 'escala', 'eyebrow', 'font-mono-num', 'tabular'],
    section: 'foundation',
  },
  {
    title: 'Tokens (design system)',
    description: 'Paleta de colores, surfaces, foreground, accent, sombras, radius y espaciado. Toggle dark/light in-page.',
    route: '/sandbox/foundations/tokens',
    status: 'stable',
    tags: ['tokens', 'css-vars', 'paleta', 'brand', 'zafiro', 'dark-mode', 'shadows'],
    section: 'foundation',
  },
  {
    title: 'Layout',
    description: 'PageHeader, .app-card, jerarquía de superficies, Divider de sección, dashed subsection y two-column sidebar.',
    route: '/sandbox/foundations/layout',
    status: 'stable',
    tags: ['layout', 'pageheader', 'app-card', 'divider', 'two-column', 'surfaces'],
    section: 'foundation',
  },
  // ── Components ────────────────────────────────────────────────────────────
  {
    title: 'ConfirmDialog',
    description: 'Confirmaciones modales: patrón legacy useConfirm() y nuevo ConfirmDialogBase con variantes danger, warning, success, info.',
    route: '/sandbox/components/confirm-dialog',
    status: 'stable',
    tags: ['confirmdialogbase', 'confirmdialog', 'modal', 'destructivo', 'useconfirm'],
    section: 'component',
  },
  {
    title: 'Dialog (form)',
    description: 'Diálogos de formulario: simple (1 paso) y wizard (3 pasos con stepper horizontal). Headless #container, header degradado, animaciones direccionales, dirty guard.',
    route: '/sandbox/components/dialog',
    status: 'stable',
    tags: ['dialog', 'form', 'wizard', 'stepper', 'headless', 'dirty-guard', 'animations'],
    section: 'component',
  },
  {
    title: 'Informational dialog',
    description:
      'Diálogo de solo lectura: resúmenes, guías, contexto legal. InformationalDialogBase con variantes info, success, warning, neutral; facts, secciones y callout; sin confirmación destructiva.',
    route: '/sandbox/components/informational-dialog',
    status: 'stable',
    tags: ['dialog', 'informational', 'readonly', 'headless', 'matter-dialog', 'guía'],
    section: 'component',
  },
  {
    title: 'Button',
    description: 'Todas las variantes: severidades, solid/outlined/text/link, tamaños, icon-only, cápsula de navegación, rounded, raised, loading, SplitButton, ButtonGroup y patrones de footer.',
    route: '/sandbox/components/button',
    status: 'stable',
    tags: ['button', 'splitbutton', 'icon-only', 'nav-buttons', 'severity', 'loading', 'footer'],
    section: 'component',
  },
  {
    title: 'SelectButton & ToggleButton',
    description: 'SelectButton para 2-4 opciones excluyentes (density, scope, modo) y variante edge-to-edge de toolbar. ToggleButton para binarios.',
    route: '/sandbox/components/selectbutton-toggle',
    status: 'stable',
    tags: ['selectbutton', 'togglebutton', 'density', 'scope', 'edge-to-edge', 'allow-empty'],
    section: 'component',
  },
  {
    title: 'Tooltip',
    description: 'Directiva v-tooltip: posiciones top/right/bottom/left, icon-only buttons, counters, avatares. Reglas de accesibilidad (aria-label complementario).',
    route: '/sandbox/components/tooltip',
    status: 'stable',
    tags: ['tooltip', 'v-tooltip', 'icon-only', 'aria-label', 'counter'],
    section: 'component',
  },
  {
    title: 'Loading states',
    description: 'Skeleton (fila cockpit, tabla, card), ProgressSpinner inline/pantalla y ProgressBar determinate/indeterminate. Reglas de timing.',
    route: '/sandbox/components/loading',
    status: 'stable',
    tags: ['skeleton', 'progressspinner', 'progressbar', 'loading', 'spinner'],
    section: 'component',
  },
  {
    title: 'Tag, Chip, Badge',
    description: 'Tag = clasificación read-only (severity). Chip = entidad editable (removable). Badge = contador adyacente a icono.',
    route: '/sandbox/components/tag-chip-badge',
    status: 'stable',
    tags: ['tag', 'chip', 'badge', 'severity', 'removable', 'v-badge'],
    section: 'component',
  },
  {
    title: 'Avatar & AvatarGroup',
    description: 'Avatares de usuario con hash de color determinista por nombre. Tamaños 24-48px, iniciales, fallback icono, AvatarGroup con overflow +N, watchers.',
    route: '/sandbox/components/avatar',
    status: 'stable',
    tags: ['avatar', 'avatargroup', 'initials', 'hash-color', 'watchers', 'assignee'],
    section: 'component',
  },
  {
    title: 'Menu & Popover',
    description: 'Menu popup con kebab trigger. Popover con filtros activos, saved views, trigger compacto de filtro y contenido custom. Width responsive.',
    route: '/sandbox/components/menu-popover',
    status: 'stable',
    tags: ['menu', 'popover', 'kebab', 'filter-trigger', 'toolbar', 'filters', 'popup'],
    section: 'component',
  },
  {
    title: 'Feedback (Toast, Message)',
    description: 'Toast efímero (tiempos de vida por severity). Message banner persistente. InlineMessage en formularios. Anti-patrones de notificaciones.',
    route: '/sandbox/components/feedback',
    status: 'stable',
    tags: ['toast', 'message', 'inlinemessage', 'usetoast', 'banner', 'notification'],
    section: 'component',
  },
  {
    title: 'Inputs (InputText, Textarea, IconField)',
    description: 'InputText (tamaños, invalid, disabled), Textarea auto-resize, IconField buscador, toolbar search, InputGroup con prefijo/sufijo/botón, font-mono-num.',
    route: '/sandbox/components/inputs',
    status: 'stable',
    tags: ['inputtext', 'textarea', 'iconfield', 'toolbar-search', 'inputgroup', 'font-mono-num', 'search'],
    section: 'component',
  },
  {
    title: 'Select (Dropdown, MultiSelect)',
    description: 'Dropdown simple, con filter, con avatar en slot custom (abogado asignado). MultiSelect con chips. Anti-patrones de < 3 opciones.',
    route: '/sandbox/components/select',
    status: 'stable',
    tags: ['dropdown', 'select', 'multiselect', 'filter', 'avatar-option', 'show-clear'],
    section: 'component',
  },
  {
    title: 'Toggle (Checkbox, Radio, InputSwitch)',
    description: 'Checkbox solo/grupo, RadioButton con fieldset, InputSwitch para preferencias inmediatas. Cuándo usar Switch vs Checkbox.',
    route: '/sandbox/components/toggle',
    status: 'stable',
    tags: ['checkbox', 'radiobutton', 'inputswitch', 'toggle', 'switch', 'preferences'],
    section: 'component',
  },
  {
    title: 'Calendar / DatePicker',
    description: 'Fecha dd/mm/yy, rango, fecha+hora, inline, restricciones (min-date, disabled-days). Locale ES/PE configurado en main.ts.',
    route: '/sandbox/components/calendar',
    status: 'stable',
    tags: ['calendar', 'datepicker', 'date', 'locale', 'range', 'show-icon'],
    section: 'component',
  },
  {
    title: 'Slider & ColorPicker',
    description: 'Slider single (días) y range (montos), con step y marcadores. ColorPicker para personalizar --chip-accent por tipo.',
    route: '/sandbox/components/slider',
    status: 'stable',
    tags: ['slider', 'colorpicker', 'range', 'step', 'chip-accent', 'days'],
    section: 'component',
  },
  // ── Patterns ──────────────────────────────────────────────────────────────
  {
    title: 'Type-chip (filtro de tipo)',
    description: 'Pill con dot + --chip-accent por tipo. Estados idle/hover/active/focus-visible. touch-friendly (min-height 2.75rem). aria-pressed.',
    route: '/sandbox/patterns/type-chip',
    status: 'stable',
    tags: ['type-chip', 'chip-accent', 'filter', 'pill', 'aria-pressed', 'color-mix'],
    section: 'pattern',
  },
  {
    title: 'KPI Card',
    description: 'Tarjeta de métrica: --kpi-accent, número tabular, icono tintado, pulse dot ámbar para urgentes, animación de entrada, prefers-reduced-motion.',
    route: '/sandbox/patterns/kpi-card',
    status: 'stable',
    tags: ['kpi', 'kpi-card', 'metric', 'pulse', 'animation', 'kpi-accent', 'tabular'],
    section: 'pattern',
  },
  {
    title: 'Activity-stat',
    description: 'Mini-rows de estadística: icono + label + número tabular. Para sidebar de detalle de expediente. Color condicional por count.',
    route: '/sandbox/patterns/activity-stat',
    status: 'stable',
    tags: ['activity', 'stat', 'sidebar', 'icon', 'count', 'tabular'],
    section: 'pattern',
  },
  {
    title: 'Involved stack (avatares jerárquicos)',
    description: 'Responsable grande + colaboradores en fila solapada bajo el primario; vacío «Sin asignar»; Popover con desglose. Primitiva aislada de Expediente v2.1.',
    route: '/sandbox/patterns/hierarchical-involved',
    status: 'stable',
    tags: ['involucrados', 'avatar', 'hierarchy', 'popover', 'table-cell', 'expediente'],
    section: 'pattern',
  },
  {
    title: 'Filtro asignado (toolbar)',
    description: 'CalendarFilterTrigger + Popover con checklist, «Asignado a mí» con badge Yo, AvatarGroup en el trigger. Misma pieza que calendario y mesa Expediente v2.1.',
    route: '/sandbox/patterns/workbench-assignee-filter',
    status: 'stable',
    tags: ['assignee', 'filter', 'popover', 'calendar-filter-trigger', 'toolbar', 'multiselect'],
    section: 'pattern',
  },
  {
    title: 'Misc pills & empty states',
    description: 'matter-case-key (pill expediente), dirty-dot (ámbar), counter-chip (icon + count + tooltip), empty states (4 variantes).',
    route: '/sandbox/patterns/misc-pills',
    status: 'stable',
    tags: ['case-key', 'dirty-dot', 'counter-chip', 'empty-state', 'pill', 'mono'],
    section: 'pattern',
  },
  // ── Recipes ───────────────────────────────────────────────────────────────
  {
    title: 'Cockpit (expedientes)',
    description: 'Patrón canónico para EXPEDIENTES: vista priorizada por urgencia (vencidos/esta semana/30 días), status stripe, deadline pill, progreso, densidad cómoda/compacta, filtro asignado y "a mí".',
    route: '/sandbox/recipes/trackables-cockpit',
    status: 'stable',
    tags: ['expedientes', 'cockpit', 'priority', 'urgency', 'lawyer-grade', 'asignado'],
    section: 'recipe',
  },
  {
    title: 'Expediente v2.1',
    description:
      'Mesa workbench: toolbar dos bandas (scope edge-to-edge + señales), búsqueda, filtro asignado (CalendarFilterTrigger), columnas Involucrados (involved-stack), Por hacer (activity-stat como enlaces), plazo. Primitivas aisladas: /sandbox/patterns/hierarchical-involved y /sandbox/patterns/workbench-assignee-filter.',
    route: '/sandbox/recipes/expediente-v21',
    status: 'wip',
    tags: ['expedientes', 'v2.1', 'workbench', 'involved-stack', 'assignee-filter', 'tasks', 'datatable'],
    section: 'recipe',
  },
  {
    title: 'Tabla funcional (CRUD)',
    description: 'Para entidades con CRUD (clientes, usuarios, roles, partes maestras): toolbar con búsqueda + filtros + asignado, scope tabs, DataTable con acciones por fila, Dialog form, ConfirmDialogBase.',
    route: '/sandbox/recipes/data-table-functional',
    status: 'stable',
    tags: ['datatable', 'crud', 'clientes', 'funcional', 'paginator', 'asignado'],
    section: 'recipe',
  },
  {
    title: 'Tabla informativa (read-only)',
    description: 'Para historial/logs/reportes (activity log): cronológica, filtros por categoría/actor/fecha, sin acciones por fila, paginator, chips de acción y categoría.',
    route: '/sandbox/recipes/data-table-informational',
    status: 'stable',
    tags: ['datatable', 'log', 'historial', 'read-only', 'audit', 'activity'],
    section: 'recipe',
  },
];

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return catalog;
  return catalog.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.tags.some((t) => t.includes(q)),
  );
});

const foundations = computed(() => filtered.value.filter((c) => c.section === 'foundation'));
const components = computed(() => filtered.value.filter((c) => c.section === 'component'));
const patterns = computed(() => filtered.value.filter((c) => c.section === 'pattern'));
const recipes = computed(() => filtered.value.filter((c) => c.section === 'recipe'));

const statusLabel: Record<CatalogItem['status'], string> = {
  stable: 'estable',
  wip: 'en progreso',
  pending: 'pendiente',
};
const statusClass: Record<CatalogItem['status'], string> = {
  stable: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  wip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  pending: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

function go(route: string) {
  router.push(route);
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">
          friendly-succotash
        </p>
        <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">
          Biblioteca de componentes
        </h1>
        <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
          Ejemplos interactivos y recetas sin backend ni autenticación.
          Levanta con
          <code class="font-mono text-xs px-1.5 py-0.5 rounded" style="background: var(--surface-sunken);">
            pnpm --filter @tracker/web dev
          </code>
          y abre
          <code class="font-mono text-xs px-1.5 py-0.5 rounded" style="background: var(--surface-sunken);">
            /sandbox
          </code>.
        </p>
      </div>
      <div class="shrink-0">
        <InputText
          v-model="search"
          placeholder="Buscar componente…"
          class="w-60"
          size="small"
        />
      </div>
    </div>

    <!-- No results -->
    <div
      v-if="filtered.length === 0"
      class="flex flex-col items-center gap-2 py-16 text-center"
      style="color: var(--fg-subtle);"
    >
      <i class="pi pi-search text-3xl opacity-50" />
      <p class="m-0">Sin resultados para «{{ search }}»</p>
    </div>

    <!-- Foundations section -->
    <section v-if="foundations.length > 0" class="flex flex-col gap-4">
      <div>
        <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">Foundations</h2>
        <p class="text-xs mt-0.5 m-0" style="color: var(--fg-muted);">Tipografía, tokens de color y patrones de layout base.</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          v-for="item in foundations"
          :key="item.route"
          type="button"
          class="text-left rounded-xl p-4 transition-all cursor-pointer group"
          style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
          @mouseenter="(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)')"
          @mouseleave="(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--surface-border)')"
          @click="go(item.route)"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="font-semibold text-sm group-hover:text-[var(--accent)] transition-colors" style="color: var(--fg-default);">{{ item.title }}</span>
            <span class="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full" :class="statusClass[item.status]">{{ statusLabel[item.status] }}</span>
          </div>
          <p class="text-xs m-0 leading-relaxed" style="color: var(--fg-muted);">{{ item.description }}</p>
          <div class="flex flex-wrap gap-1 mt-3">
            <span v-for="tag in item.tags.slice(0, 4)" :key="tag" class="text-[10px] px-1.5 py-0.5 rounded" style="background: var(--surface-sunken); color: var(--fg-subtle);">{{ tag }}</span>
          </div>
        </button>
      </div>
    </section>

    <!-- Components section -->
    <section v-if="components.length > 0" class="flex flex-col gap-4">
      <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">Componentes</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          v-for="item in components"
          :key="item.route"
          type="button"
          class="text-left rounded-xl p-4 transition-all cursor-pointer group"
          style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
          @mouseenter="(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)')"
          @mouseleave="(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--surface-border)')"
          @click="go(item.route)"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="font-semibold text-sm group-hover:text-[var(--accent)] transition-colors" style="color: var(--fg-default);">
              {{ item.title }}
            </span>
            <span class="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full" :class="statusClass[item.status]">
              {{ statusLabel[item.status] }}
            </span>
          </div>
          <p class="text-xs m-0 leading-relaxed" style="color: var(--fg-muted);">
            {{ item.description }}
          </p>
          <div class="flex flex-wrap gap-1 mt-3">
            <span
              v-for="tag in item.tags.slice(0, 4)"
              :key="tag"
              class="text-[10px] px-1.5 py-0.5 rounded"
              style="background: var(--surface-sunken); color: var(--fg-subtle);"
            >
              {{ tag }}
            </span>
          </div>
        </button>
      </div>
    </section>

    <!-- Patterns section -->
    <section v-if="patterns.length > 0" class="flex flex-col gap-4">
      <div>
        <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">Patrones Alega</h2>
        <p class="text-xs mt-0.5 m-0" style="color: var(--fg-muted);">Combinaciones específicas de Alega no cubiertas por PrimeVue puro.</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          v-for="item in patterns"
          :key="item.route"
          type="button"
          class="text-left rounded-xl p-4 transition-all cursor-pointer group"
          style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
          @mouseenter="(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)')"
          @mouseleave="(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--surface-border)')"
          @click="go(item.route)"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="font-semibold text-sm group-hover:text-[var(--accent)] transition-colors" style="color: var(--fg-default);">{{ item.title }}</span>
            <span class="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full" :class="statusClass[item.status]">{{ statusLabel[item.status] }}</span>
          </div>
          <p class="text-xs m-0 leading-relaxed" style="color: var(--fg-muted);">{{ item.description }}</p>
          <div class="flex flex-wrap gap-1 mt-3">
            <span v-for="tag in item.tags.slice(0, 4)" :key="tag" class="text-[10px] px-1.5 py-0.5 rounded" style="background: var(--surface-sunken); color: var(--fg-subtle);">{{ tag }}</span>
          </div>
        </button>
      </div>
    </section>

    <!-- Recipes section -->
    <section v-if="recipes.length > 0" class="flex flex-col gap-4">
      <div>
        <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">Recetas</h2>
        <p class="text-xs mt-0.5 m-0" style="color: var(--fg-muted);">
          Clones mock de vistas reales. Mismos componentes, datos simulados.
        </p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          v-for="item in recipes"
          :key="item.route"
          type="button"
          class="text-left rounded-xl p-4 transition-all cursor-pointer group"
          style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
          @mouseenter="(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)')"
          @mouseleave="(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--surface-border)')"
          @click="go(item.route)"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="font-semibold text-sm" style="color: var(--fg-default);">{{ item.title }}</span>
            <span class="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full" :class="statusClass[item.status]">
              {{ statusLabel[item.status] }}
            </span>
          </div>
          <p class="text-xs m-0 leading-relaxed" style="color: var(--fg-muted);">{{ item.description }}</p>
          <div class="flex flex-wrap gap-1 mt-3">
            <span
              v-for="tag in item.tags.slice(0, 5)"
              :key="tag"
              class="text-[10px] px-1.5 py-0.5 rounded"
              style="background: var(--surface-sunken); color: var(--fg-subtle);"
            >
              {{ tag }}
            </span>
          </div>
        </button>
      </div>
    </section>

    <!-- How to add -->
    <section
      class="rounded-xl p-5 text-sm"
      style="border: 1px dashed var(--surface-border); color: var(--fg-muted);"
    >
      <p class="m-0 font-semibold mb-3" style="color: var(--fg-default);">¿Cómo añadir un nuevo demo?</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p class="m-0 text-xs font-semibold mb-2" style="color: var(--fg-default);">Estructura de carpetas</p>
          <ul class="list-none p-0 m-0 space-y-1 text-xs" style="color: var(--fg-muted);">
            <li><code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">foundations/&lt;Nombre&gt;/&lt;Nombre&gt;Sandbox.vue</code></li>
            <li><code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">components/&lt;Nombre&gt;/&lt;Nombre&gt;Sandbox.vue</code></li>
            <li><code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">patterns/&lt;Nombre&gt;/&lt;Nombre&gt;Sandbox.vue</code></li>
            <li><code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">recipes/&lt;Nombre&gt;/&lt;Nombre&gt;Sandbox.vue</code></li>
          </ul>
        </div>
        <div>
          <p class="m-0 text-xs font-semibold mb-2" style="color: var(--fg-default);">Checklist de registro</p>
          <ol class="list-decimal list-inside m-0 p-0 space-y-1 text-xs" style="color: var(--fg-muted);">
            <li>Añadir ruta en <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">router/index.ts</code></li>
            <li>Añadir entrada al catálogo en <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">SandboxHome.vue</code> (array <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">catalog</code>)</li>
            <li>Añadir link en <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">SandboxLayout.vue</code> (array <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">navGroups</code>)</li>
            <li>Actualizar <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">.agents/skills/alega-primevue-components/SKILL.md</code></li>
          </ol>
        </div>
      </div>
    </section>
  </div>
</template>
