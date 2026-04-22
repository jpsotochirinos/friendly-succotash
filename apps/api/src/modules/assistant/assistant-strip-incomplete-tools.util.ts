/**
 * Mensaje mínimo para saneo de historial (mismo shape que ChatMessage del asistente).
 */
export type StripIncompleteChatMessage = {
  role: string;
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type?: string;
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
  attachmentIds?: string[];
};

/**
 * Elimina únicamente bloques assistant+tool_calls sin todas las respuestas `tool` siguientes,
 * sin borrar mensajes posteriores (p. ej. un nuevo "Hola" tras un ui_* pendiente en web).
 *
 * Excepción: si ese bloque incompleto es el **final** del array (no hay mensaje de usuario
 * ni nada después), se conserva — p. ej. mutación en WhatsApp esperando Sí/No: hace falta el
 * `tool_call_id` en el historial para aplicar `confirmedToolCallIds`.
 */
export function stripIncompleteToolSuffix(
  messages: StripIncompleteChatMessage[],
): StripIncompleteChatMessage[] {
  const out: StripIncompleteChatMessage[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!;
    if (m.role === 'assistant' && m.tool_calls?.length) {
      const rawIds = m.tool_calls.map((tc) => tc.id);
      const ids = rawIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
      if (ids.length !== m.tool_calls.length) {
        let j = i + 1;
        while (j < messages.length && messages[j]?.role === 'tool') j++;
        i = j - 1;
        continue;
      }
      const needed = new Set(ids);
      const toolResponses: StripIncompleteChatMessage[] = [];
      let j = i + 1;
      while (j < messages.length && needed.size > 0) {
        const t = messages[j]!;
        if (t.role !== 'tool' || !t.tool_call_id || !needed.has(t.tool_call_id)) break;
        needed.delete(t.tool_call_id);
        toolResponses.push(t);
        j++;
      }
      if (needed.size > 0) {
        const trailingIncomplete = j === messages.length;
        if (trailingIncomplete) {
          out.push(m);
        }
        i = j - 1;
        continue;
      }
      out.push(m, ...toolResponses);
      i = j - 1;
      continue;
    }
    out.push(m);
  }
  return out;
}
