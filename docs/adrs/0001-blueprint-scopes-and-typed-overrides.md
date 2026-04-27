# ADR-0001: Blueprint con tres scopes (Sistema, Tenant, Instancia) y overrides tipados

## Status

Accepted

## Context

Alega necesita estructura legal curada a nivel de producto, personalización controlada por la firma, y ajustes por expediente sin perder trazabilidad. Copias completas por expediente dificultan propagar correcciones legales. Referencia pura por versión con un único JSON de diff crece sin límite y complica reversiones.

## Decision

- Introducir la entidad **Blueprint** con `scope` ∈ `SYSTEM` | `TENANT` | `INSTANCE`.
- `BlueprintVersion` inmutable al publicar; estructura (etapas, actividades, plazos, sugerencias de documento, reglas SINOE) cuelga de la versión.
- `BlueprintOverride` almacena cambios mínimos auditados: `targetType`, `targetCode`, `operation` (ADD/MODIFY/REMOVE/REORDER), `patch`, `originalValueSnapshot`, `isLocked` para respetar personalización frente a updates del padre.
- Resolución del estado efectivo: componer SYSTEM → (opcional) TENANT → INSTANCE mediante `BlueprintResolverService`, con **snapshot materializado** en `blueprint_resolved_snapshot` para lectura performante.
- `Blueprint(scope=INSTANCE)` 1:1 con `ProcessTrack` para el expediente; la instancia referencia o hereda el blueprint del tenant o del sistema.

## Consequences

- Mayor complejidad de lectura/escritura que un solo árbol de `WorkflowItem`. Mitigado por servicio central, tests, invalidación de snapshots.
- Política explícita de overrides **huérfanos** si el padre elimina un elemento: conservar, marcar en UI, advertir.
- Publicación de blueprints de sistema vía semillas repositorio y revisión en PR; editor de la firma opera sobre `TENANT`.

## References

- Plan: `docs/v2-blueprint-engine.md` (o equivalente)
- Código: `apps/api/src/modules/blueprints/`, `BlueprintResolverService`
