# Reset local (piloto v2)

1. Bajar contenedores y volver a subir: `pnpm docker:reset` (o `pnpm docker:up` limpio).
2. Migrar: `pnpm db:migrate`.
3. Reseteo idempotente de datos de demo: `pnpm reset:pilot` (ver `scripts/reset-pilot.ts`).
4. Semillas opcionales: `pnpm db:seed`, `pnpm db:seed:system-blueprints`.
5. Levantar API + web + worker: `pnpm dev`.
6. **Cola `sinoe-match` (por defecto en worker):** no hace falta consumirla desde la API. Asegúrate de que el worker carga `apps/api/dist/sinoe-match-job.handler.js` (`pnpm --filter @tracker/api build` antes de `pnpm dev` al worker). Solo si necesitas el consumer legacy en el proceso API: `ENABLE_LEGACY_SINOE_CONSUMER=true`; con ambos activos, duplica el procesamiento. `DISABLE_SINOE_MATCH_WORKER=true` en la API apaga el consumer legacy aunque esté registrado.
