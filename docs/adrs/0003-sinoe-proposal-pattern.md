# ADR-0003: SINOE: patrón Proposal con capa de confianza y reversibilidad

## Status

Accepted

## Context

El flujo previo hacía match de notificaciones y **avanzaba** directamente el estado del proceso legal, generando riesgo de error irreversible bajo baja y sin control fino de automatización.

## Decision

- Toda reacción a una `SinoeNotification` que implique avance, creación de actividad, plazo o vinculación pasa por **`SinoeProposal`** (fila inmutable con historial de estatus).
- Estados: al menos `PENDING`, `AUTO_APPLIED`, `APPROVED`, `REJECTED`, `REVERTED`, `UNMATCHED` (sin regla; clasificación manual).
- Política **por organización** (`featureFlags.sinoePolicy`) y reglas de blueprint: umbrales de `confidence`, eventos “críticos” (ej. sentencia) siempre requieren aprobación, auto-aplícate solo si la política lo permite.
- Aplicar una propuesta crea entidades derivadas con `createdBySinoeProposalId`; **revertir** no borra: propuesta a `REVERTED`, entidades `isReverted = true` donde aplique, evento de proceso inmutable.
- Procesador `sinoe-match` en el worker; API expone aprobación / rechazo / revert.

## Consequences

- Mayor superficie de datos y de UI (Inbox, banners, estadísticas de calibración).
- Trazabilidad y confianza del abogado mejoran; trade-off de latencia/operación extra en aprobación manual.

## References

- `SinoeProposal` entity, `apps/api/src/modules/sinoe-proposals/`, `apps/worker/src/processors/sinoe-match.processor.ts`
