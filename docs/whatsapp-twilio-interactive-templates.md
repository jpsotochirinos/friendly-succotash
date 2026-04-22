# Twilio Content Templates — botones y listas nativas (WhatsApp)

El API envía variables nombradas desde [`twilio.provider.ts`](../apps/api/src/modules/whatsapp/providers/twilio.provider.ts) (`sendInteractiveButtons`, `sendInteractiveList`). Si `TWILIO_CONFIRM_CONTENT_SID` / `TWILIO_LIST_CONTENT_SID` están vacíos, el usuario ve texto numerado.

**Importante:** el Content Template Builder de la consola Twilio suele asignar variables numéricas (`{{1}}`, `{{2}}`, …), que **no coinciden** con lo que envía el backend. Usa el script de Content API de este documento para crear templates con los nombres correctos.

**Límite Twilio:** cada clave de variable tiene máximo **16 caracteres**. Por eso las descripciones de fila usan `item_N_desc` (no `item_N_description`).

## 1. Borrar templates viejos (manual)

Si creaste listas o quick reply en la UI con variables `{{13}}` / `{{14}}`, bórralos en [Content Template Builder](https://console.twilio.com/us1/develop/content-template-builder/overview) para evitar conflictos de nombre (`friendly_name` duplicado).

## 2. Crear templates vía Content API (recomendado)

Requisitos: Node **20+** (usa `fetch` y `node --env-file`).

Desde la raíz del monorepo (`friendly-succotash/`):

```bash
pnpm --filter @tracker/api wa:create-templates
```

Lee `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN` desde `../../.env` relativo a `apps/api`.

Opciones del script:

- `--dry-run` — imprime los JSON sin llamar a Twilio.
- `--no-approval` — no envía el Quick Reply a aprobación WhatsApp (solo crea el recurso).

Variables de entorno opcionales:

- `TWILIO_TEMPLATE_SUFFIX` — se añade a `friendly_name` (p. ej. `_v2`) si hay conflicto 409.

Al terminar, el script imprime algo como:

```
TWILIO_CONFIRM_CONTENT_SID=HX...
TWILIO_LIST_CONTENT_SID=HX...
```

Cópialo en `.env` y reinicia el API.

### Qué crea el script

**Quick Reply** (`alega_confirm_yes_no`):

- Cuerpo: `Alega — {{body}}`
- Títulos de botón **fijos** en plantilla: `Sí` / `No` (Meta no permite `{{…}}` en el texto del título al enviar a aprobación).
- Payloads dinámicos: `{{btn_1_id}}`, `{{btn_2_id}}` (p. ej. `confirm_yes` / `confirm_no`, como envía el asistente).
- Tras crear, intenta `POST .../ApprovalRequests/whatsapp` con categoría `UTILITY`.

**List Picker** (`alega_list_options`):

- Cuerpo: `Alega — {{body}}`
- Botón: `{{button}}`
- 10 ítems: `{{item_N_id}}`, `{{item_N_title}}`, `{{item_N_desc}}` (N = 1 … 10)

Según la documentación de Twilio, **list-picker no se puede enviar a aprobación WhatsApp**; solo aplica en conversación dentro de la ventana de 24 h iniciada por el usuario (coincide con el uso del asistente).

## 3. Variables en `.env`

```env
TWILIO_CONFIRM_CONTENT_SID=HX...
TWILIO_LIST_CONTENT_SID=HX...
```

Ver también `.env.example`.

## 4. Sandbox vs producción

- **Sandbox Twilio:** el destinatario debe haber enviado `join <código>`.
- **WABA productivo:** la aprobación del Quick Reply puede tardar; el list picker sigue siendo solo in-session.

## 5. Verificación

1. Confirmación de herramienta → botones nativos Sí / No (si el SID de confirmación está bien y el template aprobado cuando aplique).
2. Lista con varias opciones → list picker (dentro de sesión de 24 h).

## 6. Referencia rápida de variables (debe coincidir con el template)

| Uso | Claves enviadas en `contentVariables` |
|-----|----------------------------------------|
| Confirmación | `body`, `btn_1_id`, `btn_2_id` (el template usa títulos fijos Sí/No; el API puede enviar también `btn_*_title`, se ignoran) |
| Lista | `body`, `button`, y por cada fila `item_N_id`, `item_N_title`, `item_N_desc` |
