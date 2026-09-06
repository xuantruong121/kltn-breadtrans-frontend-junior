"use client";

import { useState, useSyncExternalStore, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  BookOpen, 
  Trophy, 
  LogOut, 
  ShoppingBag,
  GraduationCap,
  Layers,
  Film,
  MoreHorizontal,
  X,
  ChevronRight,
  Headphones,
  BookOpenCheck,
  Mic,
  PenTool,
  BookmarkCheck
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { GamificationBar, UserAvatarWithFrame } from "@/components/ui";
import dynamic from "next/dynamic";

const FloatingAiTutor = dynamic(() => import("@/components/FloatingAiTutor"), { ssr: false });

const NAV_ITEMS = [
  { id: "dashboard", href: "/dashboard", label: "Trang chủ", icon: Home, color: "text-sky-500", bgActive: "bg-sky-100 border-sky-300 text-sky-600" },
  { id: "my-courses", href: "/my-courses", label: "Khóa học của tôi", icon: BookmarkCheck, color: "text-cyan-600", bgActive: "bg-cyan-100 border-cyan-300 text-cyan-700" },
  { id: "classes", href: "/classes", label: "Lớp học", icon: BookOpen, color: "text-blue-500", bgActive: "bg-blue-100 border-blue-300 text-blue-700" },
  { id: "listening", href: "/practice/quizzes", label: "Luyện Nghe", icon: Headphones, color: "text-indigo-500", bgActive: "bg-indigo-100 border-indigo-300 text-indigo-700" },
  { id: "reading", href: "/practice/reading", label: "Luyện Đọc", icon: BookOpenCheck, color: "text-emerald-500", bgActive: "bg-emerald-100 border-emerald-300 text-emerald-700" },
  { id: "speaking", href: "/practice/speaking", label: "Luyện Nói (AI)", icon: Mic, color: "text-purple-500", bgActive: "bg-purple-100 border-purple-300 text-purple-700" },
  { id: "writing", href: "/practice/writing", label: "Luyện Viết", icon: PenTool, color: "text-rose-500", bgActive: "bg-rose-100 border-rose-300 text-rose-700" },
  { id: "flashcard", href: "/flashcard", label: "Flashcard & Từ vựng", icon: Layers, color: "text-amber-500", bgActive: "bg-amber-100 border-amber-300 text-amber-700" },
  { id: "grammar", href: "/grammar", label: "Ngữ pháp", icon: GraduationCap, color: "text-teal-500", bgActive: "bg-teal-100 border-teal-300 text-teal-700" },
  { id: "learn", href: "/learn", label: "Phim & Nhạc", icon: Film, color: "text-red-500", bgActive: "bg-red-100 border-red-300 text-red-700" },
  { id: "arena", href: "/arena", label: "Đấu trường", icon: Trophy, color: "text-orange-500", bgActive: "bg-orange-100 border-orange-300 text-orange-700" },
  { id: "market", href: "/market", label: "Cửa hàng", icon: ShoppingBag, color: "text-pink-500", bgActive: "bg-pink-100 border-pink-300 text-pink-700" },
];

const MAIN_MOBILE_TABS = [
  { id: "dashboard", href: "/dashboard", label: "Trang chủ", icon: Home, color: "text-sky-500" },
  { id: "speaking", href: "/practice/speaking", label: "Luyện Nói", icon: Mic, color: "text-purple-500" },
  { id: "flashcard", href: "/flashcard", label: "Flashcard", icon: Layers, color: "text-amber-500" },
  { id: "classes", href: "/classes", label: "Lớp học", icon: BookOpen, color: "text-blue-500" },
];

const emptySubscribe = () => () => {};

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isReady = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (isReady && (!user || user.role !== 'STUDENT')) {
      router.push("/");
    }
  }, [isReady, user, router]);

  const handleLogout = () => {
    queryClient.clear();
    logout();
    router.push("/");
  };

  if (!isReady || !user) return null;

  return (
    <div className="flex h-[100dvh] bg-sky-50 overflow-hidden font-sans">
      {/* SIDEBAR (Desktop lg+) */}
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

        {/* NAVIGATION LINKS */}
        <nav className="space-y-2 flex-1 overflow-y-auto pr-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link key={item.id} href={item.href}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all border-2 ${
                    isActive 
                      ? `${item.bgActive} shadow-[0_4px_0_0_rgba(0,0,0,0.08)]` 
                      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  <Icon size={22} className={isActive ? "" : item.color} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-sm tracking-wide">{item.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Mini */}
        <div className="mt-auto pt-4 border-t-4 border-slate-100">
          <Link href="/student/profile">
            <div className="flex items-center gap-3 mb-3 bg-orange-50 hover:bg-orange-100 p-2.5 rounded-2xl border-2 border-orange-200 transition-colors cursor-pointer">
              <UserAvatarWithFrame
                avatarUrl={user.profile?.avatar}
                name={user.profile?.fullName || user.email}
                size="md"
                showBadge={true}
              />
              <div className="overflow-hidden flex-1">
                <p className="font-bold text-slate-800 truncate text-sm">{user.profile?.fullName || user.email}</p>
                <p className="text-[11px] font-extrabold text-orange-600 uppercase">Học sinh</p>
              </div>
            </div>
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-slate-400 font-bold hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-colors text-sm cursor-pointer"
          >
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header with Gamification Bar */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white border-b-4 border-slate-200 z-20 shadow-xs">
          <div className="lg:hidden flex items-center gap-2">
            <Link href="/dashboard">
              <Image src="/logo.png" alt="Logo" width={95} height={42} priority style={{ width: "auto", height: "auto" }} className="object-contain max-h-9" />
            </Link>
          </div>

          <div className="hidden lg:block text-slate-400 font-bold text-sm">
            {NAV_ITEMS.find(n => pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href)))?.label || "Học tập"}
          </div>

          {/* Gamification Bar (Bread, Streak, Level) */}
          <GamificationBar />

          <div className="lg:hidden flex items-center gap-1">
            <Link href="/student/profile">
              <div className="p-1 rounded-xl">
                <UserAvatarWithFrame
                  avatarUrl={user.profile?.avatar}
                  name={user.profile?.fullName || user.email}
                  size="sm"
                  showBadge={true}
                />
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content with scroll and safe padding for mobile bottom bar */}
        <div className="flex-1 overflow-y-auto p-4 pb-28 md:p-8 md:pb-8">
          {children}
        </div>
      </main>

      {/* BOTTOM NAV (Mobile < lg) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-slate-200 flex justify-around px-2 py-2 pb-safe z-30 shadow-lg">
        {MAIN_MOBILE_TABS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.id} href={item.href} className="flex-1 flex flex-col items-center gap-0.5">
              <div className={`p-1.5 sm:p-2 rounded-2xl transition-transform ${isActive ? "bg-sky-100 scale-105" : ""}`}>
                <item.icon className={isActive ? item.color : "text-slate-400"} size={20} strokeWidth={2.5} />
              </div>
              <span className={`text-[10px] font-bold truncate ${isActive ? "text-sky-600 font-black" : "text-slate-500"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* MORE BUTTON */}
        <button
          onClick={() => setIsMoreOpen(true)}
          className="flex-1 flex flex-col items-center gap-0.5 cursor-pointer"
        >
          <div className={`p-1.5 sm:p-2 rounded-2xl transition-transform ${isMoreOpen ? "bg-orange-100 scale-105" : ""}`}>
            <MoreHorizontal className={isMoreOpen ? "text-orange-600" : "text-slate-400"} size={20} strokeWidth={2.5} />
          </div>
          <span className={`text-[10px] font-bold truncate ${isMoreOpen ? "text-orange-600 font-black" : "text-slate-500"}`}>
            Thêm
          </span>
        </button>
      </nav>

      {/* MOBILE MORE DRAWER / SHEET */}
      <AnimatePresence>
        {isMoreOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="absolute inset-0"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-white rounded-t-[2.5rem] border-t-4 border-slate-200 shadow-2xl p-6 pb-10 max-h-[85vh] overflow-y-auto space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌟</span>
                  <h3 className="text-lg font-black text-slate-800">Tất Cả Tính Năng</h3>
                </div>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* User Profile Snippet */}
              <Link href="/student/profile" onClick={() => setIsMoreOpen(false)}>
                <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatarWithFrame
                      avatarUrl={user.profile?.avatar}
                      name={user.profile?.fullName || user.email}
                      size="md"
                      showBadge={true}
                    />
                    <div>
                      <p className="font-black text-slate-800 text-sm">{user.profile?.fullName || user.email}</p>
                      <p className="text-[11px] font-bold text-sky-600">Xem hồ sơ & thành tích →</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-sky-400" />
                </div>
              </Link>

              {/* Menu Grid */}
              <div className="grid grid-cols-2 gap-3">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setIsMoreOpen(false)}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                        isActive
                          ? `${item.bgActive} border-2 shadow-xs font-black`
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 font-bold"
                      }`}
                    >
                      <item.icon size={22} className={item.color} />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full py-3 bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-rose-600 font-black rounded-2xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer"
              >
                <LogOut size={18} /> Đăng xuất tài khoản
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating AI Tutor */}
      <FloatingAiTutor />
    </div>
  );
}
