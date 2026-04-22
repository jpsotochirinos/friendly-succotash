# Rollout: configurable workflows (Jira-style)

## 1. Deploy

1. Run DB migrations: `pnpm db:migrate` (includes `item_number`, and `Migration_26` drops `workflow_items.status` once applied)
2. Seed system workflow definitions: `pnpm --filter @tracker/db seed:workflows`
3. Backfill existing rows: `pnpm --filter @tracker/db migrate:data:workflows`
4. **Fase 2 — validate readiness:** `pnpm db:validate:workflow-readiness` (o `pnpm --filter @tracker/db validate:workflow-readiness`). En CI: workflow [`.github/workflows/workflow-readiness.yml`](../.github/workflows/workflow-readiness.yml) ejecuta `migrate` + `seed:workflows` y falla con **`--strict`** si alguna hoja carece de `workflow_id`/`current_state_id`.
5. (Optional) Re-seed legal templates: `pnpm --filter @tracker/db seed:templates`

## 2. Enable per organization

- **API**: `PATCH /organizations/me` with `{ "featureFlags": { "useConfigurableWorkflows": true } }`
- **UI**: Settings → General → checkbox “Actuar con flujos configurables…”

Enable first in **staging**, then pilot orgs, then everyone.

## 3. Operations

- **Definitions**: Settings → “Flujos (estados)” — list system workflows; duplicate to customize.
- **ECA rules**: Settings → “Reglas de flujo” — unchanged; transitions use the same state keys.
- **Structural templates**: Settings → “Plantillas de flujo” — leaf nodes can pick a workflow definition.

## 4. Future breaking cleanup

- Drop column `workflow_items.status` after all code reads `current_state_id` / `WorkflowState.key` only.
- Remove legacy branch in `WorkflowService.transitionWorkflowItem` and `WorkflowItemStateMachine` export.
