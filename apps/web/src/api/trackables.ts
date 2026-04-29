import { apiClient } from '@/api/client';

export type TrackableListingUrgency =
  | 'overdue'
  | 'due_today'
  | 'due_week'
  | 'due_month'
  | 'normal'
  | 'no_deadline';

export interface TrackableListItemDto {
  id: string;
  codigo: string;
  caratula: string;
  tipo: string;
  materia: string;
  estado: string;
  urgencia: TrackableListingUrgency;
  cliente: { id: string; nombre: string } | null;
  asignado: { id: string; nombre: string; avatarUrl?: string } | null;
  proximoPlazo: { fecha: string; tipo: string; diasRestantes: number } | null;
  ultimaActividad: string;
  contadores: {
    documentos: number;
    actividadesHechas: number;
    actividadesTotal: number;
    comentarios: number;
  };
  progresoPct: number;
}

export interface TrackableListFacets {
  total: number;
  overdue: number;
  dueToday: number;
  dueWeek: number;
  dueMonth: number;
  normal: number;
  noDeadline: number;
}

export interface TrackableListResponse {
  items: TrackableListItemDto[];
  nextCursor: string | null;
  totalCount: number;
  facets: TrackableListFacets;
}

export interface TrackableListParams {
  scope?: 'active' | 'archived';
  status?: string;
  tipo?: string[];
  materia?: string[];
  asignadoId?: string[];
  clienteId?: string[];
  search?: string;
  urgencia?: TrackableListingUrgency;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
}

export function serializeArrays(params: Record<string, unknown>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      if (v.length) out[k] = v.join(',');
    } else {
      out[k] = String(v);
    }
  }
  return out;
}

export async function fetchTrackablesList(
  params: TrackableListParams,
  signal?: AbortSignal,
): Promise<TrackableListResponse> {
  const { data } = await apiClient.get<TrackableListResponse>('/trackables/list', {
    params: serializeArrays(params as unknown as Record<string, unknown>),
    signal,
  });
  return data;
}

export async function fetchTrackablesFilterOptions(signal?: AbortSignal) {
  const { data } = await apiClient.get('/trackables/filters/options', { signal });
  return data as {
    matterTypes: string[];
    types: string[];
    users: { id: string; nombre: string; email: string }[];
    clients: { id: string; nombre: string }[];
  };
}

export async function listSavedTrackableViews(signal?: AbortSignal) {
  const { data } = await apiClient.get('/trackables/views', { signal });
  return data as unknown[];
}

export async function createSavedTrackableView(
  body: { name: string; slug?: string; config: Record<string, unknown>; isShared?: boolean },
  signal?: AbortSignal,
) {
  const { data } = await apiClient.post('/trackables/views', body, { signal });
  return data;
}

export async function patchSavedTrackableView(
  viewId: string,
  body: Partial<{ name: string; slug: string; config: Record<string, unknown>; isShared: boolean; isFavorite: boolean }>,
  signal?: AbortSignal,
) {
  const { data } = await apiClient.patch(`/trackables/views/${viewId}`, body, { signal });
  return data;
}

export async function deleteSavedTrackableView(viewId: string, signal?: AbortSignal) {
  const { data } = await apiClient.delete(`/trackables/views/${viewId}`, { signal });
  return data;
}

export async function postTrackablesBulkStub(signal?: AbortSignal) {
  const { data } = await apiClient.post('/trackables/bulk', {}, { signal });
  return data;
}
