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

Componente: [apps/web/src/components/common/ConfirmDialogBase.vue](../../../apps/web/src/components/common/ConfirmDialogBase.vue).
Showcase: `/dev/confirm-dialog-base`. Docs largas: [docs/frontend-confirm-patterns.md](../../../docs/frontend-confirm-patterns.md).

Cargar junto con [alega-ui-context](../alega-ui-context/SKILL.md) y [alega-ui-coherence](../alega-ui-coherence/SKILL.md).

## Cuándo aplicarla

- Archivar / restaurar / eliminar expediente, documento, plantilla, parte, cliente, evento.
- Cambios irreversibles que requieren confirmación explícita (incluye palabra escrita).
- Avisos importantes con consecuencias enumeradas.
- Refactor de cualquier confirmación que aún use `useConfirm()` + `<ConfirmDialog />` global.

## Anatomía canónica

```
┌────────────────────────────────────────────────────────────────┐
│ [Icon disc por variante]  Title                                │
│                            «subject (entidad)»                 │
├────────────────────────────────────────────────────────────────┤
│ Message (sm, leading-relaxed, --fg-muted)                      │
│                                                                │
│ Qué pasará:                  ← consequencesTitle (uppercase)   │
│   · línea 1                                                     │
│   · línea 2                                                     │
│                                                                │
│ Para confirmar, escribe:     ← typedConfirmHint                │
│ Confirmación                                                   │
│ [____________________________]  (input + Enter dispara confirm)│
├────────────────────────────────────────────────────────────────┤
│                                       [Cancelar] [Confirmar]   │
└────────────────────────────────────────────────────────────────┘
```

Sin `<template #header>` propio. Sin footer custom. La X y `Esc` cierran (siempre que `!loading`).

## Variantes

| variant | Cuándo | Severity botón | Icono |
|---------|--------|----------------|-------|
| `danger` | Eliminar permanente, vaciar papelera | `danger` | `pi-exclamation-triangle` |
| `warning` | Archivar, ocultar, deshabilitar | `warn` | `pi-exclamation-circle` |
| `info` | Confirmaciones reversibles informativas | `info` | `pi-info-circle` |
| `success` | Reactivar, aprobar, finalizar | `success` | `pi-check-circle` |

Cada variante tiñe el header (gradient suave) + iconDisc + iconText + buttonSeverity. **No** elegir colores libres.

## API

```ts
defineProps<{
  visible: boolean;             // v-model:visible
  title: string;
  message: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';  // default 'info'
  subject?: string;             // entidad: «expediente Foo» / «documento Bar»
  consequences?: string[];      // bullets
  consequencesTitle?: string;   // p.ej. "Qué pasará"
  typedConfirmPhrase?: string;  // si se pasa, exige escribirla (case-insensitive, trim)
  typedConfirmHint?: string;
  typedConfirmLabel?: string;   // default "Confirmación"
  typedConfirmPlaceholder?: string;
  confirmLabel?: string;        // default "Confirmar"
  cancelLabel?: string;         // default "Cancelar"
  loading?: boolean;
  onCancel?: () => void;
}>();

defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'hide'): void;
  (e: 'confirm'): void;
}>();
```

## Reglas inviolables

1. **Único patrón** para confirmaciones nuevas. Nada de `useConfirm()` + `<ConfirmDialog />` global salvo herencia que migrarás.
2. **`subject` siempre con la entidad** (`«expediente Demanda 2024-001»`), entrecomillado, truncado.
3. **`typedConfirmPhrase` solo en `danger` irreversible**. Frase localizada por idioma (es: `ELIMINAR`, en: `DELETE`).
4. **`consequences` enumera efectos**, no procedimiento. ("Se desvincularán partes" no "Pulse confirmar").
5. **No agregar `<template #footer>`** propio: el componente ya pinta Cancelar/Confirmar. Si necesitas más botones, **no es un confirm**, es un form dialog (ver [alega-form-dialog](../alega-form-dialog/SKILL.md)).
6. **`loading` durante el `confirm`** (await del API): bloquea X, Esc y mask.
7. **i18n** para todos los strings, incluida `typedConfirmPhrase`.

## Patrones de uso

### Reversible (archivar)

```vue
<ConfirmDialogBase
  v-model:visible="showArchive"
  variant="warning"
  :title="t('trackables.archiveTitle')"
  :subject="`«${row.title}»`"
  :message="t('trackables.archiveMessage')"
  :consequences-title="t('common.consequencesTitle')"
  :consequences="[
    t('trackables.archiveCons1'),
    t('trackables.archiveCons2'),
  ]"
  :loading="archiving"
  @confirm="onArchive"
/>
```

### Irreversible (borrado permanente)

```vue
<ConfirmDialogBase
  v-model:visible="showDelete"
  variant="danger"
  :title="t('trackables.deleteForeverTitle')"
  :subject="`«${row.title}»`"
  :message="t('trackables.deleteForeverMessage')"
  :consequences-title="t('common.consequencesTitle')"
  :consequences="deleteConsequences"
  :typed-confirm-phrase="t('common.typedDeletePhrase')"  // 'ELIMINAR'
  :typed-confirm-hint="t('trackables.deleteForeverHint')"
  :typed-confirm-label="t('common.typedConfirmLabel')"
  :loading="deleting"
  @confirm="onDeleteForever"
/>
```

### Positiva (reactivar)

```vue
<ConfirmDialogBase
  v-model:visible="showRestore"
  variant="success"
  :title="t('trackables.restoreTitle')"
  :subject="`«${row.title}»`"
  :message="t('trackables.restoreMessage')"
  @confirm="onRestore"
/>
```

## Loading + cierre

Patrón:

```ts
async function onArchive() {
  archiving.value = true;
  try {
    await api.archive(row.id);
    showArchive.value = false;     // cierre tras éxito
    toast.add({ severity: 'success', ... });
    refresh();
  } catch (err) {
    toast.add({ severity: 'error', ... });
    // dejar abierto para que el usuario reintente
  } finally {
    archiving.value = false;
  }
}
```

## Migración desde el legacy `useConfirm()`

| Antes | Ahora |
|-------|-------|
| `useConfirm().require({ ... acceptIcon, rejectIcon ... })` | `<ConfirmDialogBase>` con `variant` |
| `acceptClass: 'p-button-danger'` | `variant="danger"` |
| `header: 'Eliminar'` | `:title="t(...)"` |
| `message: 'Esto borrará...'` | `:message="t(...)"` + `:consequences="[...]"` |
| Sin entidad | `:subject="«${entity.title}»"` obligatorio |
| Confirmación con typing inline | `:typed-confirm-phrase` |

## Accesibilidad

- Foco al abrir va al primer `Button` o al `InputText` de typed-confirm si existe.
- `Enter` en typed-confirm dispara `confirm`.
- Todas las acciones tienen `aria-label` y texto visible (no icon-only).
- Mensajes no dependen solo del color (icono + texto + variante).

## Skills relacionadas

- [alega-ui-context](../alega-ui-context/SKILL.md) — variantes y showcase.
- [alega-form-dialog](../alega-form-dialog/SKILL.md) — cuando se requieren campos, no confirmación.
- [alega-datatable](../alega-datatable/SKILL.md) — origen típico de confirmaciones (acciones de fila).
