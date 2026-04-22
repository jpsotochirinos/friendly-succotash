import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { sanitizeAssistantHistory } from '../assistant/assistant-history-sanitize.util';

/** Aligned with @superdoc-dev/ai context limits; allows full document + instructions in one user message. */
export const DOCUMENT_AI_MAX_MESSAGES = 50;
export const DOCUMENT_AI_MAX_CONTENT_PER_MESSAGE = 120_000;
export const DOCUMENT_AI_MAX_TOTAL_CONTENT = 450_000;
const DOCUMENT_AI_ALLOWED_ROLES = new Set(['system', 'user', 'assistant', 'tool']);

export type SanitizedChatMessage = { role: string; content: string };

/**
 * Validates OpenAI-style messages for POST /documents/ai/complete.
 * Rejects oversized payloads and non-string content (injection surface / provider quirks).
 * Intent routing may be added server-side later without changing this contract.
 * (Separate POST .../ai/intent or @superdoc-dev/ai AIPlanner are optional product extensions.)
 */
export function sanitizeDocumentAiMessages(messages: unknown):
  | { ok: true; messages: SanitizedChatMessage[] }
  | { ok: false; error: string } {
  if (!Array.isArray(messages)) {
    return { ok: false, error: 'messages must be a non-empty array' };
  }
  if (messages.length === 0 || messages.length > DOCUMENT_AI_MAX_MESSAGES) {
    return {
      ok: false,
      error: `messages must have 1–${DOCUMENT_AI_MAX_MESSAGES} entries`,
    };
  }

  const out: SanitizedChatMessage[] = [];
  let totalLen = 0;

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (!m || typeof m !== 'object') {
      return { ok: false, error: `messages[${i}] must be an object` };
    }
    const role = (m as { role?: unknown }).role;
    if (typeof role !== 'string' || !DOCUMENT_AI_ALLOWED_ROLES.has(role)) {
      return { ok: false, error: `messages[${i}].role is not allowed` };
    }
    const content = (m as { content?: unknown }).content;
    if (typeof content !== 'string') {
      return { ok: false, error: `messages[${i}].content must be a string` };
    }
    if (content.length > DOCUMENT_AI_MAX_CONTENT_PER_MESSAGE) {
      return {
        ok: false,
        error: `messages[${i}] exceeds maximum content length`,
      };
    }
    totalLen += content.length;
    if (totalLen > DOCUMENT_AI_MAX_TOTAL_CONTENT) {
      return { ok: false, error: 'messages total content exceeds limit' };
    }
    out.push({ role, content });
  }

  return { ok: true, messages: out };
}

function clampAiCompleteOptions(options: Record<string, unknown>): {
  temperature: number;
  maxTokens: number;
} {
  const rawT = options.temperature;
  const rawM = options.maxTokens ?? options.max_tokens;
  let temperature = typeof rawT === 'number' && Number.isFinite(rawT) ? rawT : 0.7;
  temperature = Math.min(2, Math.max(0, temperature));
  let maxTokens = typeof rawM === 'number' && Number.isFinite(rawM) ? rawM : 2000;
  maxTokens = Math.min(8192, Math.max(1, Math.floor(maxTokens)));
  return { temperature, maxTokens };
}

export interface LlmChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Override default ASSISTANT_LLM_TIMEOUT_MS for this call. */
  timeoutMs?: number;
}

export interface LlmChatBody {
  messages: unknown[];
  stream?: boolean;
  tools?: unknown[];
  tool_choice?: unknown;
  options?: LlmChatOptions;
}

/**
 * Gemini's OpenAI-compat endpoint is strict: no `null` string fields, no extra keys like `attachmentIds`,
 * and each tool_call.function.arguments must be a JSON string (not an object after DB round-trip).
 */
export function sanitizeOpenAiCompatibilityMessages(messages: unknown): unknown[] {
  if (!Array.isArray(messages)) return [];
  const mapped = messages.map((raw, msgIdx) => {
    if (!raw || typeof raw !== 'object') {
      return { role: 'user', content: '' };
    }
    const m = raw as Record<string, unknown>;
    const role = m.role;
    if (role !== 'system' && role !== 'user' && role !== 'assistant' && role !== 'tool') {
      return { role: 'user', content: typeof m.content === 'string' ? m.content : '' };
    }

    const toContentString = (c: unknown): string => {
      if (c == null) return '';
      if (typeof c === 'string') return c;
      if (typeof c === 'number' || typeof c === 'boolean') return String(c);
      try {
        return JSON.stringify(c);
      } catch {
        return '';
      }
    };

    const content = toContentString(m.content);

    if (role === 'system' || role === 'user') {
      return { role, content };
    }

    if (role === 'assistant') {
      const tcs = m.tool_calls;
      if (Array.isArray(tcs) && tcs.length > 0) {
        const tool_calls = tcs.map((tc: unknown, i: number) => {
          const t = (tc && typeof tc === 'object' ? tc : {}) as Record<string, unknown>;
          const fn = (t.function && typeof t.function === 'object' ? t.function : {}) as Record<
            string,
            unknown
          >;
          const name = fn.name != null && String(fn.name).trim() !== '' ? String(fn.name) : 'unknown';
          let args = fn.arguments;
          if (args == null) args = '{}';
          else if (typeof args !== 'string') args = JSON.stringify(args);
          else if ((args as string).trim() === '') args = '{}';
          const id = t.id != null ? String(t.id) : `call_${msgIdx}_${i}`;
          return {
            id,
            type: 'function' as const,
            function: { name, arguments: args as string },
          };
        });
        return {
          role: 'assistant',
          content,
          tool_calls,
        };
      }
      return { role: 'assistant', content };
    }

    if (role === 'tool') {
      const toolName = m.name != null && String(m.name).trim() !== '' ? String(m.name) : '';
      return {
        role: 'tool',
        tool_call_id: m.tool_call_id != null ? String(m.tool_call_id) : '',
        name: toolName,
        content,
      };
    }

    return { role: 'user', content };
  });
  const sanitized = sanitizeAssistantHistory(
    mapped as {
      role: string;
      content?: string | null;
      tool_calls?: Array<{
        id: string;
        type?: string;
        function: { name: string; arguments: string };
      }>;
      tool_call_id?: string;
      name?: string;
    }[],
  );
  if (JSON.stringify(mapped) !== JSON.stringify(sanitized)) {
    const preview = (a: unknown) =>
      JSON.stringify(a, null, 0).length > 8000
        ? `${JSON.stringify(a).slice(0, 8000)}…(truncated)`
        : JSON.stringify(a);
    console.error('[llm] sanitizeOpenAiCompat repaired orphan or invalid tool history', {
      beforeLen: mapped.length,
      afterLen: sanitized.length,
      beforeSnapshot: preview(mapped),
      afterSnapshot: preview(sanitized),
    });
  }
  return sanitized;
}

@Injectable()
export class LlmService {
  constructor(private readonly config: ConfigService) {}

  private getChatTimeoutMs(options: LlmChatOptions): number {
    if (options.timeoutMs != null && Number.isFinite(options.timeoutMs) && options.timeoutMs > 0) {
      return Math.min(options.timeoutMs, 300_000);
    }
    const n = Number(this.config.get('ASSISTANT_LLM_TIMEOUT_MS'));
    return Number.isFinite(n) && n > 0 ? Math.min(n, 300_000) : 90_000;
  }

  private getProviders(options: LlmChatOptions = {}) {
    const model =
      options.model ||
      this.config.get<string>('ASSISTANT_MODEL') ||
      'gemini-2.5-flash';
    return [
      {
        url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        apiKey: process.env.GEMINI_API_KEY,
        model,
      },
      {
        url: 'https://api.deepseek.com/v1/chat/completions',
        apiKey: process.env.DEEPSEEK_API_KEY,
        model: 'deepseek-chat',
      },
    ].filter((p) => p.apiKey);
  }

  /**
   * OpenAI-compatible chat completion (non-streaming). Used by the assistant agent loop.
   */
  async chatCompletionJson(body: LlmChatBody): Promise<Record<string, unknown>> {
    const { messages, tools, tool_choice, options = {} } = body;
    const stream = false;
    const providers = this.getProviders(options);
    const timeoutMs = this.getChatTimeoutMs(options);

    for (const provider of providers) {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const payload: Record<string, unknown> = {
          model: provider.model,
          messages: sanitizeOpenAiCompatibilityMessages(messages),
          stream,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
        };
        if (tools?.length) {
          payload.tools = tools;
        }
        if (tool_choice !== undefined) {
          payload.tool_choice = tool_choice;
        }

        const t0 = Date.now();
        const response = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[AI] ${provider.url} failed ${response.status}: ${errText}`);
          throw new Error(`${provider.url} returned ${response.status}`);
        }

        const data = (await response.json()) as Record<string, unknown>;
        console.log(`[AI] ${provider.model} chatCompletionJson ok in ${Date.now() - t0}ms`);
        return data;
      } catch (err) {
        const msg =
          (err as Error).name === 'AbortError' ? `timeout after ${timeoutMs}ms` : (err as Error).message;
        console.error(`[AI] provider ${provider.url} error:`, msg);
      } finally {
        clearTimeout(tid);
      }
    }

    throw new ServiceUnavailableException('No AI providers configured or available');
  }

  /**
   * Same behaviour as legacy DocumentsService.aiComplete — streams or returns JSON to Express res.
   */
  async aiComplete(
    body: { messages: unknown[]; stream?: boolean; options?: Record<string, unknown> },
    res: Response,
  ): Promise<void> {
    const { stream = false, options = {} } = body;
    const sanitized = sanitizeDocumentAiMessages(body.messages);
    if (!sanitized.ok) {
      res.status(400).json({ error: sanitized.error });
      return;
    }
    const messages = sanitized.messages;
    const clamped = clampAiCompleteOptions(options);
    const opts: LlmChatOptions = {
      model: options.model as string | undefined,
      temperature: clamped.temperature,
      maxTokens: clamped.maxTokens,
    };
    const providers = this.getProviders(opts);

    for (const provider of providers) {
      try {
        const response = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            model: provider.model,
            messages,
            stream,
            temperature: clamped.temperature,
            max_tokens: clamped.maxTokens,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[AI] ${provider.url} failed ${response.status}: ${errText}`);
          throw new Error(`${provider.url} returned ${response.status}`);
        }

        if (stream) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          const reader = (response.body as any).getReader();
          const decoder = new TextDecoder();
          let done = false;
          while (!done) {
            const { value, done: d } = await reader.read();
            done = d;
            if (value) res.write(decoder.decode(value, { stream: true }));
          }
          res.end();
          return;
        }

        const data = (await response.json()) as any;
        if (data.choices?.[0]?.message?.content) {
          data.choices[0].message.content = stripMarkdownCodeBlock(data.choices[0].message.content);
        }
        res.json(data);
        return;
      } catch (err) {
        console.error(`[AI] provider ${provider.url} error:`, (err as Error).message);
      }
    }

    console.error('[AI] All providers failed or unconfigured');
    res.status(503).json({ error: 'No AI providers configured or available' });
  }
}

export function stripMarkdownCodeBlock(content: string): string {
  return content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}
