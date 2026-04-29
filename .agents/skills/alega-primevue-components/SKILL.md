---
name: alega-primevue-components
description: >
  Índice maestro de componentes PrimeVue usados en Alega (Vue 3, PrimeVue 4, Tailwind).
  Patrones canónicos específicos del proyecto: imports explícitos, tokens de marca, preset
  AlegaPreset (Aura), locale primeVueLocaleEs. Covers: ConfirmDialog (legacy + ConfirmDialogBase),
  DataTable, Dialog, Button, Tag, SelectButton, Skeleton, Popover, Menu, Toast, Steps,
  Calendar/DatePicker, InputText, Textarea, Dropdown/Select, IconField, InputIcon.
  Usar como referencia antes de implementar cualquier componente PrimeVue en el proyecto.
---

# Alega — Componentes PrimeVue (índice canónico)

Sandbox en vivo: `pnpm --filter @tracker/web dev` → `/sandbox` (sin login, sin API).

Cargar siempre junto con [alega-ui-context](../alega-ui-context/SKILL.md) y [alega-ui-coherence](../alega-ui-coherence/SKILL.md).

## Configuración base del proyecto

PrimeVue está configurado globalmente en `apps/web/src/main.ts`:

```ts
app.use(PrimeVue, {
  ripple: true,
  locale: primeVueLocaleEs,
  theme: {
    preset: AlegaPreset,           // Aura-based custom, en src/theme/alegaPreset.ts
    options: { darkModeSelector: '.dark' },
  },
});
app.use(ToastService);
app.use(ConfirmationService);
app.directive('tooltip', Tooltip);
```

**Regla: imports explícitos.** No se usa `unplugin-vue-components` / auto-import. Cada componente se importa a mano:

```ts
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
// etc.
```

---

## Foundations (tipografía, tokens, layout)

| Foundation | Sandbox | Notas |
|------------|---------|-------|
| **Tipografía** — escala completa | `/sandbox/foundations/typography` | Roles: display, H1, eyebrow, body, label, helper, error, tabular. |
| **Tokens** — paleta + surfaces | `/sandbox/foundations/tokens` | Todas las `--*` vars de `assets/main.css`. Toggle dark/light. |
| **Layout** — PageHeader, .app-card | `/sandbox/foundations/layout` | Surfaces anidadas, Divider, two-column. |

## Índice de componentes

| Componente | Ruta PrimeVue | Sandbox | Skill específica |
|------------|---------------|---------|-----------------|
| **ConfirmDialog** (legacy) | `primevue/confirmdialog` | `/sandbox/components/confirm-dialog` | — |
| **ConfirmDialogBase** (nuevo) | componente local | `/sandbox/components/confirm-dialog` | [alega-confirm-dialog](../alega-confirm-dialog/SKILL.md) |
| **Tabla funcional CRUD** | `primevue/datatable` | `/sandbox/recipes/data-table-functional` | [alega-datatable](../alega-datatable/SKILL.md) (variante A) |
| **Cockpit Priority Inbox** | Vue puro + CSS Grid | `/sandbox/recipes/trackables-cockpit` | [alega-datatable](../alega-datatable/SKILL.md) (variante B) |
| **Tabla informativa read-only** | `primevue/datatable` | `/sandbox/recipes/data-table-informational` | [alega-datatable](../alega-datatable/SKILL.md) (variante C) |
| **Dialog (form simple)** | `primevue/dialog` | `/sandbox/components/dialog` | [alega-form-dialog](../alega-form-dialog/SKILL.md) |
| **Dialog (form wizard)** | `primevue/dialog` | `/sandbox/components/dialog` | [alega-form-dialog](../alega-form-dialog/SKILL.md) |
| **InformationalDialogBase** | componente local | `/sandbox/components/informational-dialog` | [alega-informational-dialog](../alega-informational-dialog/SKILL.md) |
| **Button** | `primevue/button` | `/sandbox/components/button` | — |
| **SelectButton / ToggleButton** | `primevue/selectbutton`, `primevue/togglebutton` | `/sandbox/components/selectbutton-toggle` | — |
| **Tooltip** | directiva `v-tooltip` | `/sandbox/components/tooltip` | — |
| **Skeleton / ProgressSpinner / ProgressBar** | `primevue/skeleton`, etc. | `/sandbox/components/loading` | — |
| **Tag / Chip / Badge** | `primevue/tag`, `primevue/chip`, `primevue/badge` | `/sandbox/components/tag-chip-badge` | — |
| **Avatar / AvatarGroup** | `primevue/avatar`, `primevue/avatargroup` | `/sandbox/components/avatar` | — |
| **Menu / Popover** | `primevue/menu`, `primevue/popover` | `/sandbox/components/menu-popover` | — |
| **Toast / Message / InlineMessage** | `primevue/toast`, `primevue/message` | `/sandbox/components/feedback` | — |
| **InputText / Textarea / IconField / InputGroup** | varios | `/sandbox/components/inputs` | — |
| **Dropdown / Select / MultiSelect** | varios | `/sandbox/components/select` | — |
| **Checkbox / RadioButton / InputSwitch** | varios | `/sandbox/components/toggle` | — |
| **Calendar / DatePicker** | `primevue/calendar`, `primevue/datepicker` | `/sandbox/components/calendar` | — |
| **Slider / ColorPicker** | `primevue/slider`, `primevue/colorpicker` | `/sandbox/components/slider` | — |
| **Steps** | `primevue/steps` | (ver Dialog wizard) | [alega-form-dialog](../alega-form-dialog/SKILL.md) |
| **Paginator** | `primevue/paginator` | `/sandbox/recipes/trackables-list` | — |

## Patrones bespoke Alega

| Patrón | Sandbox | Descripción |
|--------|---------|-------------|
| **type-chip** | `/sandbox/patterns/type-chip` | Pill con dot + `--chip-accent`. Filter de tipo en toolbar. |
| **kpi-card** | `/sandbox/patterns/kpi-card` | Tarjeta métrica con `--kpi-accent`, pulse dot, animación. |
| **activity-stat** | `/sandbox/patterns/activity-stat` | Mini-rows icon + label + número. Sidebar de expediente. |
| **misc-pills** | `/sandbox/patterns/misc-pills` | case-key, dirty-dot, counter-chip, empty-states. |

---

## ConfirmDialog (patrón legacy — migrar)

El `<ConfirmDialog />` global de PrimeVue junto con `useConfirm().require()`. Aún presente en partes del codebase; **no usar en código nuevo**.

```ts
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

confirm.require({
  message: `¿Eliminar «${item.title}»?`,
  header: 'Eliminar documento',
  icon: 'pi pi-exclamation-triangle',
  acceptClass: 'p-button-danger',
  acceptLabel: 'Eliminar',
  rejectLabel: 'Cancelar',
  accept: async () => {
    try {
      await api.delete(item.id);
      toast.add({ severity: 'info', summary: 'Eliminado', life: 3000 });
    } catch {
      toast.add({ severity: 'error', summary: 'Error al eliminar', life: 4000 });
    }
  },
});

// En el template (una sola vez, fuera de v-if):
// <ConfirmDialog />
```

**Sandbox:** `/sandbox/components/confirm-dialog` — ver patrones legacy y migración.

---

## ConfirmDialogBase (patrón actual — usar siempre)

Componente local: `@/components/common/ConfirmDialogBase.vue`. Ver skill completa en [alega-confirm-dialog](../alega-confirm-dialog/SKILL.md).

```vue
<ConfirmDialogBase
  v-model:visible="showArchive"
  variant="warning"
  :title="t('trackables.archiveConfirmHeader')"
  :subject="`«${row.title}»`"
  :message="t('trackables.archiveConfirmMessage')"
  :consequences="archiveConsequences"
  :consequences-title="t('trackables.confirmConsequencesTitle')"
  :confirm-label="t('trackables.archiveActionLabel')"
  :loading="archiving"
  @confirm="onArchive"
/>
```

**Variantes:** `danger` | `warning` | `info` | `success`
**Sandbox:** `/sandbox/components/confirm-dialog` — sección ConfirmDialogBase.

---

## DataTable — 3 patrones canónicos

Ver skill completa en [alega-datatable](../alega-datatable/SKILL.md). **TRES variantes:**

| Variante | Sandbox | Para |
|----------|---------|------|
| **A — Tabla funcional** | `/sandbox/recipes/data-table-functional` | Clientes, usuarios, roles, partes, plantillas |
| **B — Cockpit (urgencia)** | `/sandbox/recipes/trackables-cockpit` | **Solo expedientes** y similares con plazos |
| **C — Tabla informativa** | `/sandbox/recipes/data-table-informational` | Activity log, historial, audit, reportes |

**Regla rápida:** ¿el usuario interactúa con cada fila?
- Sí, con CRUD → A · Sí, con plazos → B · No, solo lee → C.

Props mínimas para A y C:

```vue
<DataTable
  :value="rows"
  data-key="id"
  size="small"
  row-hover
  responsive-layout="scroll"
  class="flex-1 functional-table"
>
  <template #empty><EmptyState ... /></template>
</DataTable>
```

**Reglas comunes:**
- Siempre dentro de `.app-card.flex.flex-col.overflow-hidden.table-card` con `max-height` para scroll interno.
- `Skeleton` cuando `loading` (no solo en first-load).
- `Paginator` fuera del `<DataTable>`, en footer con `border-top`. **Siempre visible cuando hay registros.**
- Toolbar con: búsqueda + filtros (Dropdown con `show-clear`) + pill "A mí" + botón "Limpiar filtros" cuando hay filtros activos.
- Acciones de fila (variante A): `Button` outlined + rounded + severity.
- **NO** poner `<Column header="X">` + `<template #header>X</template>` (header duplicado).

---

## Dialog (formulario)

Ver skill completa en [alega-form-dialog](../alega-form-dialog/SKILL.md). Dos patrones canónicos:

- **Form simple** (1 paso, < 8 campos) — width `min(520px, 96vw)`
- **Form wizard** (2-3 pasos con stepper horizontal + animación direccional) — width `min(640px, 96vw)`

Ambos usan `#container` headless para evitar el padding de `.p-dialog-content`, header con degradado de marca (zafiro 7% → transparente), botón cerrar custom y footer propio.

```vue
<Dialog
  v-model:visible="open"
  :modal="true"
  :draggable="false"
  :dismissable-mask="!loading && !isDirty"
  :closable="false"
  :close-on-escape="!loading"
  :style="{ width: 'min(640px, 96vw)' }"
  :pt="{
    mask: { class: 'alega-confirm-mask' },
    root: { class: 'matter-dialog-root !border-0 !bg-transparent !p-0 !m-0 !shadow-none overflow-visible' },
  }"
>
  <template #container>
    <div class="matter-dialog-shell">
      <header class="matter-dialog-header"> ... </header>
      <div class="matter-dialog-steps"> ... </div>      <!-- solo wizard -->
      <div class="matter-dialog-body">
        <Transition :name="stepTransitionName" mode="out-in">  <!-- solo wizard -->
          <section v-if="step === 0" key="step-0">...</section>
          <!-- ... -->
        </Transition>
      </div>
      <footer class="matter-dialog-footer"> ... </footer>
    </div>
  </template>
</Dialog>
```

**Sandbox:** `/sandbox/components/dialog` — dos demos lado a lado.
**Receta:** `/sandbox/recipes/trackables-list` — dialogs crear (wizard) y editar (simple) integrados con DataTable.

---

## Dialog informativo (solo lectura)

Componente local: `@/components/common/InformationalDialogBase.vue`. Misma familia visual que el form dialog (headless `#container`, footer propio), pero **sin inputs**. Eyebrow, icono y callout llevan el color de la variante; el botón «Entendido» lleva `severity` por variante (`info` / `success` / `warn`) igual que el confirm de `ConfirmDialogBase`. El **degradado del header** también cambia por variante. Soporta `message`, `sections`, `facts`, `callout` opcional. Ver skill completa en [alega-informational-dialog](../alega-informational-dialog/SKILL.md).

**Sandbox:** `/sandbox/components/informational-dialog`.

```vue
<InformationalDialogBase
  v-model:visible="showGuide"
  variant="info"
  eyebrow="Guía"
  title="Cómo revisar un documento"
  :message="t('reviews.guideIntro')"
  :sections="guideSections"
  close-label="Entendido"
  close-aria-label="Cerrar"
/>
```

**Cuándo no usarlo:** si necesitás confirmar una acción → `ConfirmDialogBase`; si necesitás capturar datos → `Dialog` formulario según [alega-form-dialog](../alega-form-dialog/SKILL.md).

---

## Button

Severidades disponibles en Alega:

| Severity | Cuándo | Ejemplo |
|----------|--------|---------|
| *(default)* | Acción principal de marca | `<Button label="Crear" icon="pi pi-plus" />` |
| `secondary` | Acción neutral / editar | `severity="secondary"` |
| `warn` | Archivar, deshabilitar | `severity="warn"` |
| `success` | Reactivar, aprobar | `severity="success"` |
| `danger` | Eliminar permanente | `severity="danger"` |
| `info` | Confirmación neutra | `severity="info"` |

Para acciones de fila en DataTable usar siempre `variant="outlined"` + `rounded` + `size="small"`.

---

## Tag

Mapeo de severidades para tipos y estados de expediente:

```ts
// Tipos de seguimiento
const typeSeverity = {
  caso: 'info',
  proceso: 'warn',
  proyecto: 'success',
  auditoria: 'secondary',
} as const;

// Estados
const statusSeverity = {
  active: 'success',
  archived: 'warn',
  trash: 'danger',
} as const;
```

```vue
<Tag :value="typeLabel[row.type]" :severity="typeSeverity[row.type]" />
```

---

## SelectButton (scope tabs)

Patrón de tabs de scope (activos / archivados / papelera):

```vue
<SelectButton
  v-model="listScope"
  :options="scopeOptions"
  option-label="label"
  option-value="value"
  :allow-empty="false"
  class="scope-tabs"
/>
```

```ts
const scopeOptions = [
  { label: 'Activos', value: 'active' },
  { label: 'Archivados', value: 'archived' },
  { label: 'Papelera', value: 'trash' },
];
```

---

## Skeleton

Para tablas, reservar altura mínima para evitar layout jumps:

```vue
<div v-if="loading" class="min-h-[420px]">
  <div v-for="row in 8" :key="row" class="grid grid-cols-[...] gap-4 px-4 py-4 border-b">
    <div class="flex items-center gap-3">
      <Skeleton shape="circle" size="2.25rem" />
      <div class="flex-1 flex flex-col gap-2">
        <Skeleton height="0.9rem" width="80%" />
        <Skeleton height="0.7rem" width="55%" />
      </div>
    </div>
    <Skeleton height="1.4rem" width="5.5rem" border-radius="999px" />
  </div>
</div>
```

---

## Toast

Montado una vez en `SandboxLayout.vue` (y en `AppLayout.vue` en producción):

```vue
<Toast />   <!-- en el layout, nunca en views individuales -->
```

Uso en scripts:

```ts
import { useToast } from 'primevue/usetoast';
const toast = useToast();

toast.add({ severity: 'success', summary: 'Expediente archivado', life: 3000 });
toast.add({ severity: 'error', summary: 'Error al archivar', detail: err.message, life: 5000 });
toast.add({ severity: 'info', summary: 'Guardado', life: 2500 });
```

---

## IconField + InputIcon (buscador)

Para la barra de búsqueda del DataTable:

```vue
<IconField>
  <InputIcon class="pi pi-search text-[var(--fg-subtle)]" />
  <InputText
    v-model="searchQuery"
    placeholder="Buscar expedientes…"
    autocomplete="off"
    @input="onSearch"
  />
</IconField>
```

---

## Popover

Para filtros avanzados y popovers de acciones:

```vue
<Popover ref="filterPopoverRef">
  <div class="p-3 flex flex-col gap-3 w-64">
    <!-- contenido del popover -->
  </div>
</Popover>

<Button
  icon="pi pi-filter"
  variant="outlined"
  severity="secondary"
  size="small"
  @click="(e) => filterPopoverRef?.toggle(e)"
/>
```

---

## Menu

Para el menú de overflow (kebab) en toolbars y filas:

```vue
<Menu ref="menuRef" :model="menuItems" popup />
<Button icon="pi pi-ellipsis-h" text rounded @click="(e) => menuRef?.toggle(e)" />
```

```ts
const menuItems = [
  { label: 'Exportar CSV', icon: 'pi pi-download', command: () => exportCsv() },
  { label: 'Densidad compacta', icon: 'pi pi-compress', command: () => toggleDensity() },
  { separator: true },
  { label: 'Columnas visibles', icon: 'pi pi-eye', command: () => showColumns() },
];
```

---

## Steps (wizard)

Para wizards de 2-3 pasos en diálogos de formulario:

```vue
<Steps
  :model="wizardSteps"
  :active-step="currentStep"
  class="matter-dialog-steps"
/>
```

```ts
const wizardSteps = [
  { label: 'Identidad' },
  { label: 'Partes' },
  { label: 'Plantilla' },
];
```

---

## Paginator

Siempre fuera del `<DataTable>`, en el footer del card:

```vue
<div class="border-t border-[var(--surface-border)] bg-[var(--surface-raised)]">
  <Paginator
    :rows="pageSize"
    :total-records="totalRecords"
    :rows-per-page-options="[10, 25, 50]"
    :first="(currentPage - 1) * pageSize"
    template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
    :current-page-report-template="'{first}–{last} de {totalRecords}'"
    @page="onPageChange"
  />
</div>
```

---

## Antipatrones globales

- Usar `window.confirm()` en lugar de `ConfirmDialogBase`
- Montar `<ConfirmDialog />` dentro de `v-if` o `v-for`
- Colores hardcoded (`#3b82f6`, `blue-500`) — usar `var(--accent)` o `var(--brand-zafiro)`
- `font-bold` o `text-gray-*` en contenido — usar `font-semibold` y `var(--fg-*)`
- `font-mono` para texto genérico — reservar para números y códigos legales
- Auto-import de PrimeVue — siempre imports explícitos en este proyecto

## Cómo añadir un nuevo sandbox

1. Crear `src/sandbox/components/<NombrePascal>/<NombrePascal>Sandbox.vue`
2. Añadir ruta en `router/index.ts` bajo `/sandbox/components/...`
3. Añadir entrada en el catálogo de `SandboxHome.vue`
4. Actualizar este skill con la sección del nuevo componente

## Skills relacionadas

- [alega-confirm-dialog](../alega-confirm-dialog/SKILL.md) — ConfirmDialogBase completo
- [alega-datatable](../alega-datatable/SKILL.md) — DataTable cockpit con KPIs
- [alega-form-dialog](../alega-form-dialog/SKILL.md) — Dialog con wizard y headless
- [alega-form-detail-dialog](../alega-form-detail-dialog/SKILL.md) — Dialog tipo Jira
- [alega-ui-context](../alega-ui-context/SKILL.md) — tokens, marca, temas
- [alega-ui-coherence](../alega-ui-coherence/SKILL.md) — Tier 1/2, PageHeader, antipatrones
- [primevue](../primevue/SKILL.md) — setup genérico e instalación
