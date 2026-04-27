#!/usr/bin/env bash
# Comprueba que .env tenga credenciales OAuth de Google (sin `source` del .env completo: evita fallos con cron u otros valores con *).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE} (run pnpm setup or copy .env.example)" >&2
  exit 1
fi

get_env_value() {
  local key="$1"
  local line
  line=$(grep -E "^[[:space:]]*${key}=" "${ENV_FILE}" 2>/dev/null | head -1) || true
  if [[ -z "$line" ]]; then
    echo ""
    return
  fi
  line="${line#*${key}=}"
  line="${line%$'\r'}"
  printf '%s' "$line"
}

GOOGLE_CLIENT_ID=$(get_env_value GOOGLE_CLIENT_ID)
GOOGLE_CLIENT_SECRET=$(get_env_value GOOGLE_CLIENT_SECRET)
GOOGLE_CALLBACK_URL=$(get_env_value GOOGLE_CALLBACK_URL)
FRONTEND_URL=$(get_env_value FRONTEND_URL)

missing=0
if [[ -z "${GOOGLE_CLIENT_ID}" ]]; then
  echo "GOOGLE_CLIENT_ID is empty" >&2
  missing=1
fi
if [[ -z "${GOOGLE_CLIENT_SECRET}" ]]; then
  echo "GOOGLE_CLIENT_SECRET is empty" >&2
  missing=1
fi
if [[ "$missing" -ne 0 ]]; then
  echo "Fill GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (see docs/auth-google-oauth.md), then restart the API." >&2
  exit 1
fi
echo "Google OAuth env OK."
echo "  GOOGLE_CALLBACK_URL=${GOOGLE_CALLBACK_URL:-}"
echo "  FRONTEND_URL=${FRONTEND_URL:-}"
echo "  Redirect URI in Google Cloud Console must match GOOGLE_CALLBACK_URL exactly."

exit 0
