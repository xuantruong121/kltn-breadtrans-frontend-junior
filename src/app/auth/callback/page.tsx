"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQueryClient } from "@tanstack/react-query";

function GoogleCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      router.replace("/login");
      return;
    }
    let active = true;
    axiosClient.post("/auth/google/exchange", { code }).then((response: any) => {
      if (!active) return;
      queryClient.clear();
      useGamificationStore.getState().reset();
      setAuth(response.access_token, response.refresh_token, response.user);
      router.replace(response.user.role === "ADMIN" ? "/admin" : "/dashboard");
    }).catch(() => {
      if (active) router.replace("/login?googleError=1");
    });
    return () => { active = false; };
  }, [queryClient, router, searchParams, setAuth]);

  return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm font-bold text-slate-500"><Loader2 className="animate-spin text-junior-blue" size={24} /> Đang hoàn tất đăng nhập Google...</div>;
}

export default function GoogleCallbackPage() {
  return <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-junior-blue" size={24} /></div>}><GoogleCallbackHandler /></Suspense>;
}
