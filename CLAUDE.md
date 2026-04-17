# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# First-time setup
pnpm setup                        # copies .env, installs deps, starts Docker

# Docker infrastructure (Postgres, Redis, MinIO, Mailpit)
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
pnpm db:migrate                   # run pending migrations
pnpm db:seed                      # seed basic data
pnpm --filter @tracker/db migrate:create   # scaffold new migration
```

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
- `GoogleStrategy` — optional, only registered if `GOOGLE_CLIENT_ID` is set
- Magic-link email flow
- `JwtAuthGuard` + `PermissionsGuard` registered globally as `APP_GUARD`

### Core domain model

`Trackable` → represents a tracked process/case. Has a tree of `WorkflowItem`s (self-referencing parent/children) that define the steps. `WorkflowItem.itemType` ∈ `{SERVICE, TASK, ACTION}` and `actionType` drives what the step requires (document upload, approval, data entry, etc.).

Enums and status state-machine live in `packages/shared/src/` and are imported by all apps.

### Background jobs (worker)

Two BullMQ queues (Redis-backed):
- `evaluation` — processes document evaluations/AI review
- `scraping` — runs Playwright scrapers for external data

Worker connects directly to Postgres via MikroORM (same config as API). Cron jobs defined in `apps/worker/src/schedules/cron.ts`.

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

### Package import pattern

`packages/db` and `packages/shared` export from `src/index.ts` (TypeScript source) at dev time; `dist/` used after build. When adding new entities, export them from `packages/db/src/entities/index.ts`.
