/**
 * hashAvatarColor — color de avatar determinista por nombre de usuario.
 * El mismo nombre siempre produce el mismo color. Extraído de TrackablesCockpitSandbox.
 */
export function hashAvatarColor(name: string): string {
  const palette = [
    '#3b5bdb', // indigo
    '#0ca678', // teal
    '#e67700', // orange
    '#862e9c', // purple
    '#1971c2', // blue
    '#c92a2a', // red
    '#2f9e44', // green
    '#5f3dc4', // violet
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return palette[hash % palette.length];
}

/**
 * avatarInitials — hasta dos letras/números a partir del nombre visible.
 * Ignora correo entre paréntesis, tramo "nombre <correo>", correo suelto (parte local)
 * y solo usa caracteres alfanuméricos (incl. letras acentuadas latinas comunes).
 */
export function avatarInitials(raw: string): string {
  let s = String(raw ?? '').trim();
  if (!s) return '?';

  // Quitar bloques entre paréntesis (p. ej. "Nombre (correo@x.com)")
  s = s.replace(/\s*\([^)]*\)\s*/g, ' ').trim();

  // "Nombre <correo@x.com>" → solo nombre
  const lt = s.indexOf('<');
  if (lt > 0) s = s.slice(0, lt).trim();

  // Correo sin nombre: usar parte local antes de @
  if (s.includes('@')) {
    s = String(s.split('@')[0] ?? '').trim();
    s = s.replace(/[._-]+/g, ' ');
  }

  const parts = s.split(/[\s/|,:;]+/).filter(Boolean);
  const out: string[] = [];

  const firstAlnum = (word: string): string | null => {
    for (const ch of word) {
      if (/[0-9A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/.test(ch)) {
        return ch.toUpperCase();
      }
    }
    return null;
  };

  for (const w of parts) {
    const c = firstAlnum(w);
    if (c) out.push(c);
    if (out.length >= 2) break;
  }

  if (out.length === 0) return '?';
  return out.join('');
}
