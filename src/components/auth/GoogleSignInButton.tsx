"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import {
  setAuthPersistenceMode,
  useAuthStore,
} from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getDeviceId, persistDeviceId } from "@/lib/auth/deviceId";
import { normalizeAuthResponse } from "@/lib/auth/authResponse";
import { hydrateSession } from "@/lib/auth/hydrateSession";

type GoogleCredentialResponse = { credential?: string };
type GoogleCredentialHandler = (response: GoogleCredentialResponse) => void;

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-[22px] shrink-0"
      viewBox="0 0 24 24"
      role="img"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.23a4.5 4.5 0 0 1-1.94 2.96v2.46h3.14c1.84-1.69 2.92-4.18 2.92-7.45Z"
      />
      <path
        fill="#34A853"
        d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.46c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.54A9.74 9.74 0 0 0 12 21.5Z"
      />
      <path
        fill="#FBBC05"
        d="M6.54 13.57a5.85 5.85 0 0 1 0-3.14V7.89H3.3a9.5 9.5 0 0 0 0 8.22l3.24-2.54Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.4c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.84 3.48 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.7 5.39l3.24 2.54C7.31 8.12 9.46 6.4 12 6.4Z"
      />
    </svg>
  );
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt?: () => void;
        };
      };
    };
    __breadtransGoogleSignIn?: {
      initializedClientId: string | null;
      activeCredentialHandler: GoogleCredentialHandler | null;
    };
  }
}

interface GoogleSignInButtonProps {
  redirectUrl?: string | null;
  onAccountLinkRequired?: (data: {
    credential: string;
    message: string;
  }) => void;
  onError?: (errMessage: string) => void;
}

function getSafeReturnUrl(rawTarget?: string | null): string {
  let candidate = rawTarget;
  if (!candidate && typeof window !== "undefined") {
    candidate = sessionStorage.getItem("auth:returnUrl");
    if (candidate) sessionStorage.removeItem("auth:returnUrl");
  }
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes(":") ||
    candidate.startsWith("/login")
  ) {
    return "/dashboard";
  }
  return candidate;
}

function getGoogleRuntime() {
  if (!window.__breadtransGoogleSignIn) {
    window.__breadtransGoogleSignIn = {
      initializedClientId: null,
      activeCredentialHandler: null,
    };
  }
  return window.__breadtransGoogleSignIn;
}

export default function GoogleSignInButton({
  redirectUrl,
  onAccountLinkRequired,
  onError,
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleCredentialResponse = useCallback(
    async (response: { credential?: string }) => {
      if (!response.credential) {
        toast.error("Không nhận được token từ Google.");
        return;
      }

      setIsProcessing(true);
      try {
        const deviceId = getDeviceId();

        const res = normalizeAuthResponse(
          await axiosClient.post("/auth/google", {
            credential: response.credential,
            deviceId,
          }),
        );

        // Clear previous cache & store
        queryClient.clear();
        useGamificationStore.getState().reset();

        setAuthPersistenceMode(true);
        setAuth(res.access_token, res.refresh_token, res.user);
        persistDeviceId(res.deviceId || deviceId);
        await hydrateSession(queryClient);
        toast.success("Đăng nhập bằng Google thành công!");

        const returnUrl = getSafeReturnUrl(redirectUrl);
        if (res.user.role === "ADMIN") {
          router.replace("/admin");
        } else {
          router.replace(returnUrl);
        }
      } catch (err: any) {
        const data = err.response?.data;
        const messagePayload = data?.message;
        const errorCode =
          (typeof messagePayload === "object"
            ? messagePayload?.code
            : undefined) ?? data?.code;
        if (errorCode === "ACCOUNT_LINK_REQUIRED") {
          if (onAccountLinkRequired) {
            onAccountLinkRequired({
              credential: response.credential,
              message:
                (typeof messagePayload === "object"
                  ? messagePayload?.message
                  : messagePayload) ||
                "Email này đã tồn tại trong hệ thống. Vui lòng nhập mật khẩu để liên kết tài khoản Google.",
            });
            return;
          }
        }
        const errorMsg =
          (typeof messagePayload === "object"
            ? messagePayload?.message
            : messagePayload) ||
          "Đăng nhập bằng Google thất bại. Vui lòng thử lại.";
        if (onError) onError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsProcessing(false);
      }
    },
    [onAccountLinkRequired, onError, queryClient, redirectUrl, router, setAuth],
  );

  useEffect(() => {
    if (!clientId) {
      console.warn("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured");
      return;
    }

    let intervalId: NodeJS.Timeout;
    let resizeObserver: ResizeObserver | null = null;
    let renderedWidth = 0;

    const syncIframeSize = () => {
      const host = buttonRef.current;
      const iframe = host?.querySelector<HTMLIFrameElement>("iframe");
      if (!host || !iframe) return false;

      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.minHeight = "100%";
      iframe.style.display = "block";

      const iframeHost = iframe.parentElement;
      if (iframeHost) {
        iframeHost.style.width = "100%";
        iframeHost.style.height = "100%";
        iframeHost.style.minHeight = "100%";
      }

      return true;
    };

    const initGsi = () => {
      if (window.google?.accounts?.id && buttonRef.current) {
        try {
          const runtime = getGoogleRuntime();
          if (!runtime.initializedClientId) {
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: (response: GoogleCredentialResponse) =>
                getGoogleRuntime().activeCredentialHandler?.(response),
            });
            runtime.initializedClientId = clientId;
          }

          if (runtime.initializedClientId !== clientId) {
            console.error(
              "Google Sign-In client ID changed after initialization.",
            );
            return false;
          }

          runtime.activeCredentialHandler = handleCredentialResponse;

          const wrapperWidth = Math.round(
            buttonRef.current.getBoundingClientRect().width,
          );
          const width = Math.min(wrapperWidth || 400, 400);
          if (renderedWidth === width && syncIframeSize()) {
            return true;
          }

          buttonRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            shape: "rectangular",
            text: "signin_with",
            width,
            logo_alignment: "center",
            locale: "vi",
          });

          renderedWidth = width;
          if (!syncIframeSize()) return false;

          if (!resizeObserver && "ResizeObserver" in window) {
            resizeObserver = new ResizeObserver(() => {
              initGsi();
            });
            resizeObserver.observe(buttonRef.current);
          }

          setIsReady(true);
          return true;
        } catch (e) {
          console.error("Failed to render Google Sign-In button:", e);
        }
      }
      return false;
    };

    if (!initGsi()) {
      intervalId = setInterval(() => {
        if (initGsi()) {
          clearInterval(intervalId);
        }
      }, 200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      resizeObserver?.disconnect();
      const runtime = window.__breadtransGoogleSignIn;
      if (runtime?.activeCredentialHandler === handleCredentialResponse) {
        runtime.activeCredentialHandler = null;
      }
    };
  }, [clientId, handleCredentialResponse]);

  return (
    <div className="w-full">
      {isProcessing && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 py-3 text-sm font-semibold text-blue-700 dark:text-blue-300">
          <Loader2
            className="animate-spin text-blue-600 dark:text-blue-400"
            size={18}
          />
          Đang xác thực tài khoản Google...
        </div>
      )}
      <div className="group relative h-14 w-full overflow-hidden rounded-2xl group-focus-within:outline group-focus-within:outline-2 group-focus-within:outline-amber-500 group-focus-within:outline-offset-2">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 flex h-14 w-full items-center justify-center rounded-2xl border border-slate-200/90 bg-white px-6 text-base font-semibold tracking-[-0.01em] text-slate-800 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:border-orange-300/80 group-hover:shadow-[0_12px_26px_-5px_rgba(234,88,12,0.18),0_3px_8px_-2px_rgba(15,23,42,0.08)] group-focus-within:ring-2 group-focus-within:ring-amber-500 group-focus-within:ring-offset-2 group-active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:group-hover:border-orange-700/80"
        >
          <span className="inline-flex items-center justify-center gap-3">
            <GoogleMark />
            <span>Đăng nhập bằng Google</span>
          </span>
          <ArrowRight
            aria-hidden="true"
            size={18}
            className="absolute right-6 translate-x-1 opacity-0 transition-[transform,opacity] duration-200 group-hover:translate-x-0 group-hover:opacity-100"
          />
        </div>
        <div
          ref={buttonRef}
          aria-busy={isProcessing || !isReady}
          className={`absolute inset-0 z-20 flex h-14 w-full scale-y-125 cursor-pointer items-center justify-center overflow-hidden rounded-2xl opacity-[0.001] ${
            !isReady || isProcessing ? "pointer-events-none" : ""
          }`}
        />
      </div>
    </div>
  );
}
