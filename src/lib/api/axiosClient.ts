import axios from 'axios';
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
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Intercept response to handle generic errors (e.g. 401 Unauthorized)
axiosClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return axiosClient(originalRequest);
        }).catch(err => {
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
        authState.logout();
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        if (typeof window !== 'undefined') window.location.href = '/';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${axiosClient.defaults.baseURL}/auth/refresh`, {
          deviceId,
          refreshToken
        }, {
          headers: {
             Authorization: `Bearer ${authState.accessToken}`
          }
        });
        
        const data = res.data.data || res.data;
        const newAccessToken = data.access_token;
        const newRefreshToken = data.refresh_token;

        authState.setAuth(newAccessToken, newRefreshToken, authState.user!);
        
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
        processQueue(null, newAccessToken);
        isRefreshing = false;
        
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        authState.logout();
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        if (typeof window !== 'undefined') window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export { axiosClient };
export default axiosClient;
