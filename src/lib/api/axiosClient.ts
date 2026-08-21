import axios, { AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept request to inject token
axiosClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = {
          ...(config.headers || {}),
          Authorization: `Bearer ${token}`,
        } as any;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Intercept response to handle generic errors (e.g. 401 Unauthorized)
axiosClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.data !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // If 401 Unauthorized and not already retried and not the refresh request itself
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
              originalRequest.headers.set('Authorization', `Bearer ${token}`);
            } else {
              originalRequest.headers = {
                ...(originalRequest.headers || {}),
                Authorization: `Bearer ${token}`,
              } as any;
            }
            originalRequest._retry = true;
            return axiosClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const authState = useAuthStore.getState();
      const refreshToken = authState.refreshToken;

      // Get or generate deviceId
      let deviceId = typeof window !== 'undefined' ? localStorage.getItem('deviceId') : null;
      if (!deviceId && typeof window !== 'undefined') {
        deviceId = crypto.randomUUID();
        localStorage.setItem('deviceId', deviceId);
      }

      if (!refreshToken || !deviceId) {
        isRefreshing = false;
        processQueue(error, null);
        authState.logout();
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = '/';
        }
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(
          `${axiosClient.defaults.baseURL}/auth/refresh`,
          {
            deviceId,
            refreshToken,
          },
          {
            headers: authState.accessToken
              ? { Authorization: `Bearer ${authState.accessToken}` }
              : undefined,
          }
        );

        const data = res.data.data || res.data;
        const newAccessToken = data.access_token;
        const newRefreshToken = data.refresh_token;

        if (authState.user) {
          authState.setAuth(newAccessToken, newRefreshToken, authState.user);
        }

        if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
          originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
        } else {
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            Authorization: `Bearer ${newAccessToken}`,
          } as any;
        }

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        authState.logout();
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = '/';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export { axiosClient };
export default axiosClient;
