---
name: alega-onboarding-stepper
description: >
  Patrón de onboarding y asistentes paso-a-paso en Alega (Vue 3, PrimeVue 4).
  Usar cuando se planifique o implemente onboarding, setup inicial, wizard, stepper,
  asistente de creación, "Nuevo expediente" con pasos, configuración de despacho o flujos
  guiados. Define sidebar stepper, progreso, validación por paso, Dialog headless edge-to-edge
  y layout responsive.
---

# Alega — onboarding / stepper wizard

Cargar junto con [alega-form-dialog](../alega-form-dialog/SKILL.md), [alega-ui-context](../alega-ui-context/SKILL.md), [alega-ui-coherence](../alega-ui-coherence/SKILL.md), [alega-motion](../alega-motion/SKILL.md) y [primevue](../primevue/SKILL.md).

## Cuándo usarla

- Onboarding del despacho, usuario o primer expediente.
- Asistentes guiados de 2-5 pasos: `Nuevo expediente`, `Nueva audiencia`, `Configurar área`, `Importar casos`.
- Flujos donde el usuario necesita saber "dónde estoy, cuánto falta, qué viene".

Si el flujo tiene más de 5 pasos, ramificación fuerte o navegación libre tipo panel de configuración, diseñarlo como página dedicada Tier 2, no como modal.

## Elección de contenedor

| Caso | Contenedor |
|------|------------|
| Setup inicial / onboarding principal | Página Tier 2 o pantalla dedicada, no modal |
| Crear entidad desde listado | `Dialog` headless `#container` con `matter-dialog-shell` |
| Paso corto embebido en una vista | Card `.app-card` con el mismo stepper |

## Onboarding post-registro (“app intro”)

Implementación de referencia: `apps/web/src/views/onboarding/OnboardingWizard.vue` con **shell split**:

- **Ruta:** `/onboarding` es ruta **autenticada** de primer nivel (fuera de `AppLayout`), para que el onboarding sea pantalla completa propia hasta `onboardingCompleted`.
- **Izquierda:** marca, título del paso, cuerpo con **un solo scroll**; al pie, **`OnboardingStepperRail` horizontal** (segmentos + etiquetas compactas, progreso real, `aria-current="step"`, solo pasos **anteriores** clicables) y fila Atrás / Siguiente / Ir al dashboard.
- **Derecha (lg+):** `OnboardingFeaturePreview.vue` — **mocks interactivos livianos** por paso (tablero, despacho, áreas, calendario+documento, equipo), con tokens de marca (`--brand-zafiro`, `--surface-*`, `--fg-muted`). **No** screenshots estáticos genéricos; deben leerse como mini UI Alega.
- **Móvil:** panel derecho oculto; debajo del card principal, tira compacta con el mismo preview (`compact`).

Cards de selección reutilizables: `OnboardingOptionCard.vue` (touch ≥44px, estado seleccionado claro). Datos: `onboarding.types.ts` + borrador `localStorage` + `PATCH /organizations/me` (`onboardingState`).

En modal, usar siempre `#container` para evitar márgenes internos de PrimeVue:

```vue
<Dialog
  v-model:visible="open"
  modal
  :draggable="false"
  :closable="false"
  :style="{ width: 'min(880px, 96vw)' }"
  :pt="{ root: { class: 'matter-dialog-root !border-0 !bg-transparent !p-0 !m-0 !shadow-none overflow-visible' } }"
>
  <template #container>
    <div class="onboarding-shell">
      ...
    </div>
  </template>
</Dialog>
```

## Anatomía canónica

```
┌ onboarding-shell / matter-dialog-shell ───────────────────────────────┐
│ Sidebar 240px                                                         │
│ · Marca: icono + eyebrow + título                                     │
│ · Progreso: "33% completado" + barra                                  │
│ · Stepper vertical: dot, label, hint, estados done/current/locked      │
│ · Ayuda contextual abajo                                              │
├───────────────────────────────────────────────────────────────────────┤
│ Content                                                               │
│ · Header: título del paso, subtítulo, X/acción secundaria              │
│ · Body: un solo scroll, secciones de formulario                        │
│ · Footer: Cancelar · Atrás · Siguiente / Finalizar                    │
└───────────────────────────────────────────────────────────────────────┘
```

## Reglas inviolables

1. **Un solo scroll**: body del contenido scrollea; el dialog/shell no debe generar scroll doble.
2. **Sin caja dentro de caja**: el shell toca el borde del diálogo; no usar slot default de `Dialog` para wizards edge-to-edge.
3. **Sidebar fija** en desktop: `grid-template-columns: 240px minmax(0, 1fr)`. En móvil, sidebar arriba y stepper horizontal con scroll.
4. **Progreso real**: `Math.round(((step + 1) / total) * 100)`, mostrado con texto + `role="progressbar"`.
5. **Navegación controlada**: se puede volver a pasos previos; no avanzar a futuros sin validar pasos intermedios.
6. **Validación por paso**: `advance()` llama `validateStep(step)` y enfoca el primer error.
7. **Footer sin leyendas**: no meter texto de shortcuts en la barra de acciones. Mantener Enter/Esc/Cmd+Enter en código.
8. **i18n total**: títulos, hints, ayuda, errores, botones, aria-labels y progreso.

## Modelo de pasos

```ts
type WizardStepId = 'identity' | 'parties' | 'template';

const stepIds: WizardStepId[] = ['identity', 'parties', 'template'];
const step = ref(0);
const total = computed(() => stepIds.length);
const currentStepId = computed(() => stepIds[step.value]);
const progressPct = computed(() => Math.round(((step.value + 1) / total.value) * 100));

function goToStep(index: number) {
  if (index <= step.value) step.value = index;
}

async function advance() {
  if (!(await validateStep(step.value))) return;
  if (step.value < total.value - 1) step.value += 1;
  else await submit();
}
```

## Template base

```vue
<div class="onboarding-shell">
  <aside class="onboarding-sidebar" :aria-label="t('onboarding.stepperLabel')">
    <div class="onboarding-brand">...</div>
    <div class="onboarding-progress" role="progressbar" :aria-valuenow="progressPct" aria-valuemin="0" aria-valuemax="100">
      <span>{{ t('onboarding.progressLabel', { n: progressPct }) }}</span>
      <div class="onboarding-progress__bar"><div :style="{ width: `${progressPct}%` }" /></div>
    </div>
    <ol class="onboarding-steps">
      <li v-for="(stepId, idx) in stepIds" :key="stepId" :class="{ current: idx === step, done: idx < step }">
        <button type="button" :disabled="idx > step" :aria-current="idx === step ? 'step' : undefined" @click="goToStep(idx)">
          <span class="onboarding-step__dot"><i v-if="idx < step" class="pi pi-check" /></span>
          <span>
            <span>{{ t(`onboarding.steps.${stepId}`) }}</span>
            <small>{{ t(`onboarding.stepHints.${stepId}`) }}</small>
          </span>
        </button>
      </li>
    </ol>
  </aside>

  <section class="onboarding-content">
    <header class="onboarding-header">
      <div>
        <h2>{{ t(`onboarding.steps.${currentStepId}`) }}</h2>
        <p>{{ t(`onboarding.stepHints.${currentStepId}`) }}</p>
      </div>
      <Button icon="pi pi-times" text rounded :aria-label="t('common.close')" @click="attemptClose" />
    </header>

    <form class="onboarding-body" novalidate @submit.prevent="advance" @keydown="onKeydown">
      <div v-show="step === 0">...</div>
      <div v-show="step === 1">...</div>
      <div v-show="step === 2">...</div>
    </form>

    <footer class="onboarding-footer">
      <Button type="button" :label="t('common.cancel')" text :disabled="loading" @click="attemptClose" />
      <div class="flex items-center justify-end gap-2">
        <Button v-if="step > 0" :label="t('common.back')" icon="pi pi-arrow-left" outlined severity="secondary" @click="step -= 1" />
        <Button v-if="step < total - 1" :label="t('common.next')" icon="pi pi-arrow-right" icon-pos="right" :disabled="!canAdvance" @click="advance" />
        <Button v-else :label="t('common.finish')" icon="pi pi-check" :loading="loading" :disabled="!canSubmit" @click="advance" />
      </div>
    </footer>
  </section>
</div>
```

## CSS base

```css
.onboarding-shell {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  width: 100%;
  max-height: min(88vh, 720px);
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  box-shadow: var(--shadow-lg);
}
.onboarding-sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 1.35rem 1.1rem 1rem;
  border-right: 1px solid var(--surface-border);
  background: linear-gradient(180deg, color-mix(in srgb, var(--brand-zafiro) 14%, var(--surface-raised)), color-mix(in srgb, var(--brand-zafiro) 5%, var(--surface-raised)));
}
.onboarding-content {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.onboarding-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem 1.35rem;
}
@media (max-width: 699px) {
  .onboarding-shell {
    grid-template-columns: 1fr;
  }
  .onboarding-sidebar {
    border-right: 0;
    border-bottom: 1px solid var(--surface-border);
  }
}
```

## Checklist de planeación

- Definir objetivo del onboarding en una frase y criterio de éxito.
- Limitar a 3 pasos principales; máximo 5 si cada paso es corto.
- Decidir qué datos son obligatorios para avanzar y cuáles pueden quedar para después.
- Incluir estado de salida parcial si cerrar el wizard no debe perder datos.
- Diseñar empty/error/loading por paso, no solo para el submit final.
- Probar desktop, 700px y móvil estrecho; sin doble scroll ni contenido cortado.
