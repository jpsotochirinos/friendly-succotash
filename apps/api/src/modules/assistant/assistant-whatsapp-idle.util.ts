/**
 * Si pasó más de `idleHours` desde la última actividad del hilo, conviene archivar y crear uno nuevo.
 * `idleHours <= 0` desactiva la rotación.
 */
export function whatsappThreadNeedsRotation(
  lastMessageAt: Date | undefined | null,
  updatedAt: Date | undefined | null,
  idleHours: number,
  nowMs: number = Date.now(),
): boolean {
  if (!Number.isFinite(idleHours) || idleHours <= 0) return false;
  const idleMs = idleHours * 3600000;
  const anchor = lastMessageAt?.getTime() ?? updatedAt?.getTime();
  if (anchor == null) return false;
  return nowMs - anchor > idleMs;
}
