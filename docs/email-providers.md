# Proveedores de email (patrón Strategy)

El envío vive en el paquete [`packages/email`](../packages/email). La variable **`EMAIL_PROVIDER`** elige la implementación; el código de negocio (API, worker) no depende de Brevo/SendGrid en concreto.

## Variables

| Variable | Uso |
| -------- | --- |
| `EMAIL_PROVIDER` | `smtp` (defecto, p. ej. MailHog en dev), `brevo` (Sendinblue), `sendgrid` o `sendinblue` (alias de Brevo). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Relay SMTP; en dev suelen bastar `localhost:1025` sin auth. |
| `SMTP_FROM` / `EMAIL_FROM` | Remitente; `EMAIL_FROM` pisa a `SMTP_FROM` si ambos existen. |
| `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO` | Nombre y Reply-To (transaccional). |
| `BREVO_API_KEY` | Obligatorio si `EMAIL_PROVIDER` es `brevo` o `sendinblue`. |
| `SENDGRID_API_KEY` | Obligatorio si `EMAIL_PROVIDER` es `sendgrid`. |

Definidas en [packages/config/src/env.schema.ts](../packages/config/src/env.schema.ts) y [`.env.example`](../.env.example).

## Dónde se usa

- **API (Nest):** módulo global [apps/api/src/common/email/email.module.ts](../apps/api/src/common/email/email.module.ts) inyecta `IEmailProvider` bajo el token `EMAIL_MESSAGING` (export de `@tracker/email`). [EmailService](../apps/api/src/common/email/email.service.ts) delega notificaciones, magic link e invitaciones.
- **Worker:** [apps/worker/src/utils/mailer.ts](../apps/worker/src/utils/mailer.ts) crea el provider una vez (singleton lazy) a partir de `process.env`.

## Añadir un proveedor nuevo

1. Añade el id en [packages/email/src/types.ts](../packages/email/src/types.ts) (`EmailProviderId`) y, si aplica, un valor en `env.schema` (`EMAIL_PROVIDER`).
2. Crea [packages/email/src/providers/nuevo.provider.ts](../packages/email/src/providers/) que implemente `IEmailProvider`.
3. Registra el `case` en [packages/email/src/factory.ts](../packages/email/src/factory.ts) (`createEmailProvider`).
4. Documenta claves de entorno aquí y en `.env.example`.

No hace falta tocar `AuthService`, `InvitationsService` ni los workers salvo que cambies el contrato de `EmailService` o `EmailMessage`.
