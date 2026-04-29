---
name: alega-confirm-dialog
description: >
  Estándar único de confirmaciones en Alega: `ConfirmDialogBase` (PrimeVue Dialog scoped, sin
  `ConfirmationService`). Variantes danger/warning/info/success, anatomía title + subject +
  message + consequences + typedConfirmPhrase. Usar para archivar/eliminar/reactivar/aprobar
  o cualquier acción que requiera consentimiento explícito. Migrar usos de `useConfirm()` y
  `<ConfirmDialog />` legacy a este patrón.
---

# Alega — confirmaciones (ConfirmDialogBase)

**Componente:** [apps/web/src/components/common/ConfirmDialogBase.vue](../../../apps/web/src/components/common/ConfirmDialogBase.vue)
**Sandbox en vivo:** `/sandbox/components/confirm-dialog` (`pnpm --filter @tracker/web dev`)
**Showcase legacy:** `/dev/confirm-dialog-base`
**Docs largas:** [docs/frontend-confirm-patterns.md](../../../docs/frontend-confirm-patterns.md)

Cargar siempre junto con [alega-ui-context](../alega-ui-context/SKILL.md), [alega-ui-coherence](../alega-ui-coherence/SKILL.md) y [alega-primevue-components](../alega-primevue-components/SKILL.md).

---

## Cuándo aplicarla

- Archivar / restaurar / eliminar (papelera permanente) expediente, documento, plantilla, parte, cliente, evento.
- Cambios irreversibles que requieren consentimiento explícito (con palabra escrita).
- Avisos importantes con consecuencias enumeradas que el usuario debe leer.
- Refactor de cualquier confirmación que aún use `useConfirm()` + `<ConfirmDialog />` global.

**No aplicar si:** la acción requiere capturar datos (form). Para eso usa [alega-form-dialog](../alega-form-dialog/SKILL.md).

---

## Anatomía canónica

```
┌────────────────────────────────────────────────────────────────┐
│ [Icon disc 48px]  Title                                  [X]   │
│                   «subject (entidad)»                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Message (sm, leading-relaxed, --fg-muted)                      │
│                                                                │
│ QUÉ PASARÁ:                  ← consequencesTitle (uppercase)   │
│   · Línea 1                                                    │
│   · Línea 2                                                    │
│   · Línea 3                                                    │
│                                                                │
│ Esto no se puede deshacer... ← typedConfirmHint                │
│ Escribe ELIMINAR para confirmar                                │
│ [____________________________]  (Enter dispara confirm)        │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                       [Cancelar] [Confirmar]   │
└────────────────────────────────────────────────────────────────┘
```

**Sin `<template #header>` propio.** Sin footer custom. Sin gradient extra. La X y `Esc` cierran (siempre que `!loading`).

---

## Variantes (4)

| variant | Cuándo | Severity botón | Icono | Disco |
|---------|--------|----------------|-------|-------|
| `danger` | Eliminar permanente, vaciar papelera, revocar | `danger` | `pi-exclamation-triangle` | `bg-red-100/95 dark:bg-red-900/50` |
| `warning` | Archivar, ocultar, deshabilitar | `warn` | `pi-exclamation-circle` | `bg-amber-100/95 dark:bg-amber-900/45` |
| `info` *(default)* | Confirmaciones reversibles informativas | `info` | `pi-info-circle` | `bg-[var(--accent-soft)]` |
| `success` | Reactivar, aprobar, finalizar, publicar | `success` | `pi-check-circle` | `bg-emerald-100/95 dark:bg-emerald-900/50` |

Cada variante tiñe header (gradient suave de arriba) + iconDisc + iconText + buttonSeverity. **Nunca elegir colores libres.**

---

## API completa

### Props

```ts
interface Props {
  /** v-model:visible — controlado por el padre */
  visible: boolean;
  /** Título de la acción (verbo + sustantivo): "Archivar expediente", "Eliminar documento" */
  title: string;
  /** Párrafo principal de contexto en lenguaje natural */
  message: string;
  /** Default: 'info'. Tono de la confirmación */
  variant?: 'danger' | 'warning' | 'info' | 'success';
  /** Entidad bajo el título: «García vs. Municipalidad». Se trunca con title= attr */
  subject?: string;
  /** Lista "Qué pasará" en bullets. Una línea = una consecuencia. */
  consequences?: string[];
  /** Encabezado de la lista de consecuencias (i18n). Default '' */
  consequencesTitle?: string;
  /** Si se define, exige al usuario escribir esta frase (case-insensitive, trim) */
  typedConfirmPhrase?: string;
  /** Texto explicativo antes del input typed-confirm */
  typedConfirmHint?: string;
  /** Etiqueta del input typed-confirm. Default: "Confirmación" */
  typedConfirmLabel?: string;
  /** Placeholder del input. Default: la propia phrase */
  typedConfirmPlaceholder?: string;
  /** Etiqueta botón primario. Default: "Confirmar". Recomendado: verbo concreto */
  confirmLabel?: string;
  /** Etiqueta botón secundario. Default: "Cancelar" */
  cancelLabel?: string;
  /** Si `true`: spinner en confirm, mask y X bloqueados, Esc bloqueado */
  loading?: boolean;
  /** Callback opcional al cancelar */
  onCancel?: () => void;
}
```

### Eventos

| Evento | Payload | Cuándo |
|--------|---------|--------|
| `update:visible` | `boolean` | v-model cambia (cancel, confirm exitoso, X, Esc, mask) |
| `hide` | — | Tras cerrarse (resetea phraseInput interno) |
| `confirm` | — | Click en botón confirmar (solo si `canSubmit && !loading`) |

### Comportamiento `canSubmit`

- Sin `typedConfirmPhrase` → siempre `true`
- Con `typedConfirmPhrase` → input.trim().toLowerCase() === phrase.trim().toLowerCase()

### Comportamiento `dialogWidth`

- Wide (`min(520px, 96vw)`) si: hay consequences, hay typedConfirm, o subject > 48 chars
- Default (`min(440px, 96vw)`) si no

---

## Reglas inviolables

1. **Único patrón** para confirmaciones nuevas. Nada de `useConfirm()` + `<ConfirmDialog />` global salvo herencia que migrarás.
2. **`subject` siempre con la entidad** entrecomillada: `«expediente Demanda 2024-001»`, `«Contrato_v3.pdf»`. Truncado con `title=` attr para tooltip.
3. **`typedConfirmPhrase` solo en `danger` irreversible**. Frase localizada por idioma:
   - es: `ELIMINAR`, `BORRAR`, `VACIAR`
   - en: `DELETE`, `EMPTY`
4. **`consequences` enumera efectos**, no procedimiento:
   - ✅ "Se desvincularán todas las partes del expediente."
   - ❌ "Pulse confirmar para continuar."
5. **`confirmLabel` con verbo concreto**, no genérico:
   - ✅ "Archivar", "Eliminar permanentemente", "Reactivar"
   - ❌ "Confirmar", "OK", "Sí"
6. **No agregar `<template #footer>` propio**. El componente ya pinta Cancelar/Confirmar. Si necesitas más botones, **no es un confirm** — es un form dialog (ver [alega-form-dialog](../alega-form-dialog/SKILL.md)).
7. **`loading` durante el `confirm`** (await del API): bloquea X, Esc y mask.
8. **i18n para todos los strings**, incluyendo `typedConfirmPhrase`.
9. **Único `<ConfirmDialogBase>` por acción** en el template. Si hay 3 acciones (archivar, restaurar, eliminar), se montan 3 instancias separadas — ver `TrackablesListView.vue`.
10. **No anidar** un `<ConfirmDialogBase>` dentro de un `Dialog` form abierto: confirmar en un mismo flow. Cierra el form, abre el confirm, y al confirmar reabre el form si falla.

---

## Patrones por caso de uso

### 1. Archivar (warning, reversible)

```vue
<ConfirmDialogBase
  v-model:visible="showArchive"
  variant="warning"
  :title="t('trackables.archiveConfirmHeader')"
  :subject="`«${row.title}»`"
  :message="t('trackables.archiveConfirmMessage')"
  :consequences-title="t('common.consequencesTitle')"
  :consequences="[
    t('trackables.archiveCons1'),
    t('trackables.archiveCons2'),
    t('trackables.archiveCons3'),
  ]"
  :confirm-label="t('trackables.archiveActionLabel')"
  :loading="archiving"
  @confirm="onArchive"
/>
```

i18n recomendado:

```ts
trackables: {
  archiveConfirmHeader: 'Archivar expediente',
  archiveConfirmMessage: 'El expediente se moverá a Archivados y dejará de aparecer en la vista activa. Podrás reactivarlo en cualquier momento.',
  archiveCons1: 'No aparecerá en el listado activo.',
  archiveCons2: 'Las notificaciones y plazos quedarán suspendidos.',
  archiveCons3: 'Los colaboradores perderán acceso a la vista principal.',
  archiveActionLabel: 'Archivar',
}
```

### 2. Eliminar permanente (danger, irreversible + typed confirm)

```vue
<ConfirmDialogBase
  v-model:visible="showDelete"
  variant="danger"
  :title="t('docs.deleteForeverTitle')"
  :subject="`«${doc.fileName}»`"
  :message="t('docs.deleteForeverMessage')"
  :consequences-title="t('common.consequencesTitle')"
  :consequences="deleteConsequences"
  :typed-confirm-phrase="t('common.typedDeletePhrase')"
  :typed-confirm-hint="t('docs.deleteForeverHint')"
  :typed-confirm-label="t('docs.deleteForeverInputLabel')"
  :confirm-label="t('docs.deleteForeverButton')"
  :loading="deleting"
  @confirm="onDeleteForever"
/>
```

i18n:

```ts
common: {
  typedDeletePhrase: 'ELIMINAR',
  consequencesTitle: 'Qué pasará',
}
docs: {
  deleteForeverTitle: 'Eliminar permanentemente',
  deleteForeverMessage: 'Esta acción no se puede deshacer. El documento será eliminado de forma permanente junto con su historial de versiones.',
  deleteForeverHint: 'Esta acción es irreversible. Para confirmar, escribe la palabra a continuación.',
  deleteForeverInputLabel: 'Escribe ELIMINAR para confirmar',
  deleteForeverButton: 'Eliminar permanentemente',
}
```

### 3. Reactivar / publicar (success, positiva)

```vue
<ConfirmDialogBase
  v-model:visible="showRestore"
  variant="success"
  :title="t('trackables.reactivateConfirmHeader')"
  :subject="`«${row.title}»`"
  :message="t('trackables.reactivateConfirmMessage')"
  :consequences="reactivateConsequences"
  :consequences-title="t('common.consequencesTitle')"
  :confirm-label="t('trackables.reactivateActionLabel')"
  :loading="reactivating"
  @confirm="onReactivate"
/>
```

### 4. Confirmación neutra (info, sin consequences)

```vue
<ConfirmDialogBase
  v-model:visible="showPublish"
  variant="info"
  :title="t('docs.publishTitle')"
  :message="t('docs.publishMessage')"
  :confirm-label="t('docs.publishLabel')"
  :loading="publishing"
  @confirm="onPublish"
/>
```

---

## Loading + manejo de errores (patrón canónico)

```ts
async function onArchive() {
  if (!archiveTarget.value) return;
  archiving.value = true;
  try {
    await api.trackables.archive(archiveTarget.value.id);
    showArchive.value = false;        // cerrar tras éxito
    archiveTarget.value = null;       // limpiar referencia
    toast.add({
      severity: 'success',
      summary: t('trackables.archiveSuccess'),
      detail: archiveTarget.value?.title,
      life: 3000,
    });
    refresh();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: t('trackables.archiveError'),
      detail: extractErrorMessage(err),
      life: 5000,
    });
    // dejar abierto para que el usuario reintente o cancele
  } finally {
    archiving.value = false;
  }
}
```

**Reglas del catch:**
- ❌ No cerrar el diálogo si falla — el usuario pierde el contexto.
- ✅ Toast de error con `summary` corto y `detail` con el motivo.
- ✅ `finally` siempre resetea `loading.value = false`.

---

## Múltiples acciones en una vista (patrón TrackablesListView)

```vue
<template>
  <!-- 1 ConfirmDialogBase por tipo de acción, fuera de v-if/v-for -->
  <ConfirmDialogBase
    v-model:visible="showArchiveConfirm"
    variant="warning"
    :title="t('...')"
    :subject="archiveConfirmTarget?.title"
    ... @confirm="confirmArchiveTrackable"
  />
  <ConfirmDialogBase
    v-model:visible="showReactivateConfirm"
    variant="success"
    :subject="reactivateConfirmTarget?.title"
    ... @confirm="confirmReactivateTrackable"
  />
  <ConfirmDialogBase
    v-model:visible="showTrashPermanentConfirm"
    variant="danger"
    :subject="trashPermanentTarget?.title"
    typed-confirm-phrase="ELIMINAR"
    ... @confirm="confirmPermanentDelete"
  />
</template>

<script setup>
const archiveConfirmTarget = ref<MockTrackable | null>(null);
const showArchiveConfirm = ref(false);
const archivingConfirm = ref(false);

function requestArchive(row: MockTrackable) {
  archiveConfirmTarget.value = row;
  showArchiveConfirm.value = true;
}
</script>
```

Ventaja: cada acción tiene su `target`, `loading`, `consequences`, sin conflictos.

---

## Migración desde el legacy `useConfirm()`

| Antes | Ahora |
|-------|-------|
| `useConfirm().require({ ... acceptIcon, rejectIcon ... })` | `<ConfirmDialogBase>` con `variant` |
| `acceptClass: 'p-button-danger'` | `variant="danger"` |
| `acceptClass: 'p-button-warn'` | `variant="warning"` |
| `header: 'Eliminar'` | `:title="t(...)"` |
| `message: 'Esto borrará...'` | `:message="t(...)"` + `:consequences="[...]"` |
| Sin entidad | `:subject="«${entity.title}»"` (obligatorio) |
| `accept` con confirm inline (typing) | `:typed-confirm-phrase` |
| Sin loading | `:loading="deleting"` |
| `acceptLabel: 'Sí'` | `:confirm-label="t('verb.action')"` |
| `<ConfirmDialog />` global en App.vue | Una instancia por acción en la vista |

### Antes (legacy)

```ts
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

confirm.require({
  message: `¿Eliminar «${item.title}»?`,
  header: 'Eliminar',
  icon: 'pi pi-exclamation-triangle',
  acceptClass: 'p-button-danger',
  accept: async () => await api.delete(item.id),
});
```

### Ahora (canónico)

```vue
<ConfirmDialogBase
  v-model:visible="showDelete"
  variant="danger"
  :title="t('docs.deleteTitle')"
  :subject="`«${item.title}»`"
  :message="t('docs.deleteMessage')"
  :loading="deleting"
  @confirm="onDelete"
/>
```

---

## Accesibilidad

- **Foco al abrir** va al primer `Button` o al `InputText` de typed-confirm si existe.
- **Enter** en typed-confirm dispara `confirm` (si `canSubmit`).
- **Esc** cierra (si `!loading`). PrimeVue lo gestiona vía `close-on-escape`.
- Todos los botones tienen texto visible (no icon-only) y `aria-label` automático.
- Mensajes no dependen solo del color (icono + texto + variante).
- `aria-live` no necesario porque el dialog es modal y bloquea el resto.
- **Contraste**: variantes danger/warning/success usan colores con AAA en modo claro y oscuro.

---

## Anti-patrones

- ❌ `window.confirm('¿Seguro?')` — es bloqueante, sin estilo, sin loading.
- ❌ `<ConfirmDialog />` (global de PrimeVue) en código nuevo.
- ❌ Múltiples `<ConfirmDialog />` dentro de `v-if` o `v-for`.
- ❌ `:title="'Archivar'"` hardcoded — usar `t('...')`.
- ❌ `:confirm-label="'OK'"` o `'Sí'` — usar verbo concreto: "Archivar", "Eliminar".
- ❌ Falta `subject` con la entidad — al usuario no le queda claro qué va a pasar.
- ❌ `typed-confirm-phrase` en `warning` o `success` — solo `danger` irreversible.
- ❌ `consequences` con procedimiento ("Pulse confirmar") en lugar de efectos.
- ❌ Cerrar el diálogo en el `catch` — el usuario pierde el contexto del error.
- ❌ Olvidar `loading.value = false` en el `finally` — diálogo queda bloqueado.
- ❌ `accept` sin `try/catch` — si la API falla, no hay feedback.
- ❌ Mismo `<ConfirmDialogBase>` reutilizado para múltiples acciones cambiando props dinámicamente — cada tipo de acción su instancia.

---

## Validación al implementar

1. `pnpm --filter @tracker/web exec vue-tsc --noEmit` limpio.
2. Probar las 4 variantes en dev.
3. Probar typed-confirm con frase correcta e incorrecta.
4. Probar loading: simular API lenta, verificar mask + X + Esc bloqueados.
5. Probar error: simular API que falla, verificar toast + diálogo abierto.
6. Probar accesibilidad: foco al abrir, Enter para confirmar, Esc para cancelar.
7. Probar dark mode: gradient de header se ve bien.
8. `prefers-reduced-motion`: animación de mask deshabilitada.

---

## Skills relacionadas

- [alega-ui-context](../alega-ui-context/SKILL.md) — variantes y showcase.
- [alega-ui-coherence](../alega-ui-coherence/SKILL.md) — Tier 1/2, tokens, tipografía.
- [alega-form-dialog](../alega-form-dialog/SKILL.md) — cuando se requieren campos, no confirmación.
- [alega-informational-dialog](../alega-informational-dialog/SKILL.md) — cuando solo se muestra información (sin acción confirmable ni form).
- [alega-form-detail-dialog](../alega-form-detail-dialog/SKILL.md) — diálogos de detalle tipo Jira.
- [alega-datatable](../alega-datatable/SKILL.md) — origen típico de confirmaciones (acciones de fila).
- [alega-primevue-components](../alega-primevue-components/SKILL.md) — hub índice.
- [primevue](../primevue/SKILL.md) — setup base.
