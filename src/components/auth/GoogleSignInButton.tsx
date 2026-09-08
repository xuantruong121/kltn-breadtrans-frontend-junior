"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

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
  }
}

interface GoogleSignInButtonProps {
  redirectUrl?: string | null;
  onAccountLinkRequired?: (data: { credential: string; message: string }) => void;
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
        let deviceId =
          typeof window !== "undefined" ? localStorage.getItem("deviceId") : null;
        if (!deviceId && typeof window !== "undefined") {
          deviceId = crypto.randomUUID();
          localStorage.setItem("deviceId", deviceId);
        }

        const res: any = await axiosClient.post("/auth/google", {
          credential: response.credential,
          deviceId,
        });

        // Clear previous cache & store
        queryClient.clear();
        useGamificationStore.getState().reset();

        setAuth(res.access_token, res.refresh_token, res.user);
        toast.success("Đăng nhập bằng Google thành công!");

        const returnUrl = getSafeReturnUrl(redirectUrl);
        if (res.user.role === "ADMIN") {
          router.replace("/admin");
        } else {
          router.replace(returnUrl);
        }
      } catch (err: any) {
        const data = err.response?.data;
        if (data?.code === "ACCOUNT_LINK_REQUIRED") {
          if (onAccountLinkRequired) {
            onAccountLinkRequired({
              credential: response.credential,
              message:
                data.message ||
                "Email này đã tồn tại trong hệ thống. Vui lòng nhập mật khẩu để liên kết tài khoản Google.",
            });
            return;
          }
        }
        const errorMsg =
          data?.message || "Đăng nhập bằng Google thất bại. Vui lòng thử lại.";
        if (onError) onError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsProcessing(false);
      }
    },
    [clientId, onAccountLinkRequired, onError, queryClient, redirectUrl, router, setAuth]
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
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
          });

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
