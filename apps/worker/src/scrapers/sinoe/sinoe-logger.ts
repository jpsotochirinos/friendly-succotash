/** Sin credenciales ni tokens en logs. */

import { appendFileSync, writeFileSync } from 'fs';

const PREFIX = '[SINOE]';

export interface SinoeTimingEntry {
  label: string;
  startedAt: string;
  ms: number;
  meta?: Record<string, unknown>;
}

/** Ruta a `timings.json` cuando hay `debugOpts.outDir` (misma corrida que events.log). */
let sinoeTimingsPath: string | null = null;
const timingEntries: SinoeTimingEntry[] = [];

/** Ruta a `events.log` cuando el scraper corre con `debugOpts.outDir`. */
let debugEventsLogPath: string | null = null;

export function setSinoeDebugEventsLogPath(path: string | null): void {
  debugEventsLogPath = path;
}

export function setSinoeTimingsPath(path: string | null): void {
  if (path === null) {
    sinoeTimingsPath = null;
    timingEntries.length = 0;
    return;
  }
  sinoeTimingsPath = path;
  timingEntries.length = 0;
}

function roundMs(ms: number): number {
  return Math.round(ms * 100) / 100;
}

function appendTimingLogLine(label: string, ms: number, meta?: Record<string, unknown>): void {
  const payload = meta && Object.keys(meta).length ? JSON.stringify(meta) : '';
  const line = `[time] ${label} ms=${roundMs(ms)}${payload ? ` ${payload}` : ''}`;
  console.log(PREFIX, line);
  appendToEventsLog(line);
}

/** Escribe el buffer acumulado y lo vacía (no anula `sinoeTimingsPath`; usar `setSinoeTimingsPath(null)` en cleanup). */
export function flushSinoeTimings(): void {
  if (!sinoeTimingsPath) {
    timingEntries.length = 0;
    return;
  }
  if (timingEntries.length === 0) {
    return;
  }
  try {
    writeFileSync(sinoeTimingsPath, JSON.stringify(timingEntries, null, 2), 'utf8');
  } catch {
    /* ignore */
  }
  timingEntries.length = 0;
}

/**
 * Mide `fn` y, si hay `setSinoeTimingsPath`, añade entrada a `timings.json` y línea `[time]` a consola/events.log.
 * Sin path configurado, solo ejecuta `fn` (sin overhead relevante).
 */
export async function sinoeTime<T>(
  label: string,
  fn: () => Promise<T>,
  metaOrMetaFn?: Record<string, unknown> | ((result: T) => Record<string, unknown> | undefined),
): Promise<T> {
  if (!sinoeTimingsPath) {
    return fn();
  }
  const startedAt = new Date().toISOString();
  const t0 = performance.now();
  try {
    const result = await fn();
    const ms = performance.now() - t0;
    const meta =
      typeof metaOrMetaFn === 'function' ? metaOrMetaFn(result) : metaOrMetaFn;
    const entry: SinoeTimingEntry = { label, startedAt, ms: roundMs(ms) };
    if (meta && Object.keys(meta).length) {
      entry.meta = meta;
    }
    timingEntries.push(entry);
    appendTimingLogLine(label, ms, meta);
    return result;
  } catch (e) {
    const ms = performance.now() - t0;
    const errMeta: Record<string, unknown> = {
      error: e instanceof Error ? e.message : String(e),
    };
    if (typeof metaOrMetaFn === 'object' && metaOrMetaFn != null) {
      Object.assign(errMeta, metaOrMetaFn);
    }
    const entry: SinoeTimingEntry = { label, startedAt, ms: roundMs(ms), meta: errMeta };
    timingEntries.push(entry);
    appendTimingLogLine(label, ms, errMeta);
    throw e;
  }
}

function appendToEventsLog(line: string): void {
  if (!debugEventsLogPath) return;
  try {
    appendFileSync(debugEventsLogPath, `${new Date().toISOString()} ${line}\n`);
  } catch {
    /* ignore */
  }
}

export function safeUrlForLog(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return '(invalid-url)';
  }
}

export function sinoeLogInfo(message: string, meta?: Record<string, unknown>): void {
  if (meta && Object.keys(meta).length) {
    const body = JSON.stringify(meta);
    console.log(PREFIX, message, body);
    appendToEventsLog(`[info] ${message} ${body}`);
  } else {
    console.log(PREFIX, message);
    appendToEventsLog(`[info] ${message}`);
  }
}

export function sinoeLogWarn(message: string, meta?: Record<string, unknown>): void {
  const body = meta && Object.keys(meta).length ? JSON.stringify(meta) : '';
  console.warn(PREFIX, message, body);
  appendToEventsLog(`[warn] ${message}${body ? ` ${body}` : ''}`);
}

/** `SINOE_DEBUG=true` o `SINOE_LOG_VERBOSE=1` activa logs por fila / selectores extra. */
export function isSinoeVerboseLog(): boolean {
  return process.env.SINOE_DEBUG === 'true' || process.env.SINOE_LOG_VERBOSE === '1';
}
