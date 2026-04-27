import { apiClient } from './client';

export const signaturesApi = {
  uploadProfile(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post('/signatures/profile/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getMyProfile() {
    return apiClient.get('/signatures/profile/me');
  },
  deleteProfile() {
    return apiClient.delete('/signatures/profile/me');
  },
  createRequest(body: unknown) {
    return apiClient.post('/signatures/requests', body);
  },
  listRequests(tab: 'pending' | 'sent' | 'completed' | 'all' = 'all') {
    return apiClient.get('/signatures/requests', { params: { tab } });
  },
  getRequest(id: string) {
    return apiClient.get(`/signatures/requests/${id}`);
  },
  getPdfUrl(id: string) {
    return apiClient.get<{
      url: string | null;
      pendingConversion: boolean;
      conversionError: string | null;
    }>(`/signatures/requests/${id}/pdf-url`);
  },
  retryConversion(id: string) {
    return apiClient.post<{ ok: boolean }>(`/signatures/requests/${id}/retry-conversion`);
  },
  getSignedUrl(id: string) {
    return apiClient.get<{ url: string | null }>(`/signatures/requests/${id}/signed-url`);
  },
  sign(
    id: string,
    body: {
      signerId: string;
      otpCode: string;
      signatureDataUrl?: string;
      signatureZone?: { page: number; x: number; y: number; width: number; height: number };
    },
  ) {
    return apiClient.post(`/signatures/requests/${id}/sign`, body);
  },
  sendOtp(signerId: string, opts?: { channel?: 'email' | 'whatsapp' }) {
    return apiClient.post('/signatures/otp/send', {
      signerId,
      channel: opts?.channel,
    });
  },
  verifyReq(id: string) {
    return apiClient.get(`/signatures/public/verify-req/${id}`);
  },
  verifyHash(h: string) {
    return apiClient.get(`/signatures/public/verify/${h}`);
  },
  externalPreview(token: string) {
    return apiClient.get('/signatures/public/external/preview', { params: { token } });
  },
  externalOtp(
    token: string,
    opts?: { channel?: 'email' | 'whatsapp'; phone?: string },
  ) {
    return apiClient.post('/signatures/public/external/otp', {
      token,
      channel: opts?.channel,
      phone: opts?.phone,
    });
  },
  externalPdfUrl(token: string) {
    return apiClient.get<{ url: string }>('/signatures/public/external/pdf-url', { params: { token } });
  },
  externalSign(
    token: string,
    otpCode: string,
    signatureDataUrl: string,
    signatureZone?: { page: number; x: number; y: number; width: number; height: number },
  ) {
    return apiClient.post('/signatures/public/external/sign', {
      token,
      otpCode,
      signatureDataUrl,
      signatureZone,
    });
  },
};
