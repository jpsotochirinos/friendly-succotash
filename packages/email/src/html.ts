export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Split name into { name, email } for From header. */
export function parseFromHeader(from: string, defaultName?: string): { name?: string; email: string } {
  const m = from.match(/^(?:"?([^"]*)"?\s+)?<([^>]+)>$/);
  if (m) {
    return { name: m[1]?.trim() || defaultName, email: m[2]!.trim() };
  }
  return { name: defaultName, email: from.trim() };
}
