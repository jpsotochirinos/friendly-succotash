/**
 * Origins allowed for CORS / Socket.IO / TUS.
 * `FRONTEND_URL` may be comma-separated. In non-production, common Vite/Electron
 * dev ports are merged so alternate ports (e.g. 5174 when 5173 is busy) still work.
 */
export function getAllowedCorsOrigins(): string[] {
  const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
  const fromEnv = raw.includes(',')
    ? raw.split(',').map((s) => s.trim()).filter(Boolean)
    : [raw.trim()].filter(Boolean);

  if (process.env.NODE_ENV === 'production') {
    return fromEnv;
  }

  const devExtras = [
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
  ];
  return [...new Set([...fromEnv, ...devExtras])];
}
