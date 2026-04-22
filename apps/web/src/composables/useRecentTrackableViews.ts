const STORAGE_KEY = 'alega.recentTrackables';
const MAX_ENTRIES = 50;

export type RecentTrackableEntry = {
  trackableId: string;
  visitedAt: number;
  title?: string;
};

function safeParse(raw: string | null): RecentTrackableEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is RecentTrackableEntry =>
          e != null &&
          typeof e === 'object' &&
          typeof (e as RecentTrackableEntry).trackableId === 'string' &&
          typeof (e as RecentTrackableEntry).visitedAt === 'number',
      )
      .map((e) => ({
        trackableId: e.trackableId,
        visitedAt: e.visitedAt,
        title: typeof e.title === 'string' ? e.title : undefined,
      }));
  } catch {
    return [];
  }
}

function persist(entries: RecentTrackableEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // quota / private mode
  }
}

/**
 * Historial de expedientes vistos en este navegador (orden por visitedAt desc al leer).
 */
export function getRecent(): RecentTrackableEntry[] {
  const list = safeParse(localStorage.getItem(STORAGE_KEY));
  return [...list].sort((a, b) => b.visitedAt - a.visitedAt);
}

/**
 * Registra o actualiza la visita actual; mantiene como máximo MAX_ENTRIES ids distintos.
 */
export function recordVisit(trackableId: string, title: string): void {
  if (!trackableId) return;
  const now = Date.now();
  const rest = getRecent().filter((e) => e.trackableId !== trackableId);
  const next: RecentTrackableEntry[] = [
    { trackableId, visitedAt: now, title: title || undefined },
    ...rest,
  ].slice(0, MAX_ENTRIES);
  persist(next);
}

export function useRecentTrackableViews() {
  return { recordVisit, getRecent };
}
