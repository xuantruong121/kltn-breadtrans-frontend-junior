"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeAuthResponse } from "@/lib/auth/authResponse";
import { hydrateSession } from "@/lib/auth/hydrateSession";
import toast from "react-hot-toast";
import {
  CONSENT_REQUIRED,
  apiErrorCode,
  pendingDeletionOf,
  type PendingDeletion,
} from "@/lib/auth/accountPrivacy";
import { ConsentDialog } from "@/components/auth/ConsentDialog";
import { PendingDeletionDialog } from "@/components/auth/PendingDeletionDialog";

function GoogleCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();
  const handledCodeRef = useRef<string | null>(null);
  // A first Google sign-in waits for consent (owner 2026-11-16); the backend
  // keeps the login code for five more minutes while the learner decides.
  const [consentCode, setConsentCode] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(false);
  const [pending, setPending] = useState<PendingDeletion | null>(null);
  const activeRef = useRef(true);

  const exchange = useCallback(
    async (code: string, acceptTerms = false) => {
      setIsExchanging(true);
      try {
        const rawResponse = await axiosClient.post("/auth/google/exchange", {
          code,
          ...(acceptTerms ? { acceptTerms: true } : {}),
        });
        if (!activeRef.current) return;
        const response = normalizeAuthResponse(rawResponse);
        queryClient.clear();
        useGamificationStore.getState().reset();
        setAuth(response.access_token, response.user);
        await hydrateSession(queryClient);
        if (!activeRef.current) return;
        router.replace(
          response.user.role === "ADMIN" ? "/admin" : "/dashboard",
        );
      } catch (err) {
        if (!activeRef.current) return;
        if (!acceptTerms && apiErrorCode(err) === CONSENT_REQUIRED) {
          setConsentCode(code);
          return;
        }
        const offer = pendingDeletionOf(err);
        if (offer) {
          setConsentCode(null);
          setPending(offer);
          return;
        }
        router.replace("/auth/error");
      } finally {
        if (activeRef.current) setIsExchanging(false);
      }
    },
    [queryClient, router, setAuth],
  );

  useEffect(() => {
    activeRef.current = true;
    const code = searchParams.get("code");
    if (!code) {
      router.replace("/auth/error");
      return;
    }
    if (handledCodeRef.current === code) return;
    handledCodeRef.current = code;
    void exchange(code);
    return () => {
      activeRef.current = false;
    };
  }, [exchange, router, searchParams]);

  if (consentCode || pending) {
    return (
      <div className="min-h-[60vh] bg-surface">
        <ConsentDialog
          open={consentCode !== null}
          title="Tạo tài khoản bằng Google"
          description="Đây là lần đầu bạn đăng nhập BreadTrans bằng tài khoản Google này. Hãy đọc và đồng ý với điều khoản để tạo tài khoản."
          confirmLabel="Đồng ý và tạo tài khoản"
          isPending={isExchanging}
          onConfirm={() => {
            if (consentCode) void exchange(consentCode, true);
          }}
        >
          <button
            type="button"
            onClick={() => router.replace("/login")}
            disabled={isExchanging}
            className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Không tạo tài khoản
          </button>
        </ConsentDialog>
        <PendingDeletionDialog
          pending={pending}
          onClose={() => router.replace("/login")}
          onCancelled={() => {
            toast.success("Đã huỷ yêu cầu xoá. Hãy đăng nhập lại.");
            router.replace("/login");
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center gap-3 bg-surface px-4 text-center text-sm font-bold text-slate-600">
      <Loader2
        className="animate-spin text-primary"
        size={24}
        aria-hidden="true"
      />{" "}
      Đang hoàn tất đăng nhập Google...
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-surface">
          <Loader2
            className="animate-spin text-primary"
            size={24}
            aria-label="Đang tải"
          />
        </div>
      }
    >
      <GoogleCallbackHandler />
    </Suspense>
  );
}
