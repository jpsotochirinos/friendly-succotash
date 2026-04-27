# ADR-0002: Separación estricta: etapa procesal (Timeline) vs estado operativo (Kanban)

## Status

Accepted

## Context

Un único `WorkflowItem` mezclaba tarea operativa, etapa del proceso, hito y documento, lo que hacía que el tablero tipo Jira fuese inconsistente con el proceso judicial peruano, que es en gran parte fijado por ley.

## Decision

- **StageInstance** (y su plantilla `StageTemplate`) representa la etapa **procesal** obligatoria o opcional, orden lineal/paralelo según el blueprint. Vista principal: **Timeline horizontal** (stepper) por expediente/proceso.
- **ActivityInstance** representa trabajo operativo (asignación, plazos de tarea, categoría de ejecución). Puede ser del blueprint, custom por instancia, o promovida a `TENANT`. **Nunca** existe sin `StageInstance` contenedora.
- **Kanban operativo** agrupa `ActivityInstance` por `WorkflowStateCategory` (por hacer / en progreso / en revisión / hecho) **a través** de etapas; es la vista **secundaria** de “qué tengo hoy”, no el eje legal.
- `WorkflowState` + `WorkflowDefinition` permanecen como motor genérico de columnas/estado para actividades; no sustituyen la etapa procesal.
- Trackables no judiciales pueden seguir en el modelo `WorkflowItem` clásico bajo el flag de coexistencia.

## Consequences

- Dos UIs a mantener (Timeline + Kanban) sobre el mismo dato; la misma actividad se visualiza con dos agrupaciones.
- Necesidad de educar al usuario: “etapa” ≠ “estado de la tarea”. Copy y tooltips usan términos de expediente, no jerga de motor.

## References

- UI: `apps/web/src/views/trackables/` (Timeline / Kanban)
