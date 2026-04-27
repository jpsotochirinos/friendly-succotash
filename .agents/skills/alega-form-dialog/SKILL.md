---
name: alega-form-dialog
description: >
  Patrón base de diálogos de formulario en Alega (PrimeVue Dialog) para crear/editar entidades
  cortas y wizards lawyer-grade de 2-3 pasos. Usa Dialog headless `#container` para shells
  edge-to-edge sin padding de `.p-dialog-content`, sidebar/stepper cuando aplica, body en
  secciones uppercase, dirty guard, validación inline, atajos teclado, foco automático y loading.
---

# Alega — diálogos de formulario (crear / editar entidad simple)

Para diálogos de detalle complejos (con sidebar tipo Jira) usa [alega-form-detail-dialog](../alega-form-detail-dialog/SKILL.md). Para confirmaciones, [alega-confirm-dialog](../alega-confirm-dialog/SKILL.md).

Cargar junto con [alega-ui-context](../alega-ui-context/SKILL.md), [alega-ui-coherence](../alega-ui-coherence/SKILL.md) y [primevue](../primevue/SKILL.md).

> **Lawyer-grade**: estos diálogos los rellena un abogado con prisa entre audiencias. Cada
> friction (placeholder vacío, label genérico, helper ausente, falta de atajo) cuesta segundos
> y precisión legal. Optimizá para *clarity, denseness, keyboardability* — no para "diálogo
> minimalista bonito".

## Cuándo aplicarla

- "Nuevo cliente", "Nueva parte", "Editar documento", "Crear plantilla", "Programar audiencia".
- **"Nuevo expediente"** (wizard 3 pasos: identidad → partes → plantilla).
- Formularios de 1 columna y < 8 campos, **o** 2 columnas con grid `sm:grid-cols-2` cuando los
  campos son cortos (códigos, fechas, dropdowns).
- Asistentes de 2-3 pasos cortos.

**Onboarding principal** (post-registro, primera configuración del despacho) **no** va en `Dialog`: pantalla dedicada con shell propio; ver [alega-onboarding-stepper](../alega-onboarding-stepper/SKILL.md) § “app intro”.

Si el form crece a > 12 campos o necesita meta strip / sidebar / tabs, **promociona** a `alega-form-detail-dialog`.

## Anatomía canónica (lawyer-grade)

```
<Dialog v-model:visible="open" modal :pt="{ root: { class: 'matter-dialog-root ...' } }">
  <template #container>
    ┌ matter-dialog-shell (borde/radio/sombra propios; sin p-dialog-content) ┐
    │ Header propio: [icon 44x44] EYEBROW · title · hint/dirty · [X]         │
    ├ Body propio (scroll único): secciones uppercase + fields               │
    ├ Footer propio (sunken bg): Cancelar · Atrás · Siguiente/Guardar        │
    └────────────────────────────────────────────────────────────────────────┘
  </template>
</Dialog>
```

## Reglas inviolables

1. **PrimeVue `Dialog`** con `modal`, sin `draggable`. Para UI custom, usar **headless `#container`** y esconder el chrome de PrimeVue: el panel visible vive en un hijo (`matter-dialog-shell`), no en `.p-dialog-content`.
2. **Ancho** (token sizes):
   - **Short** (1 columna < 6 campos): `min(520px, 96vw)`
   - **Wizard / dense simple** (2 columnas o 2-3 pasos sin sidebar): `min(640px, 96vw)`
   - **Wizard con sidebar / onboarding**: `min(880px, 96vw)`
   - **Detail-light** (4+ secciones, 1 columna alta): `min(720px, 96vw)`
3. **Header** debe llevar:
   - Icono o emoji 44×44 con borde tinte zafiro (`color-mix(... var(--brand-zafiro) 22%)`).
   - **Eyebrow** uppercase 0.6875rem en `var(--brand-zafiro)` (modo claro) / `var(--accent)` (modo oscuro). Ej.: «Asistente · 3 pasos», «Detalle del expediente», «Nuevo escrito».
   - **Title** `text-lg font-semibold leading-tight text-[var(--fg-default)]`.
   - **Step hint / dirty hint** `text-[0.8125rem] text-[var(--fg-muted)]`. En edit, mostrar punto ámbar + «cambios sin guardar» cuando `isDirty`.
   - Para wizard simple, **stepper** debajo del header; para onboarding / `Nuevo expediente`, **sidebar stepper vertical** con progreso.
4. **Body** organizado en `<section class="matter-form-section">` con `<h3>` uppercase y separador `border-bottom: 1px dashed var(--surface-border)`. Una sección por concepto (Identidad, Partes, Asignación, Plazos, Estructura).
5. **Cada campo**:
   - `<div class="flex flex-col gap-1">` con `<label for="...">` + control + `<small>` help **o** error (no ambos a la vez).
   - Label `text-[0.8125rem] font-medium text-[var(--fg-default)]`.
   - Help `text-xs text-[var(--fg-subtle)]`. Error `text-xs text-red-600 dark:text-red-300`.
   - **Required**: pintar asterisco con `<span class="text-red-600">*</span>` dentro del label (visible siempre, no solo en error).
6. **Botones primarios** en el footer propio del shell; nunca en el body. Si se usa `#container`, no usar `<template #footer>`.
7. **i18n** todo. Cero literales en plantilla, **incluyendo placeholders, helpers, opciones y toasts** (anti-patrón frecuente: dejar `placeholder="Opcional"`).
8. **Tipografía**: Inter. Para números legales (expediente, fechas, jurisdicción) usar `font-feature-settings: 'tnum' 1, 'lnum' 1` (clase `font-mono-num`). Códigos cortos (jurisdicción `PE`) en `text-transform: uppercase`. Nunca `font-bold`.

## Estados

| Estado | UI |
|--------|----|
| **Pristine (create)** | Botón primario habilitado solo si campos requeridos completos |
| **Pristine (edit)** | Botón **Guardar** *deshabilitado* hasta que `isDirty` sea `true`. Más honesto para abogados (no parece que tenés cambios cuando no los tenés) |
| **Dirty (edit)** | Header muestra hint ámbar; bloquear cierre por mask/X sin confirm |
| **Validation error** | `:invalid="true"` en control PrimeVue + `<small class="matter-field-error">`. Limpiar al tocar el campo |
| **Loading** | Botón primario `:loading`, otros `:disabled`, `closable=false`, `dismissable-mask=false` |
| **Error API** | Toast severity error + mantener diálogo abierto y datos |
| **Éxito** | Toast severity success + cerrar diálogo + emitir evento al padre para refrescar |

## PrimeVue headless edge-to-edge

Usar este patrón para wizards, onboarding, forms densos o cualquier diseño donde el contenido debe tocar los bordes del diálogo. Evita el padding del preset Aura en `.p-dialog-content`.

```vue
<Dialog
  v-model:visible="open"
  :modal="true"
  :draggable="false"
  :dismissable-mask="!loading && !dirty"
  :closable="false"
  :close-on-escape="!loading && !dirty"
  :style="{ width: 'min(880px, 96vw)' }"
  :pt="{
    mask: { class: 'alega-confirm-mask' },
    root: {
      class:
        'matter-dialog-root !border-0 !bg-transparent !p-0 !m-0 !shadow-none overflow-visible',
    },
  }"
>
  <template #container>
    <div class="matter-dialog-shell">
      <!-- header/sidebar/body/footer propios -->
    </div>
  </template>
</Dialog>
```

CSS mínimo:

```css
:deep(.matter-dialog-root.p-dialog) {
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  overflow: visible !important;
}
.matter-dialog-shell {
  width: 100%;
  max-height: min(88vh, 720px);
  border-radius: 16px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
```

## Plantilla mínima (form simple, 1 columna)

```vue
<Dialog ... :style="{ width: 'min(520px, 96vw)' }" :pt="{ root: { class: 'matter-dialog-root ...' } }">
  <template #container>
    <div class="matter-dialog-shell">
      <header class="matter-dialog-header">
      <div class="flex items-start gap-3">
        <div class="matter-dialog-icon"><i class="pi pi-user text-xl text-[var(--brand-zafiro)]" /></div>
        <div class="flex flex-col gap-0.5 min-w-0">
          <span class="matter-dialog-eyebrow">{{ t('parties.eyebrow') }}</span>
          <h2 class="matter-dialog-title">{{ t('parties.newTitle') }}</h2>
          <p class="matter-dialog-stephint">{{ t('parties.newSubtitle') }}</p>
        </div>
      </div>
      </header>

      <form class="matter-dialog-body" novalidate @submit.prevent="onSubmit" @keydown="onKeydown">
    <section class="matter-form-section">
      <h3 class="matter-form-section__title">{{ t('parties.sectionIdentity') }}</h3>
      <div class="flex flex-col gap-1">
        <label for="party-name" class="matter-field-label">
          {{ t('parties.fieldName') }}
          <span class="matter-field-required">*</span>
        </label>
        <InputText
          id="party-name"
          ref="firstFieldRef"
          v-model="form.name"
          :placeholder="t('parties.fieldNamePlaceholder')"
          :invalid="!!errors.name"
          :disabled="loading"
          autocomplete="off"
          @blur="validateField('name')"
          @input="errors.name = ''"
        />
        <small v-if="errors.name" class="matter-field-error">{{ errors.name }}</small>
        <small v-else class="matter-field-help">{{ t('parties.fieldNameHelp') }}</small>
      </div>
    </section>
      </form>

      <footer class="matter-dialog-footer">
        <Button type="button" :label="t('common.cancel')" text :disabled="loading" @click="attemptCancel" />
        <Button type="button" :label="primaryLabel" icon="pi pi-check" :loading="loading" :disabled="!canSubmit" @click="onSubmit" />
      </footer>
    </div>
  </template>
</Dialog>
```

`primaryLabel` = `t('common.create')` o `t('common.save')` según modo.

## Wizard lawyer-grade (2-3 pasos)

Para wizards (ej.: `Nuevo expediente`, `Programar audiencia`):

- **Stepper**: para 2-3 pasos simples puede ir en header. Para onboarding o `Nuevo expediente`, preferir sidebar stepper vertical con progreso.
- **Step hint**: por paso, una línea explicando qué se decide ahí (`stepHints.identity`, `stepHints.parties`, ...).
- **Validación por paso**: `validateCreateStep(step)` antes de avanzar. Si falla, foco al primer campo con error.
- **Atajo Enter**: avanza paso si hay validez; en último paso ejecuta submit. Excluir `<textarea>`.
- **Width** `min(640px, 96vw)` sin sidebar; `min(880px, 96vw)` con sidebar.

Para un ejemplo completo de sidebar stepper reusable, cargar [alega-onboarding-stepper](../alega-onboarding-stepper/SKILL.md).

> Si pasa de 3 pasos o requiere navegación libre (volver a editar paso 1 desde paso 3 con feedback en vivo), promovelo a `alega-form-detail-dialog` con tabs.

## Validación

- **Inline**, no bloquear escritura. Mostrar error solo después del primer blur o intento de submit (`@blur="validateField(name)"`).
- Errores en `errors: Record<string, string>`. Limpiar el error del campo en su `@input`/`@change`.
- Validar lo crítico cliente-side (longitud, formato, requerido), dejar la lógica pesada al API.
- Si la API devuelve errores por campo, mapearlos a `errors`.
- En wizard: bloquear `Siguiente` con `:disabled="!canAdvance"` *y* re-validar al click.

## Sub-secciones (anti-mega-form)

Si tenés > 6 campos en un paso/diálogo, agrupalos en `<section class="matter-form-section">` con título uppercase. El abogado escanea por sección, no campo a campo. Secciones canónicas:

| Sección | Contiene |
|---------|----------|
| **Identidad** | Título, emoji, n.º de expediente |
| **Materia y jurisdicción** | Materia (dropdown), tipo, juzgado, jurisdicción |
| **Partes** | Cliente representado, contraparte, terceros |
| **Asignación** | Abogado a cargo, equipo, observador |
| **Plazos** | Fecha límite, recordatorios, hito |
| **Estructura de actuaciones** | Plantilla / blueprint / estilo libre |
| **Estado y metadatos** | Estado, descripción interna, etiquetas |

## Lawyer-grade specifics

Campos típicos en diálogos de expediente / actuación / audiencia. Reglas:

| Campo | Regla |
|-------|-------|
| **Título del expediente** | Placeholder con ejemplo realista («Pérez vs. Constructora Andina»). Helper sobre dónde se va a ver. **Required**. |
| **N.º de expediente** | `font-mono-num`, placeholder `01234-2026-0-1801-JR-CI-12`. Opcional al crear, editable después. |
| **Juzgado / órgano** | Texto libre con ejemplo (`12.º Juzgado Civil de Lima`). Autocompletar futuro. |
| **Jurisdicción** | Código corto, `maxlength="8"`, `uppercase-input`, default `PE`. |
| **Materia** | Dropdown con opciones de negocio (Litigio, Corporativo, Familia, etc.). Determina las plantillas sugeridas en pasos siguientes. |
| **Tipo de seguimiento** | Caso / Proceso / Proyecto / Auditoría. Drives el board. **Required**. |
| **Cliente representado** | Dropdown con `filter` + `show-clear`. |
| **Contraparte** | Texto libre (no exige cliente registrado). Opcional. |
| **Abogado a cargo** | Dropdown con avatar/iniciales. `placeholder="Sin asignar"`. |
| **Fecha límite** | `Calendar` con `show-icon`, formato local. Helper: «Las actuaciones tienen su propia fecha». |

## Dirty guard

Edición con snapshot:

```ts
const editSnapshot = ref('');
const editIsDirty = computed(() => JSON.stringify(form.value) !== editSnapshot.value);

async function open(entity: Entity) {
  form.value = await fetchAndMap(entity);
  await nextTick();
  editSnapshot.value = JSON.stringify(form.value);
  firstFieldRef.value?.$el?.querySelector?.('input')?.focus();
}

function attemptCancel() {
  if (loading.value) return;
  if (editIsDirty.value && !window.confirm(t('common.discardChangesConfirm'))) return;
  visible.value = false;
}
```

- `Guardar` se habilita solo si `editIsDirty && canSubmit`.
- Al guardar OK, refresca snapshot (`editSnapshot = JSON.stringify(form)`).
- Bloquear `dismissable-mask` y `closable` cuando `loading` **o** `dirty` (en edit).

## Atajos de teclado

| Combinación | Acción |
|-------------|--------|
| **Enter** (input/select, no textarea) | Wizard: avanzar; form simple: submit. |
| **Cmd/Ctrl + Enter** | En edit: submit (`Guardar`). |
| **Esc** | Cancelar (con confirm si dirty). PrimeVue lo gestiona vía `close-on-escape`. |
| **Tab** | Navegación natural; el orden visual debe coincidir con el DOM order. |

No mostrar leyendas de shortcuts en footers densos por defecto. Mantener soporte de teclado; si producto pide explicitarlo, usar texto sutil en un tooltip o helper fuera del footer principal.

## Accesibilidad

- Foco automático al primer input del paso/form actual (`nextTick` → `input.focus()`).
- Cada control con `id` y `<label for="...">`.
- `aria-invalid` (PrimeVue lo aplica con `:invalid="true"`).
- Stepper con `aria-current="step"` en el paso activo y `aria-label` en el `<ol>` (`Paso N de M`).
- Botones disabled mantienen contraste; nunca colocar `pointer-events:none` invisibilizando.
- Respetá `prefers-reduced-motion` si añadís transiciones (la skill `alega-motion` lo cubre).

## CSS reutilizable

Usar las clases ya cableadas en `apps/web/src/views/trackables/TrackablesListView.vue` (`matter-dialog-root`, `matter-dialog-shell`, `matter-wizard`, `matter-wizard__sidebar`, `matter-wizard__content`, `matter-wizard__header`, `matter-wizard__body`, `matter-wizard__footer`, `matter-form-section`, `matter-field-label`, `matter-field-help`, `matter-field-error`, `font-mono-num`, `uppercase-input`).

Cuando se reuse en > 1 vista, **extraer a un componente** `MatterFormDialog.vue` con slots por sección. Hasta entonces, mantener las clases en `<style scoped>` con la regla de coherencia (mismos nombres en distintas vistas).

## Anti-patrones

- ❌ `Dialog` con header por defecto (`header="Editar X"`) en vistas core. Lawyer-grade necesita eyebrow + título + hint.
- ❌ Botones primarios dentro del body en lugar del footer propio del shell.
- ❌ Mezclar confirmación + form (separá: form abre confirm si hace algo destructivo, ver `alega-confirm-dialog`).
- ❌ Custom header pesado (icono grande + bandeja de tags + acciones múltiples) — ese es `alega-form-detail-dialog`.
- ❌ Toolbar tipo "Guardar y crear otro / Guardar y cerrar / Guardar borrador" con 4 botones — escogé 1 primario y mové los demás a `SplitButton` o menú.
- ❌ Cerrar el dialog con cambios sin avisar al usuario.
- ❌ Literales en plantilla (`placeholder="Opcional"`, `header="Nuevo expediente"`, `label="Cancelar"`). **Todo i18n**.
- ❌ `font-bold` o `text-2xl` para títulos de form. Usar `font-semibold` + `text-lg` o `text-[1.125rem]`.
- ❌ Hex sueltos (`#3b82f6`) o `blue-500` en lugar de `var(--brand-zafiro)` / `var(--accent)`.
- ❌ En edit, dejar el botón **Guardar** habilitado cuando no hay cambios. Mentís al usuario.
- ❌ Reintroducir la "caja dentro de caja": usar slot default con `.p-dialog-content` y luego intentar compensar márgenes con padding negativo.

## Skills relacionadas

- [alega-form-detail-dialog](../alega-form-detail-dialog/SKILL.md) — variante "tipo Jira" para detalle/edición de entidades grandes (sidebar, tabs).
- [alega-onboarding-stepper](../alega-onboarding-stepper/SKILL.md) — onboarding, setup inicial y wizards con sidebar stepper.
- [alega-confirm-dialog](../alega-confirm-dialog/SKILL.md) — confirmaciones puras (sin form). Patrón de header (eyebrow + icono + subject) reusable.
- [alega-datatable](../alega-datatable/SKILL.md) — origen del CTA "Nueva entidad" / "Editar".
- [alega-ui-coherence](../alega-ui-coherence/SKILL.md) — tokens y antipatrones globales.
- [alega-motion](../alega-motion/SKILL.md) — transiciones suaves para apertura/cambio de paso si aplica.
- [primevue](../primevue/SKILL.md) — `Dialog`, `InputText`, `Select`/`Dropdown`, `Calendar`, `Textarea`, `SelectButton`, `Button`.
