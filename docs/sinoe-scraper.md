# SINOE scraper (worker)

Scraping del Sistema de Notificaciones Electrónicas (PJ Perú) corre en **`@tracker/worker`** con **Playwright**, cola BullMQ `scraping` y credenciales cifradas en `user_sinoe_credentials`.

## Requisitos

- Docker: Postgres, Redis, MinIO (para anexos).
- **`SINOE_CREDENTIALS_KEY`** (32 bytes, hex 64 caracteres o base64) en el **mismo `.env` que usa el worker**. Debe ser **la misma clave** que el API usa para cifrar credenciales; si solo está en `.env` de la raíz y antes el worker no la veía, el proceso carga automáticamente `../../../.env` desde `apps/worker` al arrancar.
- `GEMINI_API_KEY` y/o `TWOCAPTCHA_API_KEY` para CAPTCHA (o cadena `manual` que solo guarda PNG y falla en headless hasta ajustar selectores).
- Variables opcionales: ver [`.env.example`](../.env.example) (`SINOE_*`, `SINOE_CAPTCHA_STRATEGY`, `SINOE_HEADLESS`, etc.).

## Flujo

1. Usuario configura credenciales: `PUT /integrations/sinoe/credentials`.
2. Manual o cron (`SINOE_SCRAPE_CRON`) encola jobs `scrape-sinoe-user`.
3. `SinoeScraper` abre Chromium, login + CAPTCHA (`apps/worker/src/scrapers/sinoe/captcha/`), entra a **Casillas Electrónicas** (tile en post-login), lee la tabla PrimeFaces `frmBusqueda:tblLista_data`, por fila abre **Ver anexos**, pulsa **Descargar todo** (`frmAnexos:btnDescargaTodo`), expande ZIP si aplica y asocia anexos a la notificación. Si ese flujo falla (UI distinta), se usa el modo legacy de enlaces + detalle (`pages/inbox.page.ts`, `notification-detail.page.ts`).
4. `SinoeCompositeRepository` persiste en `sinoe_notifications` / `sinoe_attachments`, sube anexos a MinIO como `documents`, y si existe un `Trackable` con el mismo `expedient_number`, crea un `WorkflowItem` tipo Diligencia.
5. **Bandeja de notificaciones**: por cada notificación SINOE nueva se crea un `NotificationEvent` de tipo `sinoe_notification` para el **usuario que tiene las credenciales SINOE**, con `data.assignmentStatus` (`linked` \| `needs_expediente` \| `needs_assignee`) y `dedupeKey` estable por org + `nro_notificacion`. No se duplica con `workflow_item_from_external`.

## Estados `assignment_status` (DB + `NotificationEvent.data`)

| Valor | Significado |
|-------|-------------|
| `linked` | Expediente encontrado en Alega, diligencia creada y el expediente tiene responsable asignado. |
| `needs_expediente` | No hay expediente con ese `expedient_number` — falta crear o vincular en Alega. |
| `needs_assignee` | Expediente encontrado y diligencia creada, pero el expediente **no** tiene asignado. |

Constantes en `@tracker/shared`: `SINOE_ASSIGNMENT_STATUS`, `NOTIFICATION_TYPES.SINOE_NOTIFICATION`.

## Desarrollo local

```bash
pnpm docker:up
pnpm db:migrate   # Migration_28 (tablas SINOE) + Migration_29 (assignment_status)
pnpm dev          # api + worker + web (el worker debe consumir la cola `scraping`)
```

Forzar un scrape para tu usuario:

- `POST /integrations/sinoe/credentials/trigger-scrape` (permiso `sinoe:manage`).

Depurar Playwright con navegador visible:

```bash
SINOE_HEADLESS=false pnpm --filter @tracker/worker dev
```

Ajustar selectores si el portal PJ cambia: `login.page.ts`, `casilla-inbox.page.ts` (casilla + modal anexos), `inbox.page.ts`, `notification-detail.page.ts`.

**Re-scrape y duplicados:** si la notificación ya existe en `sinoe_notifications`, se actualiza `rawData` y solo se añaden anexos cuyo **SHA-256** aún no está en `sinoe_attachments` para esa notificación (mismo archivo = misma huella, no se vuelve a subir a MinIO).

## Depurar aislado (sin API ni worker)

Para probar el mismo `SinoeScraper` que usa el worker **sin** Postgres, Redis, MinIO ni cola BullMQ:

1. En `friendly-succotash/.env` (solo local, **no commitear** valores): `SINOE_USERNAME`, `SINOE_PASSWORD`, y según tu estrategia `GEMINI_API_KEY` y/o `TWOCAPTCHA_API_KEY`. Opcional: `SINOE_BASE_URL`, `SINOE_CAPTCHA_STRATEGY`, etc. (ver [`.env.example`](../.env.example)).
2. Desde la raíz del monorepo:

```bash
pnpm --filter @tracker/worker sinoe:debug
```

El script [`apps/worker/src/scrapers/sinoe/scripts/run-sinoe.ts`](../apps/worker/src/scrapers/sinoe/scripts/run-sinoe.ts) fuerza `SINOE_DEBUG` y `SINOE_LOG_VERBOSE`, **`SINOE_HEADLESS=false`** para ver el navegador (ignora `SINOE_HEADLESS=true` del `.env` salvo que pongas **`SINOE_DEBUG_HEADLESS=true`**), y **`SINOE_SLOWMO_MS=150`** si no lo defines.

Al terminar imprime la lista de rutas bajo `outDir`. Si el login falla, igualmente tendrás **`step-*-login-failed.png`** (y el **trace** con capturas en la línea de tiempo).

**Salidas** (por defecto en `/tmp/sinoe-run-<timestamp>/` o en `SINOE_RUN_OUT_DIR`):

| Archivo | Contenido |
|---------|-----------|
| `trace.zip` | Traza Playwright (fuentes, snapshots). Desde la raíz del monorepo: `pnpm --filter @tracker/worker exec playwright show-trace <ruta>/trace.zip` (si `npx playwright` falla con *Permission denied*, usa este comando) |
| `result.json` | Resultado del scrape (sin buffers de anexos; solo metadatos y tamaños) |
| `step-*.png` | Capturas: `after-login`, `before-casilla-click`, `casilla-table` si entró a casilla; `casilla-nav-failed` si falló el tile; `after-casilla-table` / filas; legacy `after-inbox` / `detail-*`; `login-failed` si no pasó el login |
| `casilla-nav-diag.json` | Si falla la navegación a casilla: URL, lista de frames, `a.ui-commandlink` visibles, textos de `span.txtredbtn`, `hasPrimeFaces`. Úsalo para afinar selectores sin repetir la corrida a ciegas. |
| `timings.json` | Array de `{ label, startedAt, ms, meta? }` con duración por etapa (`scraper.init`, `login.attempt.*`, `casilla.nav.*`, `casilla.download.*`, `scrape.total`, etc.). Sirve para ver qué tramo domina el tiempo antes de optimizar. En `events.log` también hay líneas `[time] <label> ms=<n>`. |
| `events.log` | Líneas **`[SINOE]`** (`[info]` / `[warn]`) del scraper además de `console` del page y `pageerror` |

Si falla el flujo y `SINOE_PAUSE_ON_ERROR` no es `false`, se abre el **Playwright Inspector** antes de cerrar la página.

Iteración: ajusta selectores en `login.page.ts`, `casilla-inbox.page.ts`, `inbox.page.ts`, `notification-detail.page.ts` y vuelve a ejecutar `sinoe:debug` hasta que en logs veas `rowsParsed` / en `result.json` haya filas coherentes.

## Verificación manual

| Comprobación | Dónde |
|--------------|--------|
| Job encolado | Respuesta `POST .../trigger-scrape` → `{ jobId }`; Redis con cliente `redis-cli` / Bull Board si lo usáis. |
| Worker procesando | Logs del proceso `@tracker/worker` (`Scraping sinoe completed`). |
| Errores scrape | `user_sinoe_credentials.last_scrape_error` vía `GET /integrations/sinoe/credentials`. |
| Filas persistidas | Tabla `sinoe_notifications`, columna `assignment_status`. |
| **Notificaciones SPA** | `GET /api/notifications` (autenticado) o vista Notificaciones en la app; tipo `sinoe_notification`. |

## Troubleshooting

| Síntoma | Causa probable |
|---------|----------------|
| No aparece nada tras “Encolar” | Worker no arrancado o Redis inaccesible desde API/worker. |
| `last_scrape_error` con CAPTCHA | Falta `GEMINI_API_KEY` / `TWOCAPTCHA_API_KEY` o selectores PJ rotos. |
| `last_scrape_error` timeout | `SINOE_SCRAPE_TIMEOUT_MS` bajo o red lenta; subir timeout. |
| Bandeja vacía pese a scrape OK | Solo el usuario con credenciales SINOE recibe `sinoe_notification`; comprobar usuario logueado. |
| `Encryption key is not configured` / `Decryption key` | Falta `SINOE_CREDENTIALS_KEY` en el entorno del worker o no coincide con la del API. Añádela al `.env` de la raíz del repo y reinicia el worker. |
| `Encryption key is not configured` / `Decryption key` | Falta `SINOE_CREDENTIALS_KEY` en el entorno del worker o no coincide con la del API. Añádela al `.env` de la raíz del repo y reinicia el worker. |
| Sin filas en `sinoe_notifications` | Scrape no parseó la bandeja (selectores `inbox`/`detail`); revisar logs. |

## Próximos pasos (fuera del MVP)

- API: `PATCH` para vincular `sinoe_notifications` a un `trackable` y opcionalmente crear `WorkflowItem` si aún no existe.
- Web: CTA en inbox cuando `data.assignmentStatus === 'needs_expediente'` (“Asignar expediente”).

## Tests

```bash
pnpm --filter @tracker/worker test
```

## Logs de depuración (worker)

Todas las líneas van con prefijo **`[SINOE]`** (sin usuario ni contraseña).

| Variable | Efecto |
|----------|--------|
| (por defecto) | Login (intento, éxito con path), tras login URL, recuento de enlaces de bandeja, resumen final `rowsParsed` / `byStatus`. |
| `SINOE_DEBUG=true` o `SINOE_LOG_VERBOSE=1` | Conteos por cada selector de bandeja y path de cada detalle visitado. |
| 0 ítems con éxito | Tras el job, el worker emite una advertencia; revisa el log `inbox: 0 notification links` con **DOM snapshot** (`allAnchors`, `tableRows`, etc.) para ajustar selectores en `inbox.page.ts`. |

## Seguridad

- No registrar usuario, contraseña ni cookies en logs.
- Los errores de CAPTCHA se registran como mensaje genérico (`gemini: …`, `2captcha: …`, `manual: …`).
