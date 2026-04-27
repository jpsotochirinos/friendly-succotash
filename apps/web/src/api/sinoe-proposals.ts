import { apiClient } from './client';

export async function listSinoeProposals(params?: { status?: string; processTrackId?: string; limit?: number }) {
  const { data } = await apiClient.get('/sinoe-proposals', { params });
  return data;
}

export async function getSinoeProposal(id: string) {
  const { data } = await apiClient.get(`/sinoe-proposals/${id}`);
  return data;
}

export async function sinoeProposalStats() {
  const { data } = await apiClient.get('/sinoe-proposals/stats');
  return data;
}

export async function approveSinoeProposal(id: string) {
  const { data } = await apiClient.post(`/sinoe-proposals/${id}/approve`);
  return data;
}

export async function rejectSinoeProposal(id: string, reason: string) {
  const { data } = await apiClient.post(`/sinoe-proposals/${id}/reject`, { reason });
  return data;
}

export async function revertSinoeProposal(id: string) {
  const { data } = await apiClient.post(`/sinoe-proposals/${id}/revert`);
  return data;
}
