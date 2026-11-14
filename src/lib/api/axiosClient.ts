import axios, { AxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/authStore";
import { API_BASE_URL, refreshAccessToken } from "@/lib/auth/refreshSession";

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  // The refresh cookie (HttpOnly, path /auth) rides along on the auth routes.
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercept request to inject token
axiosClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      if (config.headers && typeof config.headers.set === "function") {
        config.headers.set("Authorization", `Bearer ${token}`);
      } else {
        config.headers = {
          ...(config.headers || {}),
          Authorization: `Bearer ${token}`,
        } as any;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Do not start a new refresh attempt for every query retry with the same
// rejected access token. A new login or successful refresh clears it.
let invalidAccessToken: string | null = null;

const withBearer = (config: AxiosRequestConfig, token: string) => {
  if (config.headers && typeof (config.headers as any).set === "function") {
    (config.headers as any).set("Authorization", `Bearer ${token}`);
  } else {
    config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` } as any;
  }
  return config;
};

const isPublicOrOptionalEndpoint = (url?: string): boolean => {
  if (!url) return false;
  const publicPaths = [
    "/gamification/leaderboard",
    "/gamification/ranking",
    "/market/products",
    "/practice",
    "/grammar",
    "/flashcard",
    "/exams",
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/plans/catalog",
  ];
  return publicPaths.some((p) => url.includes(p));
};

const isGuestAllowedPage = (): boolean => {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname;
  if (
    p === "/" ||
    p === "/login" ||
    p === "/register" ||
    p === "/forgot-password" ||
    p === "/reset-password"
  )
    return true;
  const guestPrefixes = [
    "/practice",
    "/market",
    "/arena",
    "/ranking",
    "/flashcard",
    "/grammar",
    "/plans",
  ];
  return guestPrefixes.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`),
  );
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
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 Unauthorized and not already retried and not the refresh request itself
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      const authState = useAuthStore.getState();
      // Signed in means a known user: the access token may simply not be
      // loaded yet (it lives in memory) or have expired after 15 minutes.
      const hasExistingAuth = !!authState.user;
      const rejected = authState.accessToken;

      if (rejected && rejected === invalidAccessToken) {
        return Promise.reject(error);
      }

      // If client is an unauthenticated guest or requesting a public/optional endpoint, do NOT refresh or redirect
      if (!hasExistingAuth || isPublicOrOptionalEndpoint(originalRequest.url)) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        const token = await refreshAccessToken(rejected);
        invalidAccessToken = null;
        return axiosClient(withBearer(originalRequest, token));
      } catch (refreshError) {
        invalidAccessToken = rejected;
        authState.logout();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("breadtrans:logout"));
        }
        if (
          !isGuestAllowedPage() &&
          typeof window !== "undefined" &&
          window.location.pathname !== "/"
        ) {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export { axiosClient };
export default axiosClient;
