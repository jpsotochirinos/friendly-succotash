# Contrato API — cliente de escritorio (migración wizard)

El cliente de escritorio **`alega-desktop`** (Electron + Vue 3) usa el mismo API REST que la SPA, más endpoints dedicados al wizard bajo **`/api/migration/*`** y SSE para estatus en vivo.

## Autenticación

### JWT de usuario

- `Authorization: Bearer <accessToken>` en peticiones autenticadas.

### OAuth Google y deep-link desktop

1. Abrir en el navegador del sistema:  
   `GET /api/auth/google?state=desktop`
2. Tras el callback de Google, si `state=desktop`, el API redirige a:  
   `alega-desktop://auth/callback?token=<JWT>&refresh=<refreshToken>`  
   (tokens URL-encoded). El cliente Electron debe registrar el protocolo `alega-desktop` y guardar tokens (p. ej. `safeStorage`).
3. Flujo web sin `state=desktop` sigue redirigiendo a `${FRONTEND_URL}/auth/callback?token=...`.

### SSE y token

`GET /api/migration/batches/:id/events` está marcado como `@Public()` en JWT global pero valida acceso con **`MigrationSseAuthGuard`**:

- Header `Authorization: Bearer ...`, **o**
- Query `?access_token=<JWT>` (útil cuando `EventSource` no envía cabeceras).

Requiere permiso **`import:manage`**.

## Wizard — `/api/migration`

| Método | Ruta | Body (resumen) | Respuesta (resumen) |
|--------|------|----------------|---------------------|
| `POST` | `/api/migration/profile` | `{ batchId, folders: [{ relPath, fileCount?, bytes?, extensions?, dateRange?, topTerms?, sampleFilenames?, sampleSnippets? }] }` | Carpetas enriquecidas con `suggestedKind`, `confidence`, `risks`; `overall.dominantKinds` |
| `POST` | `/api/migration/suggest-groups` | `{ batchId, profile }` (`profile` suele ser la respuesta previa de `/profile` + metadatos) | `{ groups: [{ id, title, trackableKind, fileIds, confidence, rationale }] }` |
| `POST` | `/api/migration/chat` | `{ batchId, messages: [{role, content}], contextRef? }` | `{ reply, model? }` (proxy a `ai-service` `/chat`) |
| `POST` | `/api/migration/commit-plan` | `{ batchId, plan: { groups: [...], mappings? } }` | Crea borradores `Trackable`, guarda `config.migrationPlan`, pone lote en **`plan_ready`** |
| `GET` | `/api/migration/batches/:id/events` | SSE | Eventos JSON: `batch.status`, `item.classified`, `batch.ready`, `ping` |

Rate limit orientativo: `/api/migration/chat` (p. ej. 20/min).

### Eventos SSE (cuerpo `data`)

Publicados vía Redis (`alega:migration:<batchId>`) desde el worker de análisis:

- `type`: `batch.status` | `item.classified` | `batch.ready` | `ping`
- `batchId`, `at` (ISO), `payload` opcional (p. ej. `{ status, done, total, itemId }`).

## Lotes e importación (existente)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/import/batches` | Crea lote. `channel`: **`desktop`** (`ImportChannel.DESKTOP`). |
| `GET` | `/api/import/batches/:id` | Estado del lote. |

### Estado `plan_ready`

Tras `commit-plan`, el lote queda en **`ImportBatchStatus.PLAN_READY`** y **sigue aceptando** ingesta (ZIP, Drive, TUS, etc.) igual que `created` / `ingesting` donde aplique.

`config.migrationPlan` incluye `pathToTrackable` (`sourcePath` → UUID de `Trackable`). Al analizar, el worker usa ese mapa para **`mapFromMigrationPlan`** en lugar de agrupar solo por heurística.

## Subida TUS

Igual que antes: `POST|HEAD|PATCH` → `/api/import/tus`. En **Upload-Metadata**, `filename` en Base64 estándar de UTF-8 debe coincidir con las claves de `pathToTrackable` (ruta relativa acordada en el wizard).

Detalles TUS, `uploadToken`, agentes y CORS: secciones anteriores del contrato siguen vigentes.

## Asistente de migración (chat)

El chat del wizard usa **`POST /api/migration/chat`** en el API Nest, que delega en **`LlmService`** (Gemini / DeepSeek, API OpenAI-compatible). Variables de entorno en el servidor del API: `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `ASSISTANT_MODEL`, `ASSISTANT_LLM_TIMEOUT_MS`. Sin clave configurada, la respuesta es un mensaje stub indicando que falta el proveedor.

**`apps/ai-service`** (FastAPI) sigue disponible solo para embeddings stub (`/embed`, `/classify-embedding`) si se despliega clasificación híbrida con vectores remotos; no expone chat de migración.

## Documentación del cliente

Implementación: repo hermano **`alega-desktop`** (Electron + Vue 3 + PrimeVue). Arquitectura: [`desktop-agent-blueprint.md`](./desktop-agent-blueprint.md).
