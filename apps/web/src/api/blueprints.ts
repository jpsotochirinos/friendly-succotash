import { apiClient } from './client';

export type BlueprintScope = 'system' | 'tenant' | 'instance';

export type BlueprintListRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  matterType?: string | null;
  scope: BlueprintScope;
  isActive: boolean;
  currentVersion?: { id: string; versionNumber: number; isDraft: boolean; publishedAt?: string | null } | null;
  parentBlueprint?: { id: string; code: string; name: string } | null;
};

export type BlueprintCatalogResponse = {
  system: BlueprintListRow[];
  tenant: BlueprintListRow[];
};

export async function listBlueprints(matterType?: string): Promise<BlueprintCatalogResponse> {
  const { data } = await apiClient.get<BlueprintCatalogResponse>('/blueprints', {
    params: matterType ? { matterType } : undefined,
  });
  return data;
}

export async function getBlueprint(id: string): Promise<BlueprintListRow> {
  const { data } = await apiClient.get<BlueprintListRow>(`/blueprints/${id}`);
  return data;
}

export async function patchBlueprint(
  id: string,
  body: { name?: string; description?: string | null; isActive?: boolean },
): Promise<BlueprintListRow> {
  const { data } = await apiClient.patch<BlueprintListRow>(`/blueprints/${id}`, body);
  return data;
}

export async function createTenantFromSystem(body: {
  systemBlueprintId: string;
  code: string;
  name: string;
}): Promise<BlueprintListRow> {
  const { data } = await apiClient.post<BlueprintListRow>('/blueprints/tenant', body);
  return data;
}

export async function adoptSystemBlueprint(body: {
  systemBlueprintId: string;
  code: string;
  name: string;
}): Promise<BlueprintListRow> {
  const { data } = await apiClient.post<BlueprintListRow>('/blueprints/adopt', body);
  return data;
}

export type BlueprintVersionRow = {
  id: string;
  versionNumber: number;
  isDraft: boolean;
  changelog?: string | null;
  publishedAt?: string | null;
};

export async function listBlueprintVersions(blueprintId: string): Promise<BlueprintVersionRow[]> {
  const { data } = await apiClient.get<BlueprintVersionRow[]>(`/blueprints/${blueprintId}/versions`);
  return data;
}

export async function createDraftVersion(blueprintId: string, changelog?: string): Promise<unknown> {
  const { data } = await apiClient.post(`/blueprints/${blueprintId}/versions`, { changelog });
  return data;
}

export async function publishVersion(blueprintId: string, versionNumber: number): Promise<unknown> {
  const { data } = await apiClient.post(
    `/blueprints/${blueprintId}/versions/${versionNumber}/publish`,
  );
  return data;
}

export async function diffVersions(
  blueprintId: string,
  v1: number,
  v2: number,
): Promise<{ left: unknown; right: unknown }> {
  const { data } = await apiClient.get<{ left: unknown; right: unknown }>(
    `/blueprints/${blueprintId}/versions/${v1}/diff/${v2}`,
  );
  return data;
}

export async function getTenantResolved(
  blueprintId: string,
  versionId?: string,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<Record<string, unknown>>(`/blueprints/${blueprintId}/resolved`, {
    params: versionId ? { versionId } : undefined,
  });
  return data;
}

export type BlueprintOverrideRow = {
  id: string;
  targetType: string;
  targetCode?: string | null;
  operation: string;
  patch: Record<string, unknown>;
  reason?: string | null;
  isLocked: boolean;
  createdAt?: string;
};

export async function listOverrides(blueprintId: string): Promise<BlueprintOverrideRow[]> {
  const { data } = await apiClient.get<BlueprintOverrideRow[]>(`/blueprints/${blueprintId}/overrides`);
  return data;
}

export async function createOverride(
  blueprintId: string,
  body: {
    targetType: string;
    targetCode?: string;
    operation: string;
    patch: Record<string, unknown>;
    reason?: string;
  },
): Promise<BlueprintOverrideRow> {
  const { data } = await apiClient.post<BlueprintOverrideRow>(`/blueprints/${blueprintId}/overrides`, body);
  return data;
}

export async function updateOverride(
  blueprintId: string,
  overrideId: string,
  body: { patch?: Record<string, unknown>; reason?: string },
): Promise<BlueprintOverrideRow> {
  const { data } = await apiClient.patch<BlueprintOverrideRow>(
    `/blueprints/${blueprintId}/overrides/${overrideId}`,
    body,
  );
  return data;
}

export async function deleteOverride(blueprintId: string, overrideId: string): Promise<void> {
  await apiClient.delete(`/blueprints/${blueprintId}/overrides/${overrideId}`);
}
