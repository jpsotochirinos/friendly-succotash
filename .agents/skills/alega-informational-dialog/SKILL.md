---
name: alega-informational-dialog
description: >
  Patrón de modales de solo lectura en Alega (Vue 3, PrimeVue 4): InformationalDialogBase con
  variantes info/success/warning/neutral; degradado de tono en header; eyebrow y botón con
  color por variante; rejilla de facts, secciones con bullets y callout. Usar al mostrar
  resúmenes, guías, contexto legal, resultados o advertencias sin capturar datos ni confirmar
  acciones destructivas.
---

# Alega — diálogos informativos (solo lectura)

**Componente:** [apps/web/src/components/common/InformationalDialogBase.vue](../../../apps/web/src/components/common/InformationalDialogBase.vue)
**Sandbox en vivo:** `/sandbox/components/informational-dialog` (`pnpm --filter @tracker/web dev`)

Cargar siempre junto con [alega-ui-context](../alega-ui-context/SKILL.md), [alega-ui-coherence](../alega-ui-coherence/SKILL.md) y [alega-primevue-components](../alega-primevue-components/SKILL.md).

---

## Cuándo aplicarla

| Usar `InformationalDialogBase` | Usar otro patrón |
|-------------------------------|-----------------|
| Resumen de expediente, historial, metadatos legales | Capturar datos → [alega-form-dialog](../alega-form-dialog/SKILL.md) |
| Guía de revisión, checklist de pasos, instrucciones | Confirmar acción destructiva/reversible → [alega-confirm-dialog](../alega-confirm-dialog/SKILL.md) |
| Resultado de operación ya completada (éxito/sync) | Detalle editable tipo Jira → [alega-form-detail-dialog](../alega-form-detail-dialog/SKILL.md) |
| Advertencia informativa sin acción destructiva | |
| Contexto legal read-only antes de una operación larga | |

**No aplicar si:** el usuario necesita introducir o cambiar datos (form), o si necesita confirmar/cancelar una acción con consecuencias enumeradas (confirm).

---

## Anatomía canónica

```
┌────────────────────────────────────────────────────────────┐
│ ░░░ HEADER (degradado de tono por variante) ░░░            │
│ [icon 44x44]  EYEBROW · uppercase                    [X]   │
│               Title (17px font-semibold)                   │
│               «subject» (truncado, opcional)               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ message (sm, leading-relaxed, fg-muted)                    │
│                                                            │
│ ┌──────────────────────────────────────────────────┐       │
│ │ label          valor legal (font-mono-num)        │  ←facts│
│ │ label          valor                              │       │
│ └──────────────────────────────────────────────────┘       │
│                                                            │
│ SECCIÓN                                                    │
│ ─────────                                                  │
│   · Bullet 1                                               │
│   · Bullet 2                                               │
│   o párrafo libre                                          │
│                                                            │
│ ╔══════════════════════════════════════════════════╗       │
│ ║ NOTA (callout con tinte por variante)            ║       │
│ ║ Cuerpo del aviso contextual.                     ║       │
│ ╚══════════════════════════════════════════════════╝       │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                              [✓ Entendido  (primario)]     │
└────────────────────────────────────────────────────────────┘
```

---

## Variantes (4)

| variant | Cuándo | Degradado header | Icono | Callout |
|---------|--------|-----------------|-------|---------|
| `info` *(default)* | Guías, instrucciones, contexto neutro con acento marca | Accent-soft → transparente | `pi-info-circle` accent | Accent 8% |
| `success` | Operación ya completada, estado OK | Esmeralda suave → transparente | `pi-check-circle` emerald | Esmeralda 12% |
| `warning` | Advertencia informativa, plazo próximo | Ámbar suave → transparente | `pi-exclamation-circle` amber | Ámbar 12% |
| `neutral` | Resúmenes mixtos, metadatos sin carga emocional | Zafiro 7% → transparente | `pi-list` fg-muted | Surface-sunken |

El **eyebrow** comparte color con el icono del header: esmeralda en `success`, ámbar en `warning`, accent en `info`, zafiro en `neutral`. El **botón «Entendido»** lleva `severity="success"` en `success` y `severity="warn"` en `warning`; en `info` y `neutral` usa el primario de marca Alega (sin `severity`, azul zafiro) + `icon="pi pi-check"`.

---

## API completa

### Props

```ts
import type {
  InformationalDialogVariant,
  InformationalDialogSection,
  InformationalDialogFact,
  InformationalDialogCallout,
} from '@/components/common/InformationalDialogBase.vue';

interface Props {
  /** v-model:visible — controlado por el padre */
  visible: boolean;
  /** Tono del diálogo. Default: 'info' */
  variant?: InformationalDialogVariant;          // 'info' | 'success' | 'warning' | 'neutral'
  /** Eyebrow uppercase sobre el título. Ej.: 'RESUMEN', 'GUÍA', 'ATENCIÓN' */
  eyebrow?: string;
  /** Título principal (obligatorio) */
  title: string;
  /** Entidad contextual bajo el título. Se trunca con title= para tooltip. */
  subject?: string;
  /** Párrafo introductorio, leading-relaxed, fg-muted */
  message?: string;
  /** Override del icono de PrimeIcons. Ej.: 'pi pi-calendar'. Defaults por variante. */
  icon?: string;
  /** Secciones con título uppercase + cuerpo libre y/o bullets */
  sections?: InformationalDialogSection[];
  /** Rejilla clave-valor para metadatos legales compactos (font-mono-num) */
  facts?: InformationalDialogFact[];
  /** Nota contextual al pie del body, tintada por variante */
  callout?: InformationalDialogCallout;
  /** Etiqueta del botón de cierre. Pasar t('common.gotIt') desde vistas. Default: 'Entendido' */
  closeLabel?: string;
  /** aria-label del botón X. Pasar t('common.close'). Default: 'Cerrar' */
  closeAriaLabel?: string;
  /** Si true: botón con spinner, X oculta, Esc y máscara no cierran */
  loading?: boolean;
}
```

### Interfaces de contenido

```ts
export interface InformationalDialogSection {
  title: string;       // uppercase en cabecera de sección
  body?: string;       // párrafo libre (whitespace-pre-wrap)
  bullets?: string[];  // lista de puntos, dot accent
}

export interface InformationalDialogFact {
  label: string;  // clave, fg-subtle, font-medium
  value: string;  // valor, fg-default, font-mono-num
}

export interface InformationalDialogCallout {
  title?: string;  // uppercase 11px, opcional
  body: string;    // cuerpo del aviso
}
```

### Eventos

| Evento | Payload | Cuándo |
|--------|---------|--------|
| `update:visible` | `boolean` | v-model cambia (cierre por X, botón, Esc, mask) |
| `hide` | — | Tras cerrarse completamente (PrimeVue `@hide`) |
| `close` | — | El usuario pulsa «Entendido» o la X |

---

## Ancho automático

El componente elige el ancho según el contenido, sin prop `width`:

| Condición | Ancho |
|-----------|-------|
| `sections`, `facts`, `callout` presentes, **o** `subject > 48 chars`, **o** `message > 220 chars` | `min(560px, 96vw)` |
| Mensaje breve, sin secciones/facts/callout | `min(440px, 96vw)` |

---

## Patrón canónico de uso

```vue
<template>
  <!-- Trigger -->
  <Button
    label="Ver resumen"
    icon="pi pi-info-circle"
    severity="secondary"
    variant="outlined"
    size="small"
    @click="showInfo = true"
  />

  <!-- Dialog — una instancia por vista, fuera de v-if/v-for -->
  <InformationalDialogBase
    v-model:visible="showInfo"
    variant="neutral"
    :eyebrow="t('expediente.summaryEyebrow')"
    :title="t('expediente.summaryTitle')"
    :subject="trackable.title"
    :message="t('expediente.summaryIntro')"
    :facts="summaryFacts"
    :sections="summarySections"
    :callout="summaryCallout"
    :close-label="t('common.gotIt')"
    :close-aria-label="t('common.close')"
    @close="onInfoClosed"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import InformationalDialogBase from '@/components/common/InformationalDialogBase.vue';
import type {
  InformationalDialogFact,
  InformationalDialogSection,
  InformationalDialogCallout,
} from '@/components/common/InformationalDialogBase.vue';

const { t } = useI18n();
const showInfo = ref(false);

const summaryFacts = computed<InformationalDialogFact[]>(() => [
  { label: t('expediente.factClave'), value: trackable.caseKey },
  { label: t('expediente.factOrgano'), value: trackable.court ?? '—' },
  { label: t('expediente.factMateria'), value: trackable.matterType },
]);

const summarySections = computed<InformationalDialogSection[]>(() => [
  {
    title: t('expediente.sectionPartes'),
    body: `${t('expediente.demandante')}: ${trackable.clientName}`,
  },
  {
    title: t('expediente.sectionHitos'),
    bullets: [
      t('expediente.hitoRevisarPruebas'),
      t('expediente.hitoCoordinarAudiencia'),
    ],
  },
]);

const summaryCallout = computed<InformationalDialogCallout>(() => ({
  title: t('common.calloutNote'),
  body: t('expediente.summaryDisclaimer'),
}));

function onInfoClosed() {
  // callback opcional — analytics, reset de estado, etc.
}
</script>
```

---

## Casos de uso por variante

### `neutral` — Resumen de expediente (facts + secciones + callout)

```vue
<InformationalDialogBase
  v-model:visible="showSummary"
  variant="neutral"
  eyebrow="Resumen"
  title="Estado del expediente"
  :subject="trackable.title"
  :message="t('expediente.summaryIntro')"
  :facts="[
    { label: 'Clave', value: 'ALG-2024-0142' },
    { label: 'Órgano', value: '12.º Juzgado Civil de Lima' },
    { label: 'Jurisdicción', value: 'PE' },
    { label: 'Última actuación', value: '2025-04-18 · Contestación de demanda' },
  ]"
  :sections="[
    { title: 'Partes', body: 'Demandante: María Pérez. Demandada: Constructora Andina SAC.' },
    { title: 'Hitos sugeridos', bullets: ['Revisar medios probatorios.', 'Coordinar audiencia.'] },
  ]"
  :callout="{ title: 'Nota', body: 'Este resumen no constituye dictamen jurídico.' }"
  :close-label="t('common.gotIt')"
/>
```

### `info` — Guía o checklist de pasos

```vue
<InformationalDialogBase
  v-model:visible="showGuide"
  variant="info"
  eyebrow="Guía"
  title="Cómo revisar un documento antes de enviarlo"
  :message="t('reviews.guideIntro')"
  :sections="[{
    title: 'Pasos',
    bullets: [
      'Abrir vista previa y verificar numeración.',
      'Comprobar que las citas legales coincidan.',
      'Exportar PDF sin marcas de revisión.',
    ],
  }]"
  :callout="{ title: 'Privacidad', body: 'No compartas borradores por correo personal.' }"
  :close-label="t('common.gotIt')"
/>
```

### `success` — Resultado de operación ya finalizada

```vue
<InformationalDialogBase
  v-model:visible="showResult"
  variant="success"
  eyebrow="Listo"
  title="Sincronización completada"
  :subject="`Carpeta «${folder.name}»`"
  :message="t('sync.resultMessage')"
  :sections="[{
    title: 'Detalle',
    bullets: ['3 archivos actualizados, 0 conflictos.', 'Última ejecución: hoy, 14:32.'],
  }]"
  :close-label="t('common.gotIt')"
/>
```

### `warning` — Advertencia informativa (sin acción destructiva)

```vue
<InformationalDialogBase
  v-model:visible="showDeadlineAlert"
  variant="warning"
  eyebrow="Atención"
  title="Plazo judicial próximo"
  :subject="trackable.caseKey"
  :message="t('deadlines.alertMessage')"
  :callout="{
    title: 'Importante',
    body: 'Este aviso no suspende plazos ni genera constancias ante el Poder Judicial.',
  }"
  :close-label="t('common.gotIt')"
/>
```

---

## Loading + cierre limpio

```ts
const showInfo = ref(false);
const loadingInfo = ref(false);

async function openWithAsyncContent(id: string) {
  showInfo.value = true;
  loadingInfo.value = true;
  try {
    infoData.value = await api.fetchSummary(id);
  } finally {
    loadingInfo.value = false;
  }
}
```

```vue
<InformationalDialogBase
  v-model:visible="showInfo"
  :loading="loadingInfo"
  :title="infoData?.title ?? t('common.loading')"
  :facts="infoData?.facts ?? []"
  :close-label="t('common.gotIt')"
  @close="showInfo = false"
/>
```

Durante `loading`:
- El botón «Entendido» muestra spinner y queda deshabilitado.
- La **X** se oculta.
- La máscara y el Esc **no cierran** el diálogo.

---

## CSS completo (scoped)

Copiar a `<style scoped>` cuando el componente se use inline (sin `InformationalDialogBase`):

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

/* Header — sin fondo base, el tono se inyecta por clase */
.matter-dialog-header {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--surface-border);
  flex-shrink: 0;
}

/* Degradados de tono (alineados con ConfirmDialogBase) */
.matter-dialog-header--tone-neutral {
  background: linear-gradient(to bottom, color-mix(in srgb, var(--brand-zafiro) 7%, transparent), transparent 90%);
}
html.dark .matter-dialog-header--tone-neutral {
  background: linear-gradient(to bottom, color-mix(in srgb, var(--accent) 18%, transparent), transparent 90%);
}
.matter-dialog-header--tone-info {
  background: linear-gradient(to bottom, var(--accent-soft), transparent 90%);
}
html.dark .matter-dialog-header--tone-info {
  background: linear-gradient(to bottom, color-mix(in srgb, var(--accent) 22%, transparent), transparent 90%);
}
.matter-dialog-header--tone-success {
  background: linear-gradient(to bottom, color-mix(in srgb, #ecfdf5 95%, transparent), transparent 90%);
}
html.dark .matter-dialog-header--tone-success {
  background: linear-gradient(to bottom, color-mix(in srgb, #064e3b 50%, transparent), transparent 90%);
}
.matter-dialog-header--tone-warning {
  background: linear-gradient(to bottom, color-mix(in srgb, #fffbeb 96%, transparent), transparent 90%);
}
html.dark .matter-dialog-header--tone-warning {
  background: linear-gradient(to bottom, color-mix(in srgb, #78350f 38%, transparent), transparent 90%);
}

/* Icono 44x44 */
.matter-dialog-icon {
  display: flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--brand-zafiro) 22%, var(--surface-border));
  background: color-mix(in srgb, var(--brand-zafiro) 8%, var(--surface-raised));
}
.matter-dialog-icon--success {
  border-color: color-mix(in srgb, #10b981 28%, var(--surface-border));
  background: color-mix(in srgb, #10b981 10%, var(--surface-raised));
}
.matter-dialog-icon--warning {
  border-color: color-mix(in srgb, #d97706 28%, var(--surface-border));
  background: color-mix(in srgb, #f59e0b 10%, var(--surface-raised));
}
.matter-dialog-icon--neutral {
  border-color: var(--surface-border);
  background: var(--surface-sunken);
}

.matter-dialog-eyebrow {
  display: block;
  font-size: 0.6875rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--brand-zafiro);
}
html.dark .matter-dialog-eyebrow { color: var(--accent); }

.matter-dialog-title {
  font-size: 1.0625rem; font-weight: 600; line-height: 1.3;
  color: var(--fg-default); margin: 0;
}
.matter-dialog-stephint { font-size: 0.8125rem; color: var(--fg-muted); }

.dialog-close-btn {
  flex-shrink: 0; height: 2rem; width: 2rem;
  display: flex; align-items: center; justify-content: center;
  border-radius: 0.5rem; color: var(--fg-muted);
  background: none; border: none; cursor: pointer;
  transition: background-color 120ms ease;
}
.dialog-close-btn:hover { background: var(--surface-sunken); }

.matter-dialog-body { flex: 1; overflow: hidden; position: relative; min-height: 0; }
.matter-dialog-body-inner {
  max-height: min(56vh, 420px); overflow-y: auto; padding: 1.25rem 1.5rem;
}

.matter-dialog-footer {
  padding: 1rem 1.5rem; display: flex; justify-content: flex-end;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-sunken); flex-shrink: 0;
}

/* Secciones */
.matter-form-section { display: flex; flex-direction: column; gap: 0.75rem; }
.matter-form-section__title {
  font-size: 0.6875rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--fg-subtle); margin: 0; padding-bottom: 0.5rem;
  border-bottom: 1px dashed var(--surface-border);
}

/* Facts grid */
.info-dialog-facts { grid-template-columns: minmax(0, 9rem) 1fr; }
@media (max-width: 480px) { .info-dialog-facts { grid-template-columns: 1fr; } }
.font-mono-num { font-feature-settings: 'tnum' 1, 'lnum' 1; }

/* Callout por variante */
.info-dialog-callout--info {
  border-color: color-mix(in srgb, var(--accent) 35%, var(--surface-border));
  background: color-mix(in srgb, var(--accent) 8%, var(--surface-raised));
  color: var(--fg-muted);
}
.info-dialog-callout--success {
  border-color: color-mix(in srgb, #10b981 40%, var(--surface-border));
  background: color-mix(in srgb, #10b981 12%, var(--surface-raised));
  color: var(--fg-muted);
}
html.dark .info-dialog-callout--success {
  border-color: color-mix(in srgb, #10b981 35%, var(--surface-border));
  background: color-mix(in srgb, #10b981 14%, var(--surface-sunken));
}
.info-dialog-callout--warning {
  border-color: color-mix(in srgb, #d97706 40%, var(--surface-border));
  background: color-mix(in srgb, #f59e0b 12%, var(--surface-raised));
  color: var(--fg-muted);
}
html.dark .info-dialog-callout--warning {
  border-color: color-mix(in srgb, #f59e0b 35%, var(--surface-border));
  background: color-mix(in srgb, #f59e0b 12%, var(--surface-sunken));
}
.info-dialog-callout--neutral {
  border-color: var(--surface-border);
  background: var(--surface-sunken);
  color: var(--fg-muted);
}
```

---

## Reglas inviolables

1. **Una sola instancia** por acción, fuera de `v-if`/`v-for`.
2. **Botón de cierre**: `Button` con `severity` solo en `success` → `'success'` y `warning` → `'warn'`; `info` y `neutral` usan el primario de marca Alega (sin `severity`) + `icon="pi pi-check"`.
3. **`subject`** siempre entrecomillado o descriptivo: `«García vs. Municipalidad»`, `«Carpeta Principal»`.
4. **Eyebrow** obligatorio y en i18n. Ejemplos: `RESUMEN`, `GUÍA`, `LISTO`, `ATENCIÓN`.
5. **`closeLabel`** desde i18n en vistas reales (`t('common.gotIt')`). El default interno `'Entendido'` es solo fallback de sandbox.
6. **`closeAriaLabel`** desde i18n en vistas reales (`t('common.close')`).
7. **`facts`** solo para datos clave-valor cortos (máx. 6 filas). Para tablas largas, promover a [alega-form-detail-dialog](../alega-form-detail-dialog/SKILL.md).
8. **`callout`** es una nota, no un error. Si hay un error de API, usar `Toast severity="error"` + mantener el diálogo abierto.
9. **`loading`** durante carga async de contenido: mostrar el diálogo inmediatamente y cargar datos en background; bloquea X, Esc y máscara.
10. **Sin acciones secundarias** en footer — este patrón solo tiene un CTA. Si se necesita un botón adicional (ej. «Ir al expediente»), evaluar [alega-form-detail-dialog](../alega-form-detail-dialog/SKILL.md) o emitir evento `@close` y navegar desde el padre.

---

## Estados

| Estado | UI |
|--------|----|
| **Normal** | Botón habilitado, X visible, Esc y máscara cierran |
| **Loading** | Botón con spinner + disabled, X oculta, Esc y máscara bloqueados |
| **Carga de contenido async** | Abrir con `loading=true`, cargar datos, `loading=false`; el usuario ve el shell primero |

---

## Accesibilidad

- **`closeAriaLabel`** en `aria-label` del botón X (i18n desde el padre).
- **Esc** cierra cuando `!loading` (PrimeVue `close-on-escape`).
- **Máscara** cierra cuando `!loading` (PrimeVue `dismissable-mask`).
- Botón «Entendido» focalizable con Tab; Enter lo activa.
- `subject` en atributo `title` para tooltip en caso de truncado.
- No depende de color solo: icono + eyebrow comunican el tono junto al degradado.

---

## Anti-patrones

- ❌ Usar `InformationalDialogBase` cuando se necesita Cancelar/Confirmar → `ConfirmDialogBase`.
- ❌ Usar `InformationalDialogBase` cuando se necesita capturar datos → form dialog.
- ❌ Agregar un segundo botón al footer (ej. "Ir al expediente") — emitir `@close` y navegar desde el padre.
- ❌ `facts` con más de 6-8 filas — promover a `alega-form-detail-dialog`.
- ❌ Hardcodear `closeLabel="Entendido"` en vistas de producción — usar `t('common.gotIt')`.
- ❌ Poner errores de API en el callout — callout es contexto informativo, los errores van en Toast.
- ❌ Mostrar `loading=true` sin contenido inicial — siempre montar el diálogo con título mínimo antes de cargar.
- ❌ Hex sueltos o clases `text-gray-*` en el contenido — usar `var(--fg-muted)`, `var(--fg-subtle)`.
- ❌ Montar varias instancias dinámicas dentro de `v-for` — una instancia controlada por `ref` + datos cambiantes.
- ❌ `variant="danger"` — no existe; para advertencias graves usar `ConfirmDialogBase variant="danger"`.

---

## Validación al implementar

1. `pnpm --filter @tracker/web exec vue-tsc --noEmit` limpio.
2. Probar las 4 variantes en `/sandbox/components/informational-dialog`.
3. Probar modo claro y oscuro: degradado de header visible en ambos.
4. Probar `loading=true`: X oculta, máscara y Esc bloqueados, botón con spinner.
5. Probar carga async: título visible antes de datos, sin flash de contenido vacío.
6. Probar Esc y click en máscara: cierran cuando `!loading`.
7. Probar `subject` largo (> 48 chars): truncado + tooltip.
8. Comprobar que `closeLabel` y `closeAriaLabel` vienen de i18n en vistas de producción.

---

## Skills relacionadas

- [alega-confirm-dialog](../alega-confirm-dialog/SKILL.md) — confirmaciones con Cancelar/Confirmar, consecuencias y typedPhrase.
- [alega-form-dialog](../alega-form-dialog/SKILL.md) — formularios crear/editar y wizards.
- [alega-form-detail-dialog](../alega-form-detail-dialog/SKILL.md) — detalle/edición tipo Jira con sidebar y tabs.
- [alega-ui-context](../alega-ui-context/SKILL.md) — tokens, marca, temas.
- [alega-ui-coherence](../alega-ui-coherence/SKILL.md) — Tier 1/2, PageHeader, antipatrones globales.
- [alega-primevue-components](../alega-primevue-components/SKILL.md) — índice de componentes, setup base.
