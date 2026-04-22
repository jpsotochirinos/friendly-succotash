import { describe, it, expect } from 'vitest';
import {
  sanitizeAssistantHistory,
  type AssistantHistoryMessage,
} from './assistant-history-sanitize.util';

const tc = (id: string, name: string) => ({
  id,
  type: 'function' as const,
  function: { name, arguments: '{}' },
});

function tool(id: string, name: string, content = '{}'): AssistantHistoryMessage {
  return { role: 'tool', tool_call_id: id, name, content };
}

describe('assistant-history-sanitize.util', () => {
  it('deja la secuencia válida (assistant con tool_call + tool) sin cambios estructurales', () => {
    const a: AssistantHistoryMessage[] = [
      { role: 'user', content: 'hola' },
      {
        role: 'assistant',
        content: null,
        tool_calls: [tc('call-1', 'search_organization_users')],
      },
      tool('call-1', 'search_organization_users', '{"ok":true}'),
    ];
    const out = sanitizeAssistantHistory(a);
    expect(out.length).toBe(a.length);
    expect(out[2]?.name).toBe('search_organization_users');
  });

  it('dropea tool con name vacío y sin assistant previo', () => {
    const a: AssistantHistoryMessage[] = [
      { role: 'user', content: 'x' },
      { role: 'tool', tool_call_id: 'orphan-1', name: '', content: '{}' },
    ];
    const out = sanitizeAssistantHistory(a);
    expect(out).toEqual([{ role: 'user', content: 'x' }]);
  });

  it('dropea assistant+tool_calls en el medio sin respuestas tool; conserva lo posterior', () => {
    const a: AssistantHistoryMessage[] = [
      { role: 'user', content: 'a' },
      {
        role: 'assistant',
        content: null,
        tool_calls: [tc('m1', 'search_organization_users')],
      },
      { role: 'user', content: 'b' },
    ];
    const out = sanitizeAssistantHistory(a);
    expect(out.map((m) => m.role)).toEqual(['user', 'user']);
    expect((out[1] as { content?: string }).content).toBe('b');
  });

  it('dropea orfandad doble: tool huérfano luego assistant huérfano con tool_calls', () => {
    const a: AssistantHistoryMessage[] = [
      { role: 'user', content: 'u' },
      { role: 'tool', tool_call_id: 't-orphan', name: 'foo', content: '{}' },
      {
        role: 'assistant',
        content: null,
        tool_calls: [tc('a2', 'search_organization_users')],
      },
      { role: 'user', content: 'v' },
    ];
    const out = sanitizeAssistantHistory(a);
    expect(out.find((m) => m.role === 'tool')).toBeUndefined();
    expect((out[0] as { content?: string }).content).toBe('u');
    expect((out[out.length - 1] as { content?: string }).content).toBe('v');
  });
});
