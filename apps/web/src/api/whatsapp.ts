import { apiClient } from './client';

export type WhatsAppAccountDto = {
  phoneNumberId: string;
  displayPhone: string;
  provider: string;
  groupIds: string[];
  briefingCron: string;
  briefingEnabled: boolean;
  briefingGroupId: string | null;
  /** Canal WhatsApp para notificaciones (org). */
  notificationsEnabled?: boolean;
};

export type WhatsAppEventOptInRow = { eventType: string; enabled: boolean };

export async function getWhatsAppEventOptIn(): Promise<WhatsAppEventOptInRow[]> {
  const { data } = await apiClient.get<WhatsAppEventOptInRow[]>('/whatsapp/event-opt-in');
  return data;
}

export async function updateWhatsAppEventOptIn(
  items: WhatsAppEventOptInRow[],
): Promise<{ ok: boolean }> {
  const { data } = await apiClient.put<{ ok: boolean }>('/whatsapp/event-opt-in', { items });
  return data;
}

export async function getWhatsAppAccount(): Promise<WhatsAppAccountDto> {
  const { data } = await apiClient.get<WhatsAppAccountDto>('/whatsapp/account');
  return data;
}

export async function updateWhatsAppAccount(body: Partial<WhatsAppAccountDto>): Promise<WhatsAppAccountDto> {
  const { data } = await apiClient.put<WhatsAppAccountDto>('/whatsapp/account', body);
  return data;
}

export async function verifyWhatsAppPhone(phoneNumber: string): Promise<void> {
  await apiClient.post('/whatsapp/verify-phone', { phoneNumber });
}

export async function confirmWhatsAppCode(code: string): Promise<void> {
  await apiClient.post('/whatsapp/confirm-code', { code });
}

export async function getWhatsAppMe(): Promise<{
  receiveBriefing: boolean;
  phoneVerified: boolean;
  phoneNumber: string | null;
}> {
  const { data } = await apiClient.get('/whatsapp/me');
  return data;
}

export async function updateWhatsAppMe(body: { receiveBriefing?: boolean }): Promise<{ receiveBriefing: boolean }> {
  const { data } = await apiClient.put('/whatsapp/me', body);
  return data;
}

export type WhatsAppMemberRow = {
  id: string;
  phoneNumber: string;
  receiveBriefing: boolean;
  userId: string;
  email: string | null;
};

export async function listWhatsAppMembers(): Promise<WhatsAppMemberRow[]> {
  const { data } = await apiClient.get<WhatsAppMemberRow[]>('/whatsapp/members');
  return data;
}

export type WhatsAppMessageRow = {
  id: string;
  body: string;
  direction: string;
  timestamp: string;
  fromPhone: string;
};

export async function listRecentWhatsAppMessages(): Promise<WhatsAppMessageRow[]> {
  const { data } = await apiClient.get<WhatsAppMessageRow[]>('/whatsapp/messages/recent');
  return data;
}
