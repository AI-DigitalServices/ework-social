import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  // Send/receive the HttpOnly refresh-token cookie on cross-origin API calls
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        const token = parsed?.state?.token;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Token parse error:', e);
    }
  }
  return config;
});

// Track if we are already refreshing to prevent infinite loops
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// The refresh token now lives ONLY in the HttpOnly cookie (not JS-readable).
// We just need to know whether a session exists — the presence of an access
// token — to decide whether to attempt a cookie-based refresh.
const hasSession = (): boolean => {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return !!parsed?.state?.token;
    }
  } catch {
    return false;
  }
  return false;
};

const updateAccessToken = (newToken: string) => {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      parsed.state.token = newToken;
      localStorage.setItem('auth-storage', JSON.stringify(parsed));
      document.cookie = `auth-token=${newToken}; path=/; max-age=${15 * 60}`;
    }
  } catch {
    // ignore
  }
};

// On 401 — try silent refresh before redirecting to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry refresh endpoint itself
      if (originalRequest.url?.includes('/auth/refresh')) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      if (!hasSession()) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
          {}, // no body — the HttpOnly refresh cookie carries the token
          { withCredentials: true },
        );

        const newAccessToken = response.data.accessToken;
        updateAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
