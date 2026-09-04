"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Menu, LayoutDashboard, Calendar, UserCheck, FileText, FolderKanban, BookOpen, GraduationCap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useSyncExternalStore, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const FloatingAiTutor = dynamic(() => import("@/components/FloatingAiTutor"), { ssr: false });

const NAV_ITEMS = [
  { id: "dashboard", href: "/teacher/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { id: "courses", href: "/teacher/courses", label: "Khóa học của tôi", icon: GraduationCap },
  { id: "classes", href: "/teacher/classes", label: "Lớp học phụ trách", icon: BookOpen },
  { id: "schedule", href: "/teacher/schedule", label: "Thời khóa biểu", icon: Calendar },
  { id: "assignments", href: "/teacher/assignments", label: "Bài tập & Chấm điểm", icon: FileText },
  { id: "materials", href: "/teacher/materials", label: "Kho học liệu", icon: FolderKanban },
  { id: "profile", href: "/teacher/profile", label: "Hồ sơ cá nhân", icon: UserCheck },
];

const emptySubscribe = () => () => {};

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
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

  const handleLogout = () => {
    queryClient.clear();
    logout();
    router.push("/");
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-4">
      {/* Brand */}
      <div>
        <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 font-black text-xl">
            BT
          </div>
          <div>
            <h1 className="font-bold text-white text-lg tracking-tight leading-none">BreadTrans</h1>
            <span className="text-xs font-semibold px-2 py-0.5 mt-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-block">
              TEACHER PORTAL
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsMobileNavOpen(false)}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon size={19} className={isActive ? "text-white" : "text-slate-400"} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile & logout */}
      <div className="pt-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-slate-800/40">
          {user.profile?.avatar ? (
            <img src={user.profile.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-slate-700" />
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
          onClick={handleLogout}
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
      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col shrink-0">
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
