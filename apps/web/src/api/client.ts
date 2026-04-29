import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

/** Single in-flight refresh so parallel 401s don't race when the backend rotates refresh tokens. */
let refreshPromise: Promise<string> | null = null;

function getRefreshedAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = axios
    .post<{ accessToken: string }>('/api/auth/refresh', null, {
      withCredentials: true,
    })
    .then(async ({ data }) => {
      const token = data.accessToken;
      localStorage.setItem('accessToken', token);
      try {
        const { useAuthStore } = await import('../stores/auth.store');
        useAuthStore().applyRefreshedAccessToken(token);
      } catch {
        /* Pinia may not be mounted yet; subsequent requests read token from localStorage */
      }
      return token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

/** 401 on these routes should not trigger refresh (e.g. wrong password on login while a stale Bearer exists). */
function shouldSkipAuthRefresh(url: string): boolean {
  const paths = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/magic-link',
    '/auth/invitations/accept',
    '/auth/refresh',
  ];
  return paths.some((p) => url.includes(p));
}

function buildRequestUrl(config: { baseURL?: string; url?: string }): string {
  return `${config.baseURL ?? ''}${config.url ?? ''}`;
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;

    if (status !== 401 || !original) {
      return Promise.reject(error);
    }

    if (original._retry) {
      return Promise.reject(error);
    }

    const url = buildRequestUrl(original);
    if (shouldSkipAuthRefresh(url)) {
      return Promise.reject(error);
    }

    try {
      const newToken = await getRefreshedAccessToken();
      original._retry = true;
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch {
      if (import.meta.env.DEV) {
        console.warn('[auth] refresh failed; redirecting to login');
      }
      localStorage.removeItem('accessToken');
      try {
        const { useAuthStore } = await import('../stores/auth.store');
        useAuthStore().clearSessionAfterRefreshFailure();
      } catch {
        // Pinia may be unavailable during early bootstrap
      }
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  },
);
