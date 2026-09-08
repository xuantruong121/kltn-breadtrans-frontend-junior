"use client";

import { useEffect, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/navigation/AppHeader";
import { useAuthStore } from "@/stores/authStore";

const FloatingAiTutor = dynamic(() => import("@/components/FloatingAiTutor"), { ssr: false });
const emptySubscribe = () => () => {};

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const isReady = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    if (isReady && (!user || user.role !== "STUDENT")) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isReady, user, router, pathname]);

  useEffect(() => {
    if (!user || user.role !== "STUDENT") return;
    const handleLogout = () => {
      queryClient.clear();
      logout();
      router.replace("/");
    };
    window.addEventListener("breadtrans:logout", handleLogout);
    return () => window.removeEventListener("breadtrans:logout", handleLogout);
  }, [logout, queryClient, router, user]);

  if (!isReady || !user || user.role !== "STUDENT") return null;

  return (
    <div className="min-h-[100dvh] bg-[#fbfaf8] text-slate-800 antialiased selection:bg-amber-600 selection:text-white font-['Quicksand',sans-serif]">
      <AppHeader />
      <main className="mx-auto min-h-[calc(100dvh-72px)] w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
      <FloatingAiTutor />
    </div>
  );
}
