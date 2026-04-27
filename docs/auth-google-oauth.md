# Login con Google (OAuth 2.0)

El backend (NestJS + `passport-google-oauth20`) y el front (botón + `/auth/callback`) ya están implementados. Para activar el flujo hace falta un **OAuth 2.0 Client ID (Web application)** en Google Cloud y variables de entorno en `.env`.

## 1. Google Cloud Console

1. Abre [APIs y credenciales](https://console.cloud.google.com/apis/credentials) y elige o crea un proyecto (p. ej. *Alega*).
2. **Pantalla de consentimiento de OAuth**:
   - Tipo: **External** (pruebas con cuentas Google personales).
   - Nombre de la app, email de asistencia y contacto del desarrollador.
   - Scopes: con los que trae el consentimiento suelen bastar `openid`, `email`, `profile`.
   - En modo **Testing**, añade correos en **Test users** para quienes puedan iniciar sesión.
3. **Credenciales** → **Crear credenciales** → **ID de cliente de OAuth**:
   - Tipo de aplicación: **Aplicación web**.
   - **Orígenes JavaScript autorizados** (ejemplos en local):
     - `http://localhost:5173`
     - `http://localhost:3000`
   - **URIs de redireccionamiento autorizados** (debe coincidir **exactamente** con `GOOGLE_CALLBACK_URL` en tu `.env`):
     - Desarrollo: `http://localhost:3000/api/auth/google/callback`
     - Producción: `https://TU_DOMINIO/api/auth/google/callback`
4. Copia **ID de cliente** y **Secreto del cliente** al `.env` (nunca al repositorio).

## 2. Variables de entorno

En la raíz del monorepo (archivo [`.env`](../.env), plantilla [`.env.example`](../.env.example)):

```env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

- Si `GOOGLE_CLIENT_ID` está vacío, el `AuthModule` **no** registra `GoogleStrategy` y `GET /api/auth/google` fallará.
- Tras editar el `.env`, **reinicia** la API para cargar la estrategia.

## 3. Comprobar localmente

1. `pnpm verify:google-oauth` (o `bash scripts/verify-google-oauth-env.sh`) — comprueba que el `.env` tiene ID y secret; **fallará (exit 1) mientras sigan vacíos** (esperado hasta que añadas credenciales de Google).
2. `pnpm --filter @tracker/api dev` (u otro arranque que cargue el mismo `.env`).
3. Navegador: `http://localhost:5173/auth/login` → **Continuar con Google**.
4. Tras aceptar en Google, deberías volver a `/auth/callback?token=...` y luego al dashboard. En DevTools: `localStorage.accessToken` y cookie `refreshToken` (httpOnly).
5. (Opcional) Con la API levantada: `curl -sI "http://localhost:3000/api/auth/google"` → espera **302** y `location` hacia `accounts.google.com` (si el cliente OAuth está bien configurado).

## 4. Decisiones de producto (MVP)

| Tema | Decisión actual | Notas |
|------|-----------------|--------|
| (a) Vinculación por email | Se permite enlazar Google a una cuenta existente con el mismo email (`auth.service` `googleLogin`). | Para endurecer: exigir verificación explícita o flujo de “confirmar enlace” (no implementado en MVP). |
| (b) Organización al primer login | Usuario nuevo por Google recibe org propia (nombre tipo “{firstName}’s Organization”, rol Owner). | Cambiar si el onboarding debe ser solo por invitación. |
| (c) Botón en UI | Botón PrimeVue con icono, no el asset oficial de “Sign in with Google”. | Sustituir por el [branding de Google](https://developers.google.com/identity/branding-guidelines) si hace falta para publicación. |

## 5. Flujo técnico (resumen)

1. Navegador → `GET /api/auth/google` (proxy Vite en dev).
2. Google consent → `GET /api/auth/google/callback?code=...`.
3. API valida perfil, emite JWT + cookie de refresh, redirige a `FRONTEND_URL/auth/callback?token=...` (o `?error=google` si falla).
4. [AuthCallback.vue](../apps/web/src/views/auth/AuthCallback.vue) guarda el token y carga el usuario; si `error=google`, redirige al login con mensaje.

## 6. App de escritorio

Si el inicio pasa `state=desktop`, el callback redirige a `alega-desktop://auth/callback?token=...&refresh=...` ([auth.controller.ts](../apps/api/src/modules/auth/auth.controller.ts)).
