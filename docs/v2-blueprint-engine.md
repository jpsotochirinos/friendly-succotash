# Motor de expedientes v2 — Documento de referencia

Este documento enlaza el rediseño estructural (Blueprint, ProcessTrack, plazos duales, SINOE proposal) con el código. El plan de implementación detallado vive en la planificación del proyecto; no duplicar aquí toda la matriz de tareas.

## ADRs

| ADR | Tema |
|-----|------|
| [0001](adrs/0001-blueprint-scopes-and-typed-overrides.md) | Scopes y overrides tipados |
| [0002](adrs/0002-timeline-procesal-vs-kanban-operativo.md) | Timeline vs Kanban |
| [0003](adrs/0003-sinoe-proposal-pattern.md) | SINOE como propuestas |
| [0004](adrs/0004-computed-deadline-legal-and-effective-dates.md) | Plazos legales vs efectivos |

## Evolución desde el flujo legal v1

El documento [legal-process-flow.md](legal-process-flow.md) describe el enraizamiento con `kind='Proceso'`, `WorkflowState`, `WorkflowTransition`, `LegalDeadline` y el matcher SINOE sobre estados. En **v2**:

- El **proceso judicial estructurado** se modela con `ProcessTrack` + `StageInstance` + `ActivityInstance` y blueprints con versiones.
- **SINOE** pasa a **`SinoeProposal`** con política de auto-aplicación y reversión.
- **Plazos** puntuales evolucionan a **`ComputedDeadline`** con doble fecha.
- **Coexistencia** con v1: el motor legacy de `WorkflowItem` y el motor v2 (`ProcessTrack`) pueden usarse; no hay un flag de organización. Los expedientes **nuevos** obtienen un `ProcessTrack` automáticamente (estilo libre) salvo el asistente de creación, que pasa `skipAutoProcessTrack` y crea el track justo después con plantilla o libre. Los expedientes **antiguos** sin track: `pnpm --filter @tracker/api backfill:process-tracks` (requiere `pnpm db:seed:system-blueprints`).

## Catálogo de blueprints de sistema (seed)

El seed carga `packages/db/src/seeds/seed-system-blueprints.ts` a partir de `system-blueprints/`:

| Módulo | Contenido |
|--------|------------|
| [demo-freeform.ts](../packages/db/src/seeds/system-blueprints/demo-freeform.ts) | `demo-proceso-basico` (3×3 etapas), `trackable-generico-sin-proceso`, `freeform-estilo-libre` |
| [family-civil.ts](../packages/db/src/seeds/system-blueprints/family-civil.ts) | 9 plantillas civil/familia (`civil-familia-*`); `enrichInPlace` si no hay `process_tracks` |
| [matters-extras.ts](../packages/db/src/seeds/system-blueprints/matters-extras.ts) | 2 plantillas por `MatterType` (litigio, laboral, corporativo, tributario, penal, administrativo, asesoría, inmobiliario) |

Vista en app: **Configuración → Blueprints** (catálogo y editor de solo lectura / tenant).

## ActivityInstance como fuente canónica (calendario / tablero)

- Listados de producto (calendario org, resumen de expediente, inicio, bandeja global) consumen **`activity_instances`** con `COALESCE(activity_instances.trackable_id, process_tracks.trackable_id)` para el expediente.
- Los eventos de API de calendario usan id `ai:{uuid}`. `wi:` se mantiene como compatibilidad de lectura en algunos flujos.
- **Expediente → Actividades**: el toggle **«Por actividad»** muestra un Kanban (TODO / EN CURSO / HECHO) con actividades de la(s) etapa(s) `active` del track; **«Proceso general»** combina listado de etapas (izquierda) y Kanban filtrado por la etapa seleccionada.
- Datos viejos: script `packages/db/src/seeds/migrate-workflow-items-to-activities.ts` (requiere `ProcessTrack` vía `backfill:process-tracks`).

## PRs de blueprints

Usar [`.github/PULL_REQUEST_TEMPLATE/blueprint.md`](../.github/PULL_REQUEST_TEMPLATE/blueprint.md) al tocar semillas o definiciones estructurales de blueprints de sistema.
