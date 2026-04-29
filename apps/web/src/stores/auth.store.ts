import axios from 'axios';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiClient } from '../api/client';

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationId: string;
  /** Role display name from GET /auth/me */
  roleName?: string | null;
  role?: string;
  /** Permission codes for the current role (GET /auth/me) */
  permissions?: string[];
}

export interface OrganizationSummary {
  id: string;
  name: string;
  settings?: Record<string, unknown> | null;
  onboardingState?: Record<string, unknown> | null;
  featureFlags?: {
    useConfigurableWorkflows?: boolean;
    sinoePolicy?: { autoApplyThreshold?: number; minConfidenceByAction?: Record<string, number> };
  } | null;
  /** Overrides ActionType → workflow definition id */
  workflowActionTypeDefaults?: Record<string, string> | null;
  /** Presigned URL for display; set only by GET /organizations/me */
  logoUrl?: string | null;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const organization = ref<OrganizationSummary | null>(null);
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'));
  const isAuthenticated = computed(() => !!accessToken.value);
  const needsOnboarding = computed(() => {
    if (!organization.value) return false;
    return organization.value.settings?.onboardingCompleted !== true;
  });

  async function fetchMyOrganization() {
    try {
      const { data } = await apiClient.get<OrganizationSummary>('/organizations/me');
      organization.value = data;
    } catch (e) {
      console.warn('Could not load organization', e);
      organization.value = { id: '', name: '', settings: { onboardingCompleted: true } };
    }
  }

  async function ensureOrganizationLoaded() {
    if (organization.value) return;
    await fetchMyOrganization();
  }

  async function login(email: string, password: string) {
    const { data } = await apiClient.post('/auth/login', { email, password });
    await setAuth(data);
  }

  async function register(payload: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    organizationName: string;
  }) {
    const { data } = await apiClient.post('/auth/register', payload);
    await setAuth(data);
  }

  async function requestMagicLink(email: string) {
    await apiClient.post('/auth/magic-link', { email });
  }

  /** Returns dev-only reset URL when API exposes it (local testing). */
  async function requestPasswordReset(email: string): Promise<string | null> {
    const { data } = await apiClient.post<{ devResetUrl?: string }>('/auth/forgot-password', { email });
    return typeof data?.devResetUrl === 'string' ? data.devResetUrl : null;
  }

  async function resetPassword(token: string, password: string) {
    const { data } = await apiClient.post('/auth/reset-password', { token, password });
    await setAuth(data as { accessToken: string; user?: AuthUser });
  }

  async function verifyMagicLink(token: string) {
    const { data } = await apiClient.get(`/auth/magic-link/verify?token=${token}`);
    await setAuth(data);
  }

  async function previewInvitation(token: string) {
    const { data } = await apiClient.get<{
      email: string;
      organizationName: string;
      roleName: string;
      expiresAt: string;
    }>('/auth/invitations/preview', { params: { token } });
    return data;
  }

  async function acceptInvitation(payload: {
    token: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const { data } = await apiClient.post('/auth/invitations/accept', payload);
    await setAuth(data);
  }

  async function fetchMe() {
    try {
      const { data } = await apiClient.get<AuthUser & { permissions?: string[] }>('/auth/me');
      user.value = data as AuthUser;
      await fetchMyOrganization();
    } catch (e) {
      const status = axios.isAxiosError(e) ? e.response?.status : undefined;
      if (status === 401 || status === 403) {
        logout();
      } else if (import.meta.env.DEV) {
        console.warn('[auth] fetchMe failed (non-auth); not logging out', e);
      }
    }
  }

  /** Keeps Pinia in sync when the axios interceptor refreshes the access token via cookie. */
  function applyRefreshedAccessToken(newToken: string) {
    accessToken.value = newToken;
  }

  /** Clears session without calling POST /auth/logout (refresh already failed). */
  function clearSessionAfterRefreshFailure() {
    accessToken.value = null;
    user.value = null;
    organization.value = null;
    localStorage.removeItem('accessToken');
  }

  async function refreshTokens() {
    try {
      const { data } = await apiClient.post<{ accessToken: string }>('/auth/refresh');
      accessToken.value = data.accessToken;
      localStorage.setItem('accessToken', data.accessToken);
      await fetchMe();
    } catch (e) {
      const status = axios.isAxiosError(e) ? e.response?.status : undefined;
      if (status === 401 || status === 403) {
        logout();
      } else if (import.meta.env.DEV) {
        console.warn('[auth] refreshTokens failed (non-auth); not logging out', e);
      }
    }
  }

  async function setAuth(data: { accessToken: string; user?: AuthUser }) {
    accessToken.value = data.accessToken;
    localStorage.setItem('accessToken', data.accessToken);
    await fetchMe();
  }

  function logout() {
    apiClient.post('/auth/logout').catch(() => {});
    accessToken.value = null;
    user.value = null;
    organization.value = null;
    localStorage.removeItem('accessToken');
    import('../router/index').then(({ router }) => router.push('/auth/login'));
  }

  function loginWithGoogle() {
    window.location.href = '/api/auth/google';
  }

  return {
    user,
    organization,
    accessToken,
    isAuthenticated,
    needsOnboarding,
    login,
    register,
    logout,
    fetchMe,
    applyRefreshedAccessToken,
    clearSessionAfterRefreshFailure,
    refreshTokens,
    fetchMyOrganization,
    ensureOrganizationLoaded,
    requestMagicLink,
    requestPasswordReset,
    resetPassword,
    verifyMagicLink,
    previewInvitation,
    acceptInvitation,
    loginWithGoogle,
  };
});
