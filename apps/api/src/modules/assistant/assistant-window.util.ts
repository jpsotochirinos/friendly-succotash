/** Mensaje mínimo para ventana deslizante (compatible con ChatMessage del asistente). */
export type WindowChatMessage = {
  role: string;
  content?: string | null;
  tool_calls?: unknown;
  tool_call_id?: string;
  name?: string;
  attachmentIds?: string[];
};

/**
 * Limita cuántos mensajes (sin contar system) se envían al LLM.
 * Evita cortar en un bloque huérfano `tool` o `assistant` con tool_calls sin respuestas.
 */
export function applySlidingWindow<T extends WindowChatMessage>(messages: T[], maxNonSystem: number): T[] {
  if (!Number.isFinite(maxNonSystem) || maxNonSystem <= 0) return messages;
  const sys = messages[0]?.role === 'system' ? [messages[0]!] : [];
  const rest = sys.length ? messages.slice(1) : messages.slice();
  if (rest.length <= maxNonSystem) return messages;
  let head = rest.length - maxNonSystem;
  /** Evita empezar el payload con `tool` cuyo assistant quedó fuera de la ventana. */
  while (head < rest.length && rest[head]?.role === 'tool') head++;
  return [...sys, ...rest.slice(head)] as T[];
}
