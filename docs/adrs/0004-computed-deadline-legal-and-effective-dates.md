# ADR-0004: Plazos con `legalDate` inmutable y `effectiveDate` editable

## Status

Accepted

## Context

En derecho peruano el plazo “legal” (calculado según ley) puede diferir del plazo “efectivo” fijado por juzgado o convenido; perder el legal es riesgo profesional; ignorar el efectivo es riesgo operativo.

## Decision

- Sustituir/complimentar plazos legales puntuales con **`ComputedDeadline`** vinculado a `ProcessTrack` y a la regla `deadlineRuleCode` del blueprint.
- **`legalDate`**: calculada por el motor de días (calendario/judicial, feriados, vacaciones judiciales, y extensiones vía `CourtClosure` según juzgado/tenant) en el **disparo** del trigger. No es editable en UI salvo recalcular al cambiar el evento gatillante.
- **`effectiveDate`**: por defecto igual a `legalDate`; el usuario puede ajustarla con **razón obligatoria** y auditoría (`overrideReason`, `overrideBy`, `overrideAt`).
- UI: siempre visible la referencia legal cuando difieran; acción “Revertir al plazo legal”.
- v1: una regla de plazo = un trigger explícito; dejar el modelo listo para ampliar a múltiples triggers vía tabla o extensión sin romper columnas.

## Consequences

- Servicio de recalculo y alertas cuando cambie el trigger; posible aviso “la fecha legal cambió, ¿mantiene el efectivo?”.
- Complejidad mínima adicional aceptada frente a un solo `dueDate`.

## References

- `packages/shared/src/legal-calendar/deadline-calculator.ts`, `ComputedDeadline` entity, `apps/api` deadline services
