"use client";

import { useState, useEffect } from "react";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Home, BookOpen, Gamepad2, Trophy, LogOut, Sparkles, UserCircle, Rocket } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import dynamic from "next/dynamic";
const FloatingAiTutor = dynamic(() => import("@/components/FloatingAiTutor"), { ssr: false });

const NAV_ITEMS = [
  { id: "dashboard", href: "/dashboard", label: "Trang chủ", icon: Home, color: "text-junior-blue" },
  { id: "courses", href: "/courses", label: "Lớp học", icon: BookOpen, color: "text-junior-green" },
  { id: "practice", href: "/practice", label: "Luyện tập", icon: Gamepad2, color: "text-purple-500" },
  { id: "arena", href: "/arena", label: "Đấu trường", icon: Trophy, color: "text-junior-orange" },
  { id: "profile", href: "/student/profile", label: "Hồ sơ cá nhân", icon: UserCircle, color: "text-blue-500" },
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
    router.push("/");
  };

  if (!isReady || !user) return null;

  return (
    <div className="flex h-[100dvh] bg-sky-50 overflow-hidden">
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r-4 border-slate-200 p-6 z-20 shadow-sm relative">
        <Link href="/dashboard" className="group flex items-center gap-3 mb-12 cursor-pointer">
          <div className="relative flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-orange-400 to-rose-400 rounded-2xl text-white shadow-lg shadow-orange-200 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
            <Rocket size={24} className="relative z-10" />
            <div className="absolute inset-0 bg-white/20 rounded-2xl blur-md"></div>
          </div>
          <span className="font-extrabold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-rose-500 tracking-tight">
            BreadTrans
          </span>
        </Link>

        <nav className="flex-1 flex flex-col gap-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.id} href={item.href}>
                <motion.div
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl font-bold text-lg transition-colors ${
                    isActive 
                      ? "bg-sky-100 text-junior-blue border-2 border-sky-300" 
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <item.icon className={isActive ? item.color : "text-slate-400"} size={28} strokeWidth={2.5} />
                  {item.label}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Mini */}
        <div className="mt-auto pt-6 border-t-4 border-slate-100">
          <div className="flex items-center gap-3 mb-4 bg-orange-50 p-3 rounded-2xl border-2 border-orange-100">
             {user.profile?.avatar ? (
               <img src={user.profile.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-orange-200" />
             ) : (
               <UserCircle size={40} className="text-junior-orange" />
             )}
             <div className="overflow-hidden">
               <p className="font-bold text-slate-800 truncate text-sm">{user.profile?.fullName || user.email}</p>
               <p className="text-xs font-bold text-junior-orange uppercase">Học sinh</p>
             </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-3 text-slate-500 font-bold hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"
          >
            <LogOut size={20} /> Thoát
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Floating Header for Mobile */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b-4 border-slate-200 z-20">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-orange-400 to-rose-400 rounded-lg text-white shadow-md shadow-orange-200">
              <Rocket size={16} className="relative z-10" />
            </div>
            <span className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-rose-500 tracking-tight">
              BreadTrans
            </span>
          </Link>
          <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-500">
            <LogOut size={24} />
          </button>
        </header>

        {/* Page Content with scroll */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* BOTTOM NAV (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-slate-200 flex justify-around p-3 pb-safe z-30">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.id} href={item.href} className="flex-1 flex flex-col items-center gap-1">
              <div className={`p-2 rounded-2xl ${isActive ? "bg-sky-100" : ""}`}>
                <item.icon className={isActive ? item.color : "text-slate-400"} size={28} />
              </div>
              <span className={`text-[10px] font-bold ${isActive ? "text-junior-blue" : "text-slate-500"}`}>
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
