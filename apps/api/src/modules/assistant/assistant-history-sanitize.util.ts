import { stripIncompleteToolSuffix } from './assistant-strip-incomplete-tools.util';

/**
 * Mensaje mínimo de historial (compatible con ChatMessage del asistente y transcript API).
 */
export type AssistantHistoryMessage = {
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
 * Gemini (OpenAI-compat) requiere `name` no vacío en cada tool result; el historial
 * o clientes viejos pueden omitirlo. DeepSeek espera `tool` emparejado a `tool_calls` previos.
 */
export function ensureToolNames(messages: AssistantHistoryMessage[]): AssistantHistoryMessage[] {
  return messages.map((m, i) => {
    if (m.role !== 'tool' || (m.name && String(m.name).length > 0)) return m;
    const id = m.tool_call_id;
    if (!id) return m;
    for (let j = i - 1; j >= 0; j--) {
      const prev = messages[j];
      if (prev?.role === 'assistant' && prev.tool_calls?.length) {
        const tc = prev.tool_calls.find((t) => t.id === id);
        if (tc?.function?.name) {
          return { ...m, name: tc.function.name };
        }
      }
    }
    return m;
  });
}

/** Elimina filas `tool` huérfanas o que siguen sin nombre (legacy / DB corrupta). */
export function dropOrRepairInvalidToolMessages(
  messages: AssistantHistoryMessage[],
): AssistantHistoryMessage[] {
  const out: AssistantHistoryMessage[] = [];
  for (const m of messages) {
    if (m.role !== 'tool') {
      out.push(m);
      continue;
    }
    const id = m.tool_call_id;
    const nameOk = Boolean(m.name && String(m.name).length > 0);
    let matchedAssistant = false;
    if (id) {
      for (let i = out.length - 1; i >= 0; i--) {
        const prev = out[i];
        if (prev?.role === 'assistant' && prev.tool_calls?.length) {
          if (prev.tool_calls.some((t) => t.id === id)) {
            matchedAssistant = true;
            break;
          }
        }
      }
    }
    if (!id || !nameOk || !matchedAssistant) {
      console.warn(
        '[assistant] dropping invalid tool message:',
        !id ? 'missing tool_call_id' : '',
        !nameOk ? 'missing name' : '',
        !matchedAssistant ? 'no preceding assistant tool_calls' : '',
        id ? `(id=${id})` : '',
      );
      continue;
    }
    out.push(m);
  }
  return out;
}

/**
 * Aplica ensure → drop → strip en bucle hasta punto fijo (máx. 5), para que un drop
 * no deje un `assistant+tool_calls` sin respuesta en el medio.
 */
export function sanitizeAssistantHistory<T extends AssistantHistoryMessage>(messages: T[]): T[] {
  let cur = messages as T[];
  for (let iter = 0; iter < 5; iter++) {
    const pass1 = ensureToolNames(cur) as T[];
    const pass2 = dropOrRepairInvalidToolMessages(pass1) as T[];
    const next = stripIncompleteToolSuffix(pass2) as T[];
    const same =
      next.length === cur.length &&
      next.every(
        (m, idx) => JSON.stringify(m) === JSON.stringify((cur as T[])[idx]),
      );
    if (same) return next;
    cur = next;
  }
  return cur;
}

/** True si el transcript cambió al sane (p. ej. persistir en DB un snapshot reparado). */
export function assistantTranscriptChanged(
  before: AssistantHistoryMessage[],
  after: AssistantHistoryMessage[],
): boolean {
  return JSON.stringify(before) !== JSON.stringify(after);
}
