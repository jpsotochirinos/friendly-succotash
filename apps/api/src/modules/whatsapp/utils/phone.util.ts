/** Normaliza identificador WhatsApp a E.164 sin prefijo whatsapp:. */
export function normalizeWhatsAppPhone(raw: string): string {
  let s = String(raw || '').trim();
  if (s.toLowerCase().startsWith('whatsapp:')) {
    s = s.slice('whatsapp:'.length);
  }
  s = s.replace(/\s/g, '');
  if (!s.startsWith('+')) {
    s = `+${s}`;
  }
  return s;
}
