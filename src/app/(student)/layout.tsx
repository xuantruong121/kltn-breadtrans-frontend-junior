"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  Home, 
  BookOpen, 
  Gamepad2, 
  Trophy, 
  LogOut, 
  Sparkles, 
  UserCircle, 
  ShoppingBag,
  GraduationCap,
  Flame,
  Layers,
  Film
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { GamificationBar } from "@/components/ui";
import dynamic from "next/dynamic";

const FloatingAiTutor = dynamic(() => import("@/components/FloatingAiTutor"), { ssr: false });

const NAV_ITEMS = [
  { id: "dashboard", href: "/dashboard", label: "Trang chủ", icon: Home, color: "text-sky-500", bgActive: "bg-sky-100 border-sky-300 text-sky-600" },
  { id: "flashcard", href: "/flashcard", label: "Flashcard", icon: Layers, color: "text-amber-500", bgActive: "bg-amber-100 border-amber-300 text-amber-700" },
  { id: "grammar", href: "/grammar", label: "Ngữ pháp", icon: GraduationCap, color: "text-emerald-500", bgActive: "bg-emerald-100 border-emerald-300 text-emerald-700" },
  { id: "learn", href: "/learn", label: "Phim & Nhạc", icon: Film, color: "text-red-500", bgActive: "bg-red-100 border-red-300 text-red-700" },
  { id: "practice", href: "/practice", label: "Luyện tập", icon: Gamepad2, color: "text-purple-500", bgActive: "bg-purple-100 border-purple-300 text-purple-700" },
  { id: "classes", href: "/classes", label: "Lớp học", icon: BookOpen, color: "text-blue-500", bgActive: "bg-blue-100 border-blue-300 text-blue-700" },
  { id: "arena", href: "/arena", label: "Đấu trường", icon: Trophy, color: "text-orange-500", bgActive: "bg-orange-100 border-orange-300 text-orange-700" },
  { id: "market", href: "/market", label: "Cửa hàng", icon: ShoppingBag, color: "text-rose-500", bgActive: "bg-rose-100 border-rose-300 text-rose-700" },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setIsReady(true));
    if (useAuthStore.persist.hasHydrated()) {
      setIsReady(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (isReady && (!user || user.role !== 'STUDENT')) {
      router.push("/");
    }
  }, [isReady, user, router]);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  if (!isReady || !user) return null;

  return (
    <div className="flex h-[100dvh] bg-sky-50 overflow-hidden font-sans">
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r-4 border-slate-200 p-5 z-20 shadow-sm relative">
        <Link href="/dashboard" className="group flex items-center gap-3 mb-6 cursor-pointer">
          <Image 
            src="/logo.png" 
            alt="BreadTrans Logo" 
            width={160} 
            height={80} 
            priority 
            style={{ width: "auto", height: "auto" }} 
            className="object-contain drop-shadow-sm group-hover:scale-105 transition-transform" 
          />
        </Link>

        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.id} href={item.href}>
                <motion.div
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl font-bold text-base transition-all select-none ${
                    isActive 
                      ? `${item.bgActive} border-2 shadow-sm font-extrabold` 
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <item.icon className={isActive ? item.color : "text-slate-400"} size={22} strokeWidth={2.5} />
                  {item.label}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Mini */}
        <div className="mt-auto pt-4 border-t-4 border-slate-100">
          <Link href="/student/profile">
            <div className="flex items-center gap-3 mb-3 bg-orange-50 hover:bg-orange-100 p-2.5 rounded-2xl border-2 border-orange-200 transition-colors cursor-pointer">
              {user.profile?.avatar ? (
                <img src={user.profile.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-orange-300" />
              ) : (
                <UserCircle size={38} className="text-orange-500" />
              )}
              <div className="overflow-hidden flex-1">
                <p className="font-bold text-slate-800 truncate text-sm">{user.profile?.fullName || user.email}</p>
                <p className="text-[11px] font-extrabold text-orange-600 uppercase">Học sinh</p>
              </div>
            </div>
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-slate-400 font-bold hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-colors text-sm"
          >
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header with Gamification Bar */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b-4 border-slate-200 z-20 shadow-xs">
          <div className="lg:hidden flex items-center gap-2">
            <Link href="/dashboard">
              <Image src="/logo.png" alt="Logo" width={110} height={50} priority style={{ width: "auto", height: "auto" }} className="object-contain" />
            </Link>
          </div>

          <div className="hidden lg:block text-slate-400 font-bold text-sm">
            {NAV_ITEMS.find(n => pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href)))?.label || "Học tập"}
          </div>

          {/* Gamification Bar (Bread, Streak, Level) */}
          <GamificationBar />

          <div className="lg:hidden flex items-center gap-2">
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500">
              <LogOut size={22} />
            </button>
          </div>
        </header>

        {/* Page Content with scroll */}
        <div className="flex-1 overflow-y-auto p-4 pb-28 md:p-8 md:pb-8">
          {children}
        </div>
      </main>

      {/* BOTTOM NAV (Mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-slate-200 flex justify-around px-2 py-2 pb-safe z-30 shadow-lg">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.id} href={item.href} className="flex-1 flex flex-col items-center gap-0.5">
              <div className={`p-2 rounded-2xl transition-transform ${isActive ? "bg-sky-100 scale-110" : ""}`}>
                <item.icon className={isActive ? item.color : "text-slate-400"} size={22} strokeWidth={2.5} />
              </div>
              <span className={`text-[10px] font-bold truncate ${isActive ? "text-sky-600 font-black" : "text-slate-500"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Floating AI Tutor */}
      <FloatingAiTutor />
    </div>
  );
}
