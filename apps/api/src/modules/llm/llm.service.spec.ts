import { describe, it, expect, vi, afterEach } from 'vitest';
import { sanitizeOpenAiCompatibilityMessages } from './llm.service';

describe('sanitizeOpenAiCompatibilityMessages', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dropea tool sin assistant previo con el mismo tool_call_id', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = sanitizeOpenAiCompatibilityMessages([
      { role: 'user', content: 'hola' },
      {
        role: 'tool',
        tool_call_id: 'x-1',
        name: 'search_x',
        content: '{}',
      },
    ] as unknown[]);
    const roles = (out as { role: string }[]).map((m) => m.role);
    expect(roles).toEqual(['user']);
    expect(err).toHaveBeenCalled();
  });

  it('dropea tool cuyo name queda vacío (sin pareja) tras el mapeo', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = sanitizeOpenAiCompatibilityMessages([
      { role: 'user', content: 'u' },
      {
        role: 'tool',
        tool_call_id: 'u1',
        // sin name: el mapper deja name ''
        content: 'result',
      },
    ] as unknown[]);
    expect((out as { role: string }[]).map((m) => m.role)).toEqual(['user']);
    expect(err).toHaveBeenCalled();
  });

  it('conserva asistente con tool y respuesta tool coherentes', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = sanitizeOpenAiCompatibilityMessages([
      { role: 'user', content: 'q' },
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'c1',
            type: 'function',
            function: { name: 'f', arguments: '{}' },
          },
        ],
      },
      {
        role: 'tool',
        tool_call_id: 'c1',
        name: 'f',
        content: '{"a":1}',
      },
    ] as unknown[]);
    expect((out as { role: string }[]).map((m) => m.role)).toEqual(['user', 'assistant', 'tool']);
    expect(err).not.toHaveBeenCalled();
  });
});
