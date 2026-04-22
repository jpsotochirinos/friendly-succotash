import { apiClient } from './client';

export async function createImportBatch(body: {
  name: string;
  channel: string;
  config?: Record<string, unknown>;
}) {
  const { data } = await apiClient.post('/import/batches', body);
  return data as {
    id: string;
    uploadToken: string;
    status: string;
    stagingExpiresAt?: string;
  };
}

export async function listImportBatches() {
  const { data } = await apiClient.get('/import/batches');
  return data;
}

export async function ingestImportZip(batchId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post(`/import/batches/${batchId}/ingest-zip`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getImportReview(batchId: string) {
  const { data } = await apiClient.get(`/import/batches/${batchId}/review`);
  return data;
}

export async function commitImportBatch(batchId: string) {
  await apiClient.post(`/import/batches/${batchId}/commit`);
}

export async function revertImportBatch(batchId: string) {
  await apiClient.post(`/import/batches/${batchId}/revert`);
}

export async function getImportReporting() {
  const { data } = await apiClient.get('/import/reporting');
  return data;
}

export async function getGoogleDriveAuthUrl(batchId: string) {
  const redirectUri = `${window.location.origin}/import/oauth-callback`;
  const { data } = await apiClient.get('/import/oauth/google/authorize', {
    params: { batchId, redirectUri },
  });
  return data as { url?: string; error?: string };
}

export async function getMicrosoftAuthUrl(batchId: string) {
  const redirectUri = `${window.location.origin}/import/oauth-callback`;
  const { data } = await apiClient.get('/import/oauth/microsoft/authorize', {
    params: { batchId, redirectUri },
  });
  return data as { url?: string; error?: string };
}

export async function listDriveFolder(batchId: string, parent: string) {
  const { data } = await apiClient.get(`/import/batches/${batchId}/drive/list`, {
    params: { parent },
  });
  return data as { id: string; name: string; mimeType: string }[];
}

export async function startDriveIngest(batchId: string, rootFolderId?: string) {
  const { data } = await apiClient.post(`/import/batches/${batchId}/drive/start`, {
    rootFolderId,
  });
  return data as { ok: boolean };
}

export async function listMsGraphFolder(
  batchId: string,
  params: { mode: 'onedrive' | 'sharepoint'; siteId?: string; parent?: string },
) {
  const { data } = await apiClient.get(`/import/batches/${batchId}/msgraph/list`, {
    params: {
      mode: params.mode,
      siteId: params.siteId,
      parent: params.parent,
    },
  });
  return data as { id: string; name: string; folder?: boolean }[];
}

export async function startMsGraphIngest(
  batchId: string,
  body: {
    mode?: 'onedrive' | 'sharepoint';
    siteId?: string;
    rootItemId?: string;
  },
) {
  const { data } = await apiClient.post(`/import/batches/${batchId}/msgraph/start`, body);
  return data as { ok: boolean };
}

export async function registerImportAgent(label?: string) {
  const { data } = await apiClient.post('/import/agents/register', { label });
  return data as { agentId: string; agentToken: string };
}
