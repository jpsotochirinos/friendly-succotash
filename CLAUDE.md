# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# First-time setup
pnpm setup                        # copies .env, installs deps, starts Docker

# Docker infrastructure (Postgres, Redis, MinIO, Mailpit, Gotenberg for DOCX→PDF)
pnpm docker:up
pnpm docker:down
pnpm docker:reset                 # wipe volumes and restart

# Development (all apps in parallel via Turborepo)
pnpm dev

# Build / lint / test all
pnpm build
pnpm lint
pnpm test
pnpm test:e2e

# Run tests for a single app
pnpm --filter @tracker/api test
pnpm --filter @tracker/web test

# Database
pnpm db:migrate                   # run pending migrations (includes dropping workflow_items.status after sync)
pnpm db:seed                      # seed basic data
pnpm --filter @tracker/db seed:workflows     # system workflow definitions (states/transitions)
pnpm --filter @tracker/db migrate:data:workflows  # backfill workflow_id/current_state_id
pnpm db:validate:workflow-readiness           # optional; use -- --strict in CI
pnpm --filter @tracker/db diagnose:workflows -- --org <uuid|email>  # debug configurable workflows per org
# (migrations also add workflow_items.item_number for Jira-style ticket keys)
pnpm --filter @tracker/db migrate:create   # scaffold new migration
pnpm --filter @tracker/db seed:legal-process  # Civil Ordinario CPC (workflow + estados; idempotente)
pnpm db:seed:system-blueprints                 # catálogo SYSTEM (~28 blueprints: DEMO, `freeform-estilo-libre`, familia, 2/materia, etc.); requisito del motor v2
pnpm --filter @tracker/api build && pnpm --filter @tracker/api backfill:process-tracks   # un solo paso: crea ProcessTrack estilo libre en trackables que no tengan (usa `-- --dry-run` o `-- --org <uuid>`; requiere build para compilar el script)
pnpm exec ts-node -T packages/db/src/seeds/migrate-workflow-items-to-activities.ts -- --dry-run  # idempotente: copia `workflow_items` → `ActivityInstance` (requisito: ProcessTrack; ver script)
```

## ActivityInstance vs WorkflowItem (lecturas de producto)

- **Calendario, dashboard, búsqueda de asistente (workflow_items)**: leen `activity_instances` (join `stage_instance` / `process_track` / `trackable`). `WorkflowItem` queda **solo histórico** hasta migrar datos; no borrar la tabla aún.
- **IDs de evento de calendario**: preferir prefijo `ai:`; `wi:` y UUID suelto siguen aceptados en `PATCH /calendar/events/:id/reschedule` durante la transición.
- **Vista Actividades (expediente)**: una sola vista de tablero por etapa (`ProcessStageBoardView`: hoja de ruta + kanban 3 columnas) (`apps/web/src/components/expediente-v2/`). Crear/editar actividades vía `POST/PATCH /process-tracks/:id/activities` (no `POST /workflow-items` cuando hay ProcessTrack).
```

## Legal process flow engine

Procedural templates (`legal_process_code`, deadlines, SINOE keywords) extend `WorkflowDefinition` / `WorkflowState`. Each matter with a legal flow has a root `WorkflowItem` with `kind: Proceso` and `currentState` for the active stage. See [docs/legal-process-flow.md](docs/legal-process-flow.md).

- API module: `apps/api/src/modules/legal/` (`LegalProcessModule`, routes under `/api/legal/process`).
- Worker queue: `sinoe-match` (enqueue from SINOE postgres repository). **Default:** consumer in `apps/worker` + `apps/api/dist/sinoe-match-job.handler.js` (build API first). API legacy inline consumer is **opt-in** (`ENABLE_LEGACY_SINOE_CONSUMER=true`); if enabled, set `DISABLE_SINOE_MATCH_WORKER=true` on the API to avoid double-processing with the worker.
- Migration: `Migration_37_LegalProcessFlow`.

## Architecture

**Monorepo** managed by pnpm workspaces + Turborepo.

```
apps/
  api/      NestJS REST + WebSocket server
  web/      Vue 3 SPA
  worker/   BullMQ background worker (standalone Node process)
packages/
  db/       MikroORM entities, migrations, seeds — shared by api & worker
  shared/   Enums, types, state-machine logic shared across all packages
  config/   Zod-validated env config
```

### Multi-tenancy

Every domain entity extends `TenantBaseEntity` (in `packages/db/src/entities/tenant-base.entity.ts`), which adds an `organization` FK and a MikroORM `@Filter` named `tenant`. The `TenantInterceptor` in `apps/api/src/common/interceptors/tenant.interceptor.ts` activates this filter per-request using `user.organizationId` from the JWT payload. **All queries are automatically scoped to the tenant**; no manual `WHERE organization_id =` needed.

### Auth

`apps/api/src/modules/auth/` uses Passport with:
- `JwtStrategy` / `JwtRefreshStrategy` — access + refresh token pair (15m / longer TTL)
- `GoogleStrategy` — optional, only registered if `GOOGLE_CLIENT_ID` is set (setup: [docs/auth-google-oauth.md](docs/auth-google-oauth.md))
- Magic-link email flow
- `JwtAuthGuard` + `PermissionsGuard` registered globally as `APP_GUARD`

### Core domain model

`Trackable` → represents a tracked process/case. Has a tree of `WorkflowItem`s (self-referencing parent/children) that define the steps. `WorkflowItem.itemType` ∈ `{SERVICE, TASK, ACTION}` and `actionType` drives what the step requires (document upload, approval, data entry, etc.).

**Blueprint engine (ProcessTrack):** `POST /api/process-tracks` with `{ trackableId, systemBlueprintId? }` — omit `systemBlueprintId` for free-style (uses seeded system blueprint `freeform-estilo-libre`). No per-org feature flag.

Enums and status state-machine live in `packages/shared/src/` and are imported by all apps.

### Background jobs (worker)

BullMQ queues (Redis-backed):
- `evaluation` — document evaluations/AI review
- `scraping` — Playwright scrapers for external data
- `docx-to-pdf` — converts DOCX to PDF via **Gotenberg** when `GOTENBERG_URL` is set (e.g. `http://localhost:3001` from Docker), else **LibreOffice** headless (`LIBREOFFICE_BIN` in `.env`)
- `signatures-finalize` — after last signer: registry page, QR, hash, TSA (stub), MinIO
- `signatures-expire` — scheduled (see `SIGNATURE_EXPIRE_CRON`) to expire stale requests

Worker connects directly to Postgres via MikroORM (same config as API). For DOCX→PDF, prefer **Gotenberg** (`pnpm docker:up`); only without `GOTENBERG_URL` must **LibreOffice** be installed on the worker host. Cron jobs: `apps/worker/src/schedules/cron.ts`.

**Signatures env (api/worker):** `APP_PUBLIC_URL`, `TSA_URL`, `SIGNATURE_OTP_*`, `SIGNATURE_EXTERNAL_TOKEN_EXPIRY_HOURS`, `GOTENBERG_URL`, `LIBREOFFICE_BIN`, `SIGNATURE_EXPIRE_CRON`.

### Web frontend

Vue 3 + Vite + PrimeVue + Tailwind. State via Pinia (single `auth.store.ts` currently). `vue-flow` used for the workflow canvas in `TrackableFlowView`. `superdoc` library used for rich document editing. API calls through `apps/web/src/api/`.

Router guard (`apps/web/src/router/index.ts`) redirects unauthenticated users to `/auth/login`. The document editor (`/documents/:id/edit`) lives outside `AppLayout`.

### Infrastructure services

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Primary DB |
| Redis | 6379 | BullMQ queues |
| MinIO | 9000 / 9001 | File storage (S3-compatible) |
| Mailpit | 8025 / 1025 | Dev email catch-all |
| Gotenberg | 3001 | DOCX→PDF (LibreOffice in container) |

### Package import pattern

`packages/db` and `packages/shared` export from `src/index.ts` (TypeScript source) at dev time; `dist/` used after build. When adding new entities, export them from `packages/db/src/entities/index.ts`.
