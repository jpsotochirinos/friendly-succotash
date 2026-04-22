import { apiClient } from './client';

export async function deleteWhatsAppAssistantThread(): Promise<{
  deleted: boolean;
  threadId?: string;
}> {
  const { data } = await apiClient.delete<{ deleted: boolean; threadId?: string }>(
    '/assistant/threads/whatsapp',
  );
  return data;
}

export async function deleteAssistantThread(id: string): Promise<void> {
  await apiClient.delete(`/assistant/threads/${id}`);
}

export async function getAssistantThreadsRetention(): Promise<{ retentionDays: number }> {
  const { data } = await apiClient.get<{ retentionDays: number }>(
    '/assistant/threads/retention',
  );
  return data;
}
