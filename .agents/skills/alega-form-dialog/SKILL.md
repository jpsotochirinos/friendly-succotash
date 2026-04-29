---
name: alega-form-dialog
description: >
  Patrón base de diálogos de formulario en Alega (PrimeVue Dialog) para crear/editar entidades
  cortas y wizards lawyer-grade de 2-3 pasos. Usa Dialog headless `#container` para shells
  edge-to-edge sin padding de `.p-dialog-content`, header con degradado de marca, indicador de
  pasos horizontal, animaciones direccionales entre pasos, dirty guard, validación inline,
  atajos teclado, foco automático y loading.
---

# Alega — diálogos de formulario (crear / editar entidad simple)

**Sandbox en vivo:** `/sandbox/components/dialog` — dos demos: simple y wizard.
**Receta integrada:** `/sandbox/recipes/trackables-list` — crear y editar expediente.
**Archivo de referencia:** [apps/web/src/sandbox/components/Dialog/DialogSandbox.vue](../../../apps/web/src/sandbox/components/Dialog/DialogSandbox.vue)
**Vista real:** [apps/web/src/views/trackables/TrackablesListView.vue](../../../apps/web/src/views/trackables/TrackablesListView.vue) (líneas 1700-2100 aprox).

Para diálogos de detalle complejos (con sidebar tipo Jira) usa [alega-form-detail-dialog](../alega-form-detail-dialog/SKILL.md). Para confirmaciones, [alega-confirm-dialog](../alega-confirm-dialog/SKILL.md).

Cargar siempre junto con [alega-ui-context](../alega-ui-context/SKILL.md), [alega-ui-coherence](../alega-ui-coherence/SKILL.md) y [alega-primevue-components](../alega-primevue-components/SKILL.md).

> **Lawyer-grade**: estos diálogos los rellena un abogado con prisa entre audiencias. Cada
> friction (placeholder vacío, label genérico, helper ausente, falta de atajo) cuesta segundos
> y precisión legal. Optimizá para *clarity, denseness, keyboardability* — no para "diálogo
> minimalista bonito".

---

## Cuándo aplicarla

### Form simple (sin stepper)

- "Nueva parte", "Nuevo cliente", "Editar documento", "Crear plantilla".
- Formularios de 1 columna con < 8 campos, **o** 2 columnas con grid `sm:grid-cols-2` cuando los campos son cortos (códigos, fechas, dropdowns).
- Width: `min(520px, 96vw)`.

### Form wizard (con stepper)

- "Nuevo expediente" (3 pasos: identidad → partes → opciones).
- "Programar audiencia" (2 pasos: fecha/lugar → asistentes/notas).
- Cualquier alta de entidad compleja con > 8 campos pero < 15.
- Width: `min(640px, 96vw)`.

### Cuándo NO aplicarla

- **Onboarding principal** (post-registro): pantalla dedicada, ver [alega-onboarding-stepper](../alega-onboarding-stepper/SKILL.md).
- **Form > 12 campos o necesita meta strip / sidebar / tabs**: promover a [alega-form-detail-dialog](../alega-form-detail-dialog/SKILL.md).
- **Wizard > 3 pasos**: promover a `alega-form-detail-dialog` con tabs.
- **Solo confirmación + acción** (archivar, eliminar): usar [alega-confirm-dialog](../alega-confirm-dialog/SKILL.md).

---

## Anatomía canónica

### Form simple

```
┌────────────────────────────────────────────────────────────┐
│ ░░░ HEADER (gradient zafiro 7%) ░░░                        │
│ [icon 44x44]  EYEBROW · uppercase                    [X]   │
│               Title (17px font-semibold)                   │
│               • Cambios sin guardar (ámbar)                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ IDENTIDAD                                                  │
│ ─────────                                                  │
│ Label *                                                    │
│ [InputText                                              ]  │
│ Helper                                                     │
│                                                            │
│ Label                Label                                 │
│ [Dropdown ▼]         [Calendar 📅]                         │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ Cancelar                            [Guardar ✓ loading]    │
└────────────────────────────────────────────────────────────┘
```

### Form wizard

```
┌────────────────────────────────────────────────────────────┐
│ ░░░ HEADER (gradient) ░░░                                  │
│ [icon]  ASISTENTE · 3 PASOS                         [X]   │
│         Nuevo expediente                                   │
│         Identidad                                          │
├────────────────────────────────────────────────────────────┤
│ ──── (1) Identidad ─── (2) Partes ─── (3) Opciones ────   │
│        ●━━━━━━━━━━━━━━━━○━━━━━━━━━━━━━○                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ←  IDENTIDAD                                  → animation  │
│ ─────────                                                  │
│ Emoji  [⚖️ 🏢 👨‍👩‍👧 🏗️ ⚠️]                                  │
│                                                            │
│ Título *                                                   │
│ [InputText                                              ]  │
│                                                            │
│ Tipo *               Materia                               │
│ [Dropdown ▼]         [Dropdown ▼]                          │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ Cancelar          [← Atrás]  [Siguiente →]                 │
└────────────────────────────────────────────────────────────┘
```

---

## Reglas inviolables

1. **PrimeVue `Dialog`** con `modal`, sin `draggable`. Para UI custom, usar **headless `#container`** y esconder el chrome de PrimeVue.

2. **Ancho fijo** según tipo:
   | Tipo | Width |
   |------|-------|
   | Form simple (1 col, < 6 campos) | `min(520px, 96vw)` |
   | Wizard 2-3 pasos sin sidebar | `min(640px, 96vw)` |
   | Wizard con sidebar / onboarding | `min(880px, 96vw)` |
   | Detail-light (4+ secciones, 1 col alta) | `min(720px, 96vw)` |

3. **Header con degradado de marca** (zafiro 7% → transparente en claro, accent 18% → transparente en oscuro). Mismo patrón que `ConfirmDialogBase`. Ver § "Header gradient (CSS)".

4. **Header debe llevar:**
   - Icono o emoji 44×44 con borde tinte zafiro: `color-mix(in srgb, var(--brand-zafiro) 22%, var(--surface-border))`.
   - **Eyebrow** uppercase 11px (`0.6875rem`) en `var(--brand-zafiro)` (claro) / `var(--accent)` (oscuro). Ej.: `ASISTENTE · 3 PASOS`, `NUEVA PARTE`, `EDITAR EXPEDIENTE`.
   - **Title** `text-[1.0625rem] font-semibold leading-tight text-[var(--fg-default)]`.
   - **Step hint / dirty hint** `text-[0.8125rem] text-[var(--fg-muted)]`. En edit, mostrar punto ámbar + «Cambios sin guardar» cuando `isDirty`.
   - **Botón cerrar (X)** custom: 32×32, `rounded-lg`, hover `bg-[var(--surface-sunken)]`. No usar el `closable` por defecto de PrimeVue.

5. **Indicador de pasos (wizard)** debajo del header (no dentro):
   - Círculo 24×24 con número (pendiente), ring + accent (activo), check + emerald (completado).
   - Línea conectora entre círculos. Verde si el paso anterior está completado.
   - Fondo `var(--surface-sunken)`, separador `border-bottom`.

6. **Animaciones direccionales** entre pasos (forward/backward). Ver § "Animaciones".

7. **Body** organizado en `<section class="matter-form-section">` con `<h3>` uppercase y separador `border-bottom: 1px dashed var(--surface-border)`. Una sección por concepto (Identidad, Partes, Asignación, Plazos, Estructura).

8. **Cada campo** sigue patrón:
   ```vue
   <div class="flex flex-col gap-1">
     <label for="field-id" class="matter-field-label">
       Etiqueta <span class="matter-field-required">*</span>
     </label>
     <InputText id="field-id" v-model="form.field" :invalid="!!errors.field" ... />
     <small v-if="errors.field" class="matter-field-error">{{ errors.field }}</small>
     <small v-else class="matter-field-help">Helper opcional</small>
   </div>
   ```
   - Label `text-[0.8125rem] font-medium`.
   - Help `text-xs text-[var(--fg-subtle)]`.
   - Error `text-xs text-red-600 dark:text-red-300`.
   - **Required**: asterisco `<span class="matter-field-required">*</span>` siempre visible (no solo en error).

9. **Botones primarios** en el footer propio del shell. Nunca en el body. Si se usa `#container`, **no** usar `<template #footer>` de Dialog.

10. **i18n** todo. Cero literales en plantilla, **incluyendo placeholders, helpers, opciones y toasts** (anti-patrón frecuente: dejar `placeholder="Opcional"`).

11. **Tipografía**: Inter. Para números legales (expediente, fechas, jurisdicción) usar `font-feature-settings: 'tnum' 1, 'lnum' 1` (clase `font-mono-num`). Códigos cortos (jurisdicción `PE`) en `text-transform: uppercase`. Nunca `font-bold`.

---

## Estados

| Estado | UI |
|--------|----|
| **Pristine (create)** | Botón primario habilitado solo si campos requeridos completos |
| **Pristine (edit)** | Botón **Guardar** *deshabilitado* hasta que `isDirty` sea `true`. Más honesto para abogados |
| **Dirty (edit)** | Header muestra hint ámbar; bloquear cierre por mask/X sin confirm |
| **Validation error** | `:invalid="true"` en control PrimeVue + `<small class="matter-field-error">`. Limpiar al tocar el campo |
| **Loading** | Botón primario `:loading`, otros `:disabled`, `closable=false`, `dismissable-mask=false`, `close-on-escape=false` |
| **Error API** | Toast severity error + mantener diálogo abierto y datos |
| **Éxito** | Toast severity success + cerrar diálogo + emitir evento al padre para refrescar |

---

## PrimeVue headless edge-to-edge (template base)

```vue
<Dialog
  v-model:visible="open"
  :modal="true"
  :draggable="false"
  :dismissable-mask="!loading && !isDirty"
  :closable="false"
  :close-on-escape="!loading"
  :style="{ width: 'min(520px, 96vw)' }"
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
      <header class="matter-dialog-header"> ... </header>
      <div class="matter-dialog-body"> ... </div>
      <footer class="matter-dialog-footer"> ... </footer>
    </div>
  </template>
</Dialog>
```

---

## CSS canónico (copiar tal cual a `<style scoped>`)

### Shell

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
  display: flex;
  flex-direction: column;
}
```

### Header gradient (marca Alega)

```css
.matter-dialog-header {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--surface-border);
  flex-shrink: 0;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--brand-zafiro) 7%, transparent),
    transparent 90%
  );
}

html.dark .matter-dialog-header {
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--accent) 18%, transparent),
    transparent 90%
  );
}

.matter-dialog-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--brand-zafiro) 22%, var(--surface-border));
  background: color-mix(in srgb, var(--brand-zafiro) 8%, var(--surface-raised));
  flex-shrink: 0;
}

.matter-dialog-eyebrow {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--brand-zafiro);
}
html.dark .matter-dialog-eyebrow {
  color: var(--accent);
}

.matter-dialog-title {
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--fg-default);
  margin: 0;
}

.matter-dialog-stephint {
  font-size: 0.8125rem;
  color: var(--fg-muted);
  margin: 0;
}

.dialog-close-btn {
  flex-shrink: 0;
  height: 2rem;
  width: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  color: var(--fg-muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 120ms ease;
}
.dialog-close-btn:hover {
  background: var(--surface-sunken);
}
```

### Steps indicator (wizard)

```css
.matter-dialog-steps {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-sunken);
}

.matter-dialog-step__circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--surface-border);
  color: var(--fg-subtle);
  transition: background-color 220ms ease, color 220ms ease;
}
.matter-dialog-step__circle--active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 0 0 4px var(--accent-soft);
}
.matter-dialog-step__circle--done {
  background: #10b981;
  color: #fff;
}

.matter-dialog-step__line {
  flex: 1;
  min-width: 16px;
  height: 1px;
  background: var(--surface-border);
  transition: background-color 220ms ease;
}
.matter-dialog-step__line--done {
  background: #10b981;
}
```

### Body, footer, sections

```css
.matter-dialog-body {
  flex: 1;
  overflow: hidden;
  position: relative;
}
.matter-dialog-body > * {
  height: 100%;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
}

.matter-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-sunken);
  flex-shrink: 0;
}

.matter-form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

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

.matter-field-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--fg-default);
}
.matter-field-help {
  font-size: 0.75rem;
  color: var(--fg-subtle);
}
.matter-field-error {
  font-size: 0.75rem;
  color: #dc2626;
}
html.dark .matter-field-error {
  color: #fca5a5;
}
.matter-field-required {
  color: #dc2626;
}
```

---

## Animaciones direccionales (wizard)

### Setup

```ts
import { ref, computed } from 'vue';

const wizardStep = ref(0);
const stepDirection = ref<'forward' | 'backward'>('forward');
const stepTransitionName = computed(() =>
  stepDirection.value === 'forward' ? 'step-fwd' : 'step-back',
);

function nextStep() {
  if (!canAdvance()) return;
  stepDirection.value = 'forward';   // marca dirección antes de cambiar
  wizardStep.value++;
}

function prevStep() {
  if (wizardStep.value > 0) {
    stepDirection.value = 'backward';
    wizardStep.value--;
  }
}
```

### Template

```vue
<div class="matter-dialog-body">
  <Transition :name="stepTransitionName" mode="out-in">
    <section v-if="wizardStep === 0" key="step-0" class="matter-form-section">
      <!-- step 0 fields -->
    </section>
    <section v-else-if="wizardStep === 1" key="step-1" class="matter-form-section">
      <!-- step 1 fields -->
    </section>
    <section v-else key="step-2" class="matter-form-section">
      <!-- step 2 fields -->
    </section>
  </Transition>
</div>
```

**Importante:** cada `<section>` necesita un `key` único para que Vue las trate como elementos distintos.

### CSS de las transiciones

```css
.step-fwd-enter-active,
.step-fwd-leave-active,
.step-back-enter-active,
.step-back-leave-active {
  transition: opacity 240ms ease-out, transform 240ms ease-out;
  will-change: opacity, transform;
}

/* Forward: actual sale a izq, nueva entra desde der */
.step-fwd-enter-from {
  opacity: 0;
  transform: translateX(28px);
}
.step-fwd-leave-to {
  opacity: 0;
  transform: translateX(-28px);
}

/* Backward: actual sale a der, anterior entra desde izq */
.step-back-enter-from {
  opacity: 0;
  transform: translateX(-28px);
}
.step-back-leave-to {
  opacity: 0;
  transform: translateX(28px);
}

/* Accesibilidad: respetar reducción de movimiento */
@media (prefers-reduced-motion: reduce) {
  .step-fwd-enter-active,
  .step-fwd-leave-active,
  .step-back-enter-active,
  .step-back-leave-active {
    transition: opacity 120ms ease-out;
  }
  .step-fwd-enter-from,
  .step-fwd-leave-to,
  .step-back-enter-from,
  .step-back-leave-to {
    transform: none;
  }
}
```

---

## Plantilla mínima — form simple

```vue
<template>
  <Dialog
    v-model:visible="open"
    :modal="true"
    :draggable="false"
    :dismissable-mask="!loading && !isDirty"
    :closable="false"
    :close-on-escape="!loading"
    :style="{ width: 'min(520px, 96vw)' }"
    :pt="{
      mask: { class: 'alega-confirm-mask' },
      root: { class: 'matter-dialog-root !border-0 !bg-transparent !p-0 !m-0 !shadow-none overflow-visible' },
    }"
  >
    <template #container>
      <div class="matter-dialog-shell">
        <header class="matter-dialog-header">
          <div class="flex items-start gap-3">
            <div class="matter-dialog-icon">
              <i class="pi pi-user text-xl" :style="{ color: 'var(--brand-zafiro)' }" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="matter-dialog-eyebrow">{{ t('parties.eyebrow') }}</span>
              <h2 class="matter-dialog-title">{{ t('parties.newTitle') }}</h2>
              <p
                v-if="isDirty"
                class="matter-dialog-stephint flex items-center gap-1.5"
                :style="{ color: '#d97706' }"
              >
                <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                {{ t('common.unsavedChanges') }}
              </p>
              <p v-else class="matter-dialog-stephint">{{ t('parties.newSubtitle') }}</p>
            </div>
          </div>
          <button
            v-if="!loading"
            type="button"
            class="dialog-close-btn"
            :aria-label="t('common.close')"
            @click="attemptClose"
          >
            <i class="pi pi-times text-sm" />
          </button>
        </header>

        <div class="matter-dialog-body">
          <form class="matter-form-section" novalidate @submit.prevent="onSubmit">
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
            <!-- más campos... -->
          </form>
        </div>

        <footer class="matter-dialog-footer">
          <Button
            type="button"
            :label="t('common.cancel')"
            text
            :disabled="loading"
            @click="attemptClose"
          />
          <Button
            type="button"
            :label="primaryLabel"
            icon="pi pi-check"
            :loading="loading"
            :disabled="!canSubmit || loading"
            @click="onSubmit"
          />
        </footer>
      </div>
    </template>
  </Dialog>
</template>
```

---

## Plantilla wizard (esqueleto)

```vue
<template>
  <Dialog ... :style="{ width: 'min(640px, 96vw)' }">
    <template #container>
      <div class="matter-dialog-shell">
        <header class="matter-dialog-header"> ... </header>

        <!-- Steps indicator -->
        <div class="matter-dialog-steps">
          <template v-for="(step, idx) in steps" :key="step.label">
            <div class="flex items-center gap-2">
              <div
                class="matter-dialog-step__circle"
                :class="{
                  'matter-dialog-step__circle--done': idx < currentStep,
                  'matter-dialog-step__circle--active': idx === currentStep,
                }"
              >
                <i v-if="idx < currentStep" class="pi pi-check text-[10px]" />
                <span v-else>{{ idx + 1 }}</span>
              </div>
              <span
                class="text-xs font-medium"
                :style="idx === currentStep ? { color: 'var(--fg-default)' } : { color: 'var(--fg-subtle)' }"
              >
                {{ step.label }}
              </span>
            </div>
            <div
              v-if="idx < steps.length - 1"
              class="matter-dialog-step__line"
              :class="{ 'matter-dialog-step__line--done': idx < currentStep }"
            />
          </template>
        </div>

        <!-- Body con animación direccional -->
        <div class="matter-dialog-body">
          <Transition :name="stepTransitionName" mode="out-in">
            <section v-if="currentStep === 0" key="step-0" class="matter-form-section">...</section>
            <section v-else-if="currentStep === 1" key="step-1" class="matter-form-section">...</section>
            <section v-else key="step-2" class="matter-form-section">...</section>
          </Transition>
        </div>

        <!-- Footer con Atrás / Siguiente / Submit -->
        <footer class="matter-dialog-footer">
          <Button :label="t('common.cancel')" text :disabled="loading" @click="open = false" />
          <div class="flex items-center gap-2">
            <Button
              v-if="currentStep > 0"
              :label="t('common.back')"
              severity="secondary"
              variant="outlined"
              icon="pi pi-arrow-left"
              :disabled="loading"
              @click="prevStep"
            />
            <Button
              v-if="currentStep < steps.length - 1"
              :label="t('common.next')"
              icon="pi pi-arrow-right"
              icon-pos="right"
              @click="nextStep"
            />
            <Button
              v-else
              :label="t('expedientes.create')"
              icon="pi pi-check"
              :loading="loading"
              @click="submit"
            />
          </div>
        </footer>
      </div>
    </template>
  </Dialog>
</template>
```

---

## Validación

### Patrón inline (recomendado)

```ts
const errors = ref<Record<string, string>>({ name: '', email: '' });

function validateField(name: 'name' | 'email') {
  if (name === 'name' && !form.value.name.trim()) {
    errors.value.name = t('common.required');
  }
  if (name === 'email' && form.value.email && !isValidEmail(form.value.email)) {
    errors.value.email = t('common.emailInvalid');
  }
}

const canSubmit = computed(
  () => form.value.name.trim() && !errors.value.name && !errors.value.email,
);

async function onSubmit() {
  // re-validar al click
  validateField('name');
  validateField('email');
  if (!canSubmit.value) return;
  // ... submit
}
```

### Reglas

- **No bloquear escritura.** Mostrar error solo después del primer blur o intento de submit.
- Errores en `errors: Record<string, string>`. Limpiar el error del campo en su `@input`/`@change`.
- Validar lo crítico cliente-side (longitud, formato, requerido), dejar la lógica pesada al API.
- Si la API devuelve errores por campo, mapearlos a `errors`.
- En wizard: bloquear `Siguiente` con `:disabled="!canAdvance"` *y* re-validar al click.

---

## Dirty guard (edit)

```ts
import { ref, computed, nextTick } from 'vue';

const form = ref({ name: '', email: '' });
const editSnapshot = ref('');
const isDirty = computed(() => JSON.stringify(form.value) !== editSnapshot.value);

async function open(entity: Entity) {
  form.value = await fetchAndMap(entity);
  await nextTick();
  editSnapshot.value = JSON.stringify(form.value);
  // foco al primer campo
  firstFieldRef.value?.$el?.querySelector?.('input')?.focus();
}

function attemptClose() {
  if (loading.value) return;
  if (isDirty.value && !window.confirm(t('common.discardChangesConfirm'))) return;
  visible.value = false;
}

async function onSave() {
  loading.value = true;
  try {
    await api.update(entity.id, form.value);
    editSnapshot.value = JSON.stringify(form.value);  // refrescar snapshot
    toast.add({ severity: 'success', summary: t('common.saved'), life: 2500 });
    visible.value = false;
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.saveError'), life: 4000 });
  } finally {
    loading.value = false;
  }
}
```

**Reglas:**
- `Guardar` se habilita solo si `isDirty && canSubmit`.
- Bloquear `dismissable-mask` y `closable` cuando `loading` **o** `dirty` (en edit).
- Hint visible en header cuando `isDirty` (punto ámbar + "Cambios sin guardar").

---

## Atajos de teclado

| Combinación | Acción |
|-------------|--------|
| **Enter** (input/select, no textarea) | Wizard: avanzar; form simple: submit. |
| **Cmd/Ctrl + Enter** | En edit: submit (`Guardar`). |
| **Esc** | Cancelar (con confirm si dirty). PrimeVue lo gestiona vía `close-on-escape`. |
| **Tab** | Navegación natural; el orden visual debe coincidir con el DOM order. |

```ts
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
    e.preventDefault();
    if (currentStep.value < steps.length - 1) nextStep();
    else submit();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    submit();
  }
}
```

---

## Lawyer-grade specifics (campos típicos en expediente)

| Campo | Regla |
|-------|-------|
| **Título del expediente** | Placeholder con ejemplo realista («Pérez vs. Constructora Andina»). Helper sobre dónde se va a ver. **Required**. |
| **N.º de expediente** | `font-mono-num`, placeholder `01234-2024-0-1801-JR-CI-12`. Opcional al crear, editable después. |
| **Juzgado / órgano** | Texto libre con ejemplo (`12.º Juzgado Civil de Lima`). Autocompletar futuro. |
| **Jurisdicción** | Código corto, `maxlength="8"`, `uppercase-input`, default `PE`. |
| **Materia** | Dropdown con opciones de negocio (Litigio, Corporativo, Familia, etc.). Determina las plantillas sugeridas. |
| **Tipo de seguimiento** | Caso / Proceso / Proyecto / Auditoría. Drives el board. **Required**. |
| **Cliente representado** | Dropdown con `filter` + `show-clear`. |
| **Contraparte** | Texto libre (no exige cliente registrado). Opcional. |
| **Abogado a cargo** | Dropdown con avatar/iniciales. `placeholder="Sin asignar"`. |
| **Fecha límite** | `Calendar` con `show-icon`, formato local. Helper: «Las actuaciones tienen su propia fecha». |

### Sub-secciones canónicas

| Sección | Contiene |
|---------|----------|
| **Identidad** | Título, emoji, n.º de expediente |
| **Materia y jurisdicción** | Materia (dropdown), tipo, juzgado, jurisdicción |
| **Partes** | Cliente representado, contraparte, terceros |
| **Asignación** | Abogado a cargo, equipo, observador |
| **Plazos** | Fecha límite, recordatorios, hito |
| **Estructura de actuaciones** | Plantilla / blueprint / estilo libre |
| **Estado y metadatos** | Estado, descripción interna, etiquetas |

---

## Accesibilidad

- **Foco automático** al primer input del paso/form actual:
  ```ts
  await nextTick();
  firstFieldRef.value?.$el?.querySelector?.('input')?.focus();
  ```
- Cada control con `id` y `<label for="...">`.
- `aria-invalid` (PrimeVue lo aplica con `:invalid="true"`).
- Stepper con `aria-current="step"` en el paso activo y `aria-label` en el contenedor (`Paso N de M`).
- Botones disabled mantienen contraste; nunca colocar `pointer-events:none` invisibilizando.
- Botón cerrar con `aria-label="Cerrar"`.
- Respetar `prefers-reduced-motion` en transiciones de pasos (ya cubierto en CSS).

---

## Anti-patrones

- ❌ `Dialog` con header por defecto (`header="Editar X"`) en vistas core. Lawyer-grade necesita eyebrow + título + hint.
- ❌ Botones primarios dentro del body en lugar del footer propio del shell.
- ❌ Mezclar confirmación + form (separá: form abre confirm si hace algo destructivo, ver `alega-confirm-dialog`).
- ❌ Custom header pesado (icono grande + bandeja de tags + acciones múltiples) — eso es `alega-form-detail-dialog`.
- ❌ Toolbar tipo "Guardar y crear otro / Guardar y cerrar / Guardar borrador" con 4 botones — escogé 1 primario y mové los demás a `SplitButton` o menú.
- ❌ Cerrar el dialog con cambios sin avisar al usuario.
- ❌ Literales en plantilla (`placeholder="Opcional"`, `header="Nuevo expediente"`, `label="Cancelar"`). **Todo i18n**.
- ❌ `font-bold` o `text-2xl` para títulos de form. Usar `font-semibold` + `text-[1.0625rem]` o `text-lg`.
- ❌ Hex sueltos (`#3b82f6`) o `blue-500` en lugar de `var(--brand-zafiro)` / `var(--accent)`.
- ❌ En edit, dejar el botón **Guardar** habilitado cuando no hay cambios. Mentís al usuario.
- ❌ Reintroducir la "caja dentro de caja": usar slot default con `.p-dialog-content` y luego intentar compensar márgenes con padding negativo. Siempre `#container`.
- ❌ Olvidar el `key` en cada `<section>` dentro de `<Transition>` — la animación no se dispara.
- ❌ No marcar `stepDirection` antes de `step++` / `step--` — la animación va en el sentido equivocado.
- ❌ `<Stepper>` o `<Steps>` de PrimeVue para el indicador — usar el patrón propio (más control sobre estado done/active/pending).
- ❌ Wizard con > 3 pasos. Si pasa de eso, promovelo a `alega-form-detail-dialog` con tabs.

---

## Validación al implementar

1. `pnpm --filter @tracker/web exec vue-tsc --noEmit` limpio.
2. Probar dark mode: gradient de header se ve bien en ambos.
3. Probar `prefers-reduced-motion`: animación suavizada (solo opacity).
4. Probar dirty guard: editar campo, intentar cerrar, ver confirm.
5. Probar validación: dejar required vacío, ver error inline en blur.
6. Probar loading: simular API lenta, X y Esc bloqueados.
7. Probar error: simular API falla, toast + diálogo abierto + datos preservados.
8. Probar atajos: Enter para Siguiente, Esc para Cancelar.
9. Probar foco: al abrir, primer campo enfocado.
10. Probar grep antipatrones: `font-mono` (excepto `font-mono-num`), `font-bold`, `text-gray-*`, `text-2xl` en títulos.

---

## Skills relacionadas

- [alega-confirm-dialog](../alega-confirm-dialog/SKILL.md) — confirmaciones puras (sin form). Patrón header (eyebrow + icono + subject) compartido.
- [alega-informational-dialog](../alega-informational-dialog/SKILL.md) — diálogos de solo lectura (sin form, sin confirmación).
- [alega-form-detail-dialog](../alega-form-detail-dialog/SKILL.md) — variante "tipo Jira" para detalle/edición de entidades grandes (sidebar, tabs).
- [alega-onboarding-stepper](../alega-onboarding-stepper/SKILL.md) — onboarding, setup inicial y wizards con sidebar stepper vertical.
- [alega-datatable](../alega-datatable/SKILL.md) — origen del CTA "Nueva entidad" / "Editar".
- [alega-ui-coherence](../alega-ui-coherence/SKILL.md) — tokens y antipatrones globales.
- [alega-motion](../alega-motion/SKILL.md) — transiciones suaves y `prefers-reduced-motion`.
- [alega-primevue-components](../alega-primevue-components/SKILL.md) — hub índice.
- [primevue](../primevue/SKILL.md) — `Dialog`, `InputText`, `Select`/`Dropdown`, `Calendar`, `Textarea`, `SelectButton`, `Button`.
