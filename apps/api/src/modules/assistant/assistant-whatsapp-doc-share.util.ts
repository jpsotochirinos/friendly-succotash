/**
 * Detecta si un evento SSE `tool_result` de search_documents tiene un único match total
 * (data.length === 1 y total === 1) para adjuntar el archivo por WhatsApp.
 */
export function singleDocumentIdFromSearchToolResult(obj: Record<string, unknown>): string | null {
  if (obj.type !== 'tool_result' || obj.name !== 'search_documents' || obj.ok !== true) {
    return null;
  }
  const result = obj.result as { data?: Array<{ id?: unknown }>; total?: unknown } | undefined;
  const data = result?.data;
  const total = result?.total;
  if (!Array.isArray(data) || data.length !== 1) return null;
  if (typeof total === 'number' && total !== 1) return null;
  if (typeof total === 'string' && total !== '1') return null;
  if (total == null) return null;
  const id = data[0]?.id;
  return typeof id === 'string' ? id : null;
}

/** Base pública de la API (misma lógica que Twilio webhook / media URL). */
export function publicApiBase(config: { get: (k: string) => string | undefined }): string {
  const explicit =
    config.get('TWILIO_WEBHOOK_BASE_URL')?.trim() || config.get('APP_URL_NGROK')?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  return (config.get('APP_URL') || 'http://localhost:3000').trim().replace(/\/$/, '');
}
