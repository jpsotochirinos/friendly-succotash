/** Shared fetch that sends Bearer token and refreshes on 401 (same pattern as SuperDocEditor). */
export function makeAuthFetch() {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const token = localStorage.getItem('accessToken') ?? '';
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);

    let res = await fetch(input, { ...init, headers });

    if (res.status === 401) {
      try {
        const refresh = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
        if (refresh.ok) {
          const { accessToken } = await refresh.json();
          localStorage.setItem('accessToken', accessToken);
          headers.set('Authorization', `Bearer ${accessToken}`);
          res = await fetch(input, { ...init, headers, signal: init?.signal });
        }
      } catch {
        // refresh failed
      }
    }

    return res;
  };
}
