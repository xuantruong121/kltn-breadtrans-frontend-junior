"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getDeviceId, persistDeviceId } from "@/lib/auth/deviceId";
import { normalizeAuthResponse } from "@/lib/auth/authResponse";
import { hydrateSession } from "@/lib/auth/hydrateSession";

type GoogleCredentialResponse = { credential?: string };
type GoogleCredentialHandler = (response: GoogleCredentialResponse) => void;

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
            console.error("Google Sign-In client ID changed after initialization.");
            return false;
          }

          runtime.activeCredentialHandler = handleCredentialResponse;

          buttonRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            shape: "pill",
            text: "continue_with",
            width: buttonRef.current.offsetWidth || 380,
            logo_alignment: "left",
          });
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
      const runtime = window.__breadtransGoogleSignIn;
      if (runtime?.activeCredentialHandler === handleCredentialResponse) {
        runtime.activeCredentialHandler = null;
      }
    };
  }, [clientId, handleCredentialResponse]);

  return (
    <div className="w-full">
      {isProcessing && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 py-3 text-sm font-semibold text-blue-700">
          <Loader2 className="animate-spin text-blue-600" size={18} />
          Đang xác thực tài khoản Google...
        </div>
      )}
      <div
        ref={buttonRef}
        className={`flex w-full justify-center ${
          !isReady ? "h-[44px] animate-pulse rounded-full bg-slate-100" : ""
        }`}
      />
    </div>
  );
}
