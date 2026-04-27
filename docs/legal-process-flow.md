# Motor de flujos procesales legales

> **Nota (UI):** el CRUD de «Flujos» y «Reglas de flujo» en Configuración fue retirado; las definiciones de sistema para el flujo legal (CPC, etc.) siguen existiendo vía `pnpm --filter @tracker/db seed:workflows` y seeds legales. El motor v2 (Blueprint) se administra bajo **Configuración → Blueprints**.

## Modelo

- **Plantilla sistema**: `WorkflowDefinition` con `legal_process_code` + `applicable_law` (tabla `workflows`).
- **Etapas**: `WorkflowState` con `stage_order_index`, `deadline_type`, `deadline_days`, `deadline_calendar_type`, `deadline_law_ref`, `sinoe_keywords` (tabla `workflow_states`).
- **Instancia por expediente**: un `WorkflowItem` raíz con `kind = "Proceso"` (`LEGAL_PROCESS_ROOT_KIND`), `workflow` y `currentState` apuntando a la plantilla y etapa actual.
- **Plazos**: tabla `legal_deadline` (tenant-scoped).
- **Bitácora de avance**: `legal_process_stage_log`.

## API (`/api/legal/process`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/templates` | Plantillas sistema con `legalProcessCode` |
| POST | `/initialize` | Crea ítem raíz «Proceso» |
| POST | `/advance` | Avanza `currentState` validando `WorkflowTransition` |
| POST | `/deadlines/register-notification` | Plazo `FROM_NOTIFICATION` |
| GET | `/deadlines/upcoming` | Próximos vencimientos |
| GET | `/trackables/:id/timeline` | Etapas, plazos y logs |

## SINOE

Tras persistir una notificación nueva, el worker encola `sinoe-match`. La API ejecuta un **BullMQ Worker** (`SinoeMatchWorkerService`) que matchea `sumilla` con `sinoe_keywords` de la siguiente etapa y llama al servicio de avance.

Desactivar worker: `DISABLE_SINOE_MATCH_WORKER=true`.

## Migración y seed

- Migración: `Migration_37_LegalProcessFlow` (columnas en `workflows` / `workflow_states`, tablas `legal_deadline`, `legal_process_stage_log`).
- Seed Civil Ordinario: `pnpm db:seed` (incluido en `packages/db/src/seeds/run.ts`) o `pnpm --filter @tracker/db seed:legal-process`.

## Validación legal

Los plazos y keywords del seed son orientativos; revisión profesional obligatoria antes de producción.

## Evolución a v2 (Blueprint Engine)

Con el motor v2, el flujo estructurado pasa a **ProcessTrack** + **Blueprint** (Sistema / Tenant / Instancia), **StageInstance** y **ActivityInstance**; SINOE usa **SinoeProposal**; los plazos puntuales evolucionan a **ComputedDeadline** (`legalDate` + `effectiveDate`). Coexiste con el flujo v1 clásico (workflow items) según el expediente; no hay un flag de organización.

Ver [v2-blueprint-engine.md](v2-blueprint-engine.md) y ADRs en [docs/adrs/](adrs/).
