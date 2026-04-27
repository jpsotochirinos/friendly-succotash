---
name: confirm-dialog-standard
overview: Estandarizar los diálogos de confirmación de Alega con un componente PrimeVue propio, claro para abogados, coherente con tokens de marca, i18n y estados de riesgo. Empezar por `TrackablesListView.vue` y dejar una guía reusable para migrar el resto de la app.
todos:
  - id: design-dialog-api
    content: Definir el API final de `ConfirmDialogBase` manteniendo compatibilidad con el uso actual.
    status: completed
  - id: implement-dialog
    content: Actualizar `ConfirmDialogBase.vue` con asunto, consecuencias, confirmación por texto, estados y tokens Alega.
    status: completed
  - id: apply-trackables
    content: Aplicar el estándar en archivo, reactivación y eliminación permanente dentro de `TrackablesListView.vue`.
    status: completed
  - id: align-delete-wizard
    content: Alinear `DeleteTrackableDialog.vue` con la misma anatomía visual y copy de riesgo.
    status: completed
  - id: update-i18n-showcase-skills
    content: Actualizar i18n, showcase dev y la documentación/skill UI para dejar el estándar reutilizable.
    status: completed
  - id: verify
    content: Ejecutar revisión de lints y checklist visual claro/oscuro.
    status: completed
isProject: false
---

# Estándar Confirm Dialog Alega

## Resultado Visual Propuesto

El mejor confirm dialog para abogados debe responder en 5 segundos: qué acción estoy por ejecutar, sobre qué expediente/documento, qué consecuencia legal-operativa tiene y si puedo deshacerla.

Estructura canónica:

```text
[icono semántico]  Archivar expediente
                  “García vs. Municipalidad”

Este expediente saldrá de En curso, pero conservará documentos,
actuaciones, plazos e historial. Podrás reactivarlo cuando lo necesites.

Qué pasará:
- Se ocultará del trabajo diario.
- No se eliminará ningún documento.
- El equipo podrá verlo en Archivados.

[Cancelar] [Archivar expediente]
```

Para acciones irreversibles, usar una segunda capa:

```text
[icono peligro]  Eliminar expediente permanentemente
                “García vs. Municipalidad”

Esta acción no se puede deshacer. Se eliminarán documentos, carpetas,
actividades y trazabilidad del expediente.

Escribe eliminar para continuar.
[Input: eliminar]

[Cancelar] [Eliminar permanentemente]
```

## Decisiones De Diseño

- Mantener un wrapper propio basado en PrimeVue `Dialog` en [`apps/web/src/components/common/ConfirmDialogBase.vue`](apps/web/src/components/common/ConfirmDialogBase.vue), porque permite contenido rico, entity summary, listas de consecuencias, input de confirmación y estados de carga mejor que `useConfirm()` directo.
- Renombrar o evolucionar el API hacia un componente más expresivo: `variant`, `tone`, `subject`, `description`, `consequences`, `confirmText`, `confirmPlaceholder`, `loading`, `confirmLabel`, `cancelLabel`.
- Usar variantes por intención legal-operativa: `info`, `warning`, `danger`, `success`. Para abogados, `warning` = cambia disponibilidad o flujo; `danger` = irreversible o elimina evidencia/datos.
- Reemplazar colores sueltos por tokens Alega y clases semánticas del proyecto: `var(--fg-default)`, `var(--fg-muted)`, `var(--surface-border)`, `var(--accent-soft)`, Prime severities solo en botones cuando aporten jerarquía.
- Usar copy claro, no genérico: evitar “¿Está seguro?”. Preferir “Archivar expediente”, “Eliminar documento permanentemente”, “Reactivar expediente”.
- Mantener foco y accesibilidad: título claro, cierre bloqueado durante loading, Enter solo confirma si el estado es válido, botón destructivo al final, cancelar siempre disponible salvo operación corriendo.

## Cambios Propuestos

1. Mejorar [`apps/web/src/components/common/ConfirmDialogBase.vue`](apps/web/src/components/common/ConfirmDialogBase.vue):
   - Layout más jurídico: encabezado con icono, título y asunto/entidad.
   - Cuerpo con `message` + lista opcional de consecuencias.
   - Soporte opcional para confirmación por texto en acciones irreversibles.
   - Tokens Alega y dark mode limpio.
   - API compatible con el uso actual para no romper pantallas existentes.

2. Aplicarlo en [`apps/web/src/views/trackables/TrackablesListView.vue`](apps/web/src/views/trackables/TrackablesListView.vue):
   - Archivar expediente: `warning`, sujeto con nombre del expediente, consecuencias reversibles.
   - Reactivar expediente: añadir confirmación `success` o `info` antes de moverlo a En curso.
   - Eliminar documento permanentemente en papelera: añadir confirmación `danger`, hoy borra directo.
   - Mantener `DeleteTrackableDialog.vue` para eliminación total, pero alinear su header/copy con el nuevo estándar.

3. Actualizar textos i18n en [`apps/web/src/i18n/index.ts`](apps/web/src/i18n/index.ts):
   - Nuevos mensajes en español e inglés para consecuencias, sujetos y botones.
   - Reemplazar textos genéricos o hardcoded como “Error al reactivar”.

4. Pulir showcase en [`apps/web/src/views/dev/ConfirmDialogBaseShowcaseView.vue`](apps/web/src/views/dev/ConfirmDialogBaseShowcaseView.vue):
   - Mostrar casos reales: archivar expediente, eliminar documento, reactivar usuario/expediente.
   - Documentar cuándo usar cada variante.
   - Quitar `font-mono` si se mantiene dentro del alcance de coherencia visual.

5. Añadir estándar a las skills del proyecto:
   - Actualizar [`/.agents/skills/alega-ui-context/SKILL.md`](.agents/skills/alega-ui-context/SKILL.md) con una sección corta de confirm dialogs.
   - Si conviene, crear o ampliar una regla en [`/.agents/skills/alega-ui-coherence/SKILL.md`](.agents/skills/alega-ui-coherence/SKILL.md): “confirmaciones destructivas y reversibles”.

## Alcance Inicial

El primer pase se limita a `TrackablesListView.vue`, `ConfirmDialogBase.vue`, `DeleteTrackableDialog.vue`, i18n y el showcase dev. Después se puede migrar en otro pase el uso directo de `ConfirmDialog` en usuarios, roles, clientes, documentos y procesos.

## Verificación

- Revisar lints de archivos editados.
- Probar manualmente: archivar, reactivar, eliminar documento permanente y eliminar expediente.
- Verificar tema claro/oscuro y estados de loading.
- Validar que cancelar no ejecute acciones y que el input de confirmación bloquee acciones irreversibles.
