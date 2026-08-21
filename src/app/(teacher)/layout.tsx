"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Users, BookOpen, PenTool, LogOut, Menu, X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useSyncExternalStore, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const FloatingAiTutor = dynamic(() => import("@/components/FloatingAiTutor"), { ssr: false });

const NAV_ITEMS = [
  { id: "classes", href: "/teacher/classes", label: "Lớp học của tôi", icon: Users },
  { id: "assignments", href: "/teacher/assignments", label: "Chấm điểm", icon: PenTool },
  { id: "materials", href: "/teacher/materials", label: "Học liệu", icon: BookOpen },
  { id: "profile", href: "/teacher/profile", label: "Hồ sơ cá nhân", icon: Users },
];

const emptySubscribe = () => () => {};

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  
  const isReady = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (isReady && (!user || user.role !== 'TEACHER')) {
      router.push("/");
    }
  }, [isReady, user, router]);

  if (!isReady || !user) return null;

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full">
      <div>
        {/* Logo */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <Link href="/" onClick={() => setIsMobileNavOpen(false)} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
              <Image 
                src="/logo.png" 
                alt="Logo" 
                width={24} 
                height={24} 
                style={{ width: "auto", height: "auto" }} 
                className="rounded-md object-contain max-h-6" 
              />
            </div>
            <span className="font-bold text-white text-lg tracking-wide">BreadTrans</span>
          </Link>
          <button 
            onClick={() => setIsMobileNavOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsMobileNavOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
                  isActive 
                    ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile & logout */}
      <div className="p-4 border-t border-slate-800 space-y-4">
        <div className="flex items-center gap-3 px-2">
          {user.profile?.avatar ? (
            <img 
              src={user.profile.avatar} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full object-cover border border-slate-700" 
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center">
              {user.email[0].toUpperCase()}
            </div>
          )}
          <div className="overflow-hidden">
            <p className="text-sm text-white font-medium truncate">{user.profile?.fullName || user.email}</p>
            <p className="text-xs text-slate-500">Giáo viên</p>
          </div>
        </div>
        <button 
          onClick={() => { logout(); router.push('/'); }}
          className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
        >
          <LogOut size={20} /> Đăng xuất
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar (lg+) */}
      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col justify-between shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Navigation (< lg) */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileNavOpen(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="relative w-72 max-w-[80vw] bg-slate-900 h-full z-10 shadow-2xl flex flex-col justify-between"
            >
              {sidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Mở menu"
            >
              <Menu size={22} />
            </button>
            <h2 className="font-bold text-slate-800 text-base md:text-lg">
              {NAV_ITEMS.find(n => pathname.startsWith(n.href))?.label || "Giáo viên"}
            </h2>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
            <span className="hidden sm:inline bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
              Cổng Giảng Dạy
            </span>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 text-slate-800">
          {children}
        </div>
      </main>

      {/* FLOATING SUPPORT ASSISTANT */}
      <FloatingAiTutor />
    </div>
  );
}
