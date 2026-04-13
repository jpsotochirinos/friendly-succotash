import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiClient } from '../api/client';

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationId: string;
  role?: string;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'));
  const isAuthenticated = computed(() => !!accessToken.value);

  async function login(email: string, password: string) {
    const { data } = await apiClient.post('/auth/login', { email, password });
    setAuth(data);
  }

  async function register(payload: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    organizationName: string;
  }) {
    const { data } = await apiClient.post('/auth/register', payload);
    setAuth(data);
  }

  async function requestMagicLink(email: string) {
    await apiClient.post('/auth/magic-link', { email });
  }

  async function verifyMagicLink(token: string) {
    const { data } = await apiClient.get(`/auth/magic-link/verify?token=${token}`);
    setAuth(data);
  }

  async function fetchMe() {
    try {
      const { data } = await apiClient.get('/auth/me');
      user.value = data;
    } catch {
      logout();
    }
  }

  async function refreshTokens() {
    try {
      const { data } = await apiClient.post('/auth/refresh');
      accessToken.value = data.accessToken;
      localStorage.setItem('accessToken', data.accessToken);
      user.value = data.user;
    } catch {
      logout();
    }
  }

  function setAuth(data: { accessToken: string; user: AuthUser }) {
    accessToken.value = data.accessToken;
    user.value = data.user;
    localStorage.setItem('accessToken', data.accessToken);
  }

  function logout() {
    apiClient.post('/auth/logout').catch(() => {});
    accessToken.value = null;
    user.value = null;
    localStorage.removeItem('accessToken');
    import('../router/index').then(({ router }) => router.push('/auth/login'));
  }

  function loginWithGoogle() {
    window.location.href = '/api/auth/google';
  }

  return {
    user, accessToken, isAuthenticated,
    login, register, logout, fetchMe, refreshTokens,
    requestMagicLink, verifyMagicLink, loginWithGoogle,
  };
});
