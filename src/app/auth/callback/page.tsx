"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeAuthResponse } from "@/lib/auth/authResponse";
import { getDeviceId, persistDeviceId } from "@/lib/auth/deviceId";
import { hydrateSession } from "@/lib/auth/hydrateSession";

function GoogleCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();
  const handledCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      router.replace("/auth/error");
      return;
    }
    if (handledCodeRef.current === code) return;
    handledCodeRef.current = code;
    let active = true;
    axiosClient
      .post("/auth/google/exchange", { code })
      .then(async (rawResponse: unknown) => {
        if (!active) return;
        const response = normalizeAuthResponse(rawResponse);
        queryClient.clear();
        useGamificationStore.getState().reset();
        setAuth(response.access_token, response.refresh_token, response.user);
        persistDeviceId(response.deviceId || getDeviceId());
        await hydrateSession(queryClient);
        if (!active) return;
        router.replace(
          response.user.role === "ADMIN" ? "/admin" : "/dashboard",
        );
      })
      .catch(() => {
        if (active) router.replace("/auth/error");
      });
    return () => {
      active = false;
    };
  }, [queryClient, router, searchParams, setAuth]);

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
