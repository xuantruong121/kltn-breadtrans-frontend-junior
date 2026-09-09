"use client";

import { useEffect, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/navigation/AppHeader";
import { AppFooter } from "@/components/navigation/AppFooter";
import { BackToTop } from "@/components/navigation/BackToTop";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { userService } from "@/lib/api/services/user.service";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";

const FloatingAiTutor = dynamic(() => import("@/components/FloatingAiTutor"), { ssr: false });
const emptySubscribe = () => () => {};

function isGuestAllowedRoute(pathname: string): boolean {
  const guestPrefixes = [
    "/market",
    "/arena",
    "/practice",
    "/flashcard",
    "/grammar",
    "/learn",
    "/diagnostic",
    "/vocabulary",
  ];
  return guestPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const setStats = useGamificationStore((state) => state.setStats);
  const isReady = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const isGuestAllowed = isGuestAllowedRoute(pathname);

  const { data: learningStats } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: userService.getStats,
    enabled: isReady && user?.role === "STUDENT",
    staleTime: 60_000,
  });

  useEffect(() => {
    if (isReady && (!user || user.role !== "STUDENT") && !isGuestAllowed) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isReady, user, router, pathname, isGuestAllowed]);

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

  useEffect(() => {
    if (!learningStats) return;
    setStats({
      breads: learningStats.totalBanhRan,
      streak: learningStats.streakCount,
      exp: learningStats.weeklyExp,
    });
  }, [learningStats, setStats]);

  if (!isReady) return null;
  if ((!user || user.role !== "STUDENT") && !isGuestAllowed) return null;

  const isSpeakingPage = pathname.startsWith("/practice/speaking");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#fbfaf8] text-slate-800 antialiased selection:bg-amber-600 selection:text-white font-['Quicksand',sans-serif]">
      <AppHeader />
      <main
        className={`mx-auto flex-1 min-w-0 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10 2xl:px-12 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8 ${
          isSpeakingPage ? "max-w-[1820px]" : "max-w-7xl sm:py-8"
        }`}
      >
        {children}
      </main>
      <AppFooter />
      <BackToTop />
      {user && <FloatingAiTutor />}
      <MobileBottomNav />
    </div>
  );
}
