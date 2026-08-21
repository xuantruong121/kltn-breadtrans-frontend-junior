"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  LayoutDashboard, 
  Users, 
  PenTool, 
  LogOut, 
  FileText, 
  GraduationCap, 
  ShoppingBag, 
  Coins,
  BookOpen,
  Layers,
  Gamepad2,
  Mic,
  Menu,
  X,
  Activity
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const FloatingAiTutor = dynamic(() => import("@/components/FloatingAiTutor"), { ssr: false });

const NAV_ITEMS = [
  { id: "overview", href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { id: "costs", href: "/admin/costs", label: "Quản lý Chi Phí (Cloud)", icon: Activity },
  { id: "courses", href: "/admin/courses", label: "Khóa học & Lớp", icon: BookOpen },
  { id: "vocab", href: "/admin/vocab", label: "Từ vựng (Flashcard)", icon: Layers },
  { id: "grammar", href: "/admin/grammar", label: "Ngữ pháp (Video)", icon: GraduationCap },
  { id: "practice", href: "/admin/practice", label: "Luyện tập (Bánh mì)", icon: Gamepad2 },
  { id: "speaking", href: "/admin/speaking", label: "Luyện phát âm AI", icon: Mic },
  { id: "quizzes", href: "/admin/quizzes", label: "Đề thi & Quiz", icon: PenTool },
  { id: "market", href: "/admin/market", label: "Vật phẩm Market", icon: ShoppingBag },
  { id: "currency", href: "/admin/currency", label: "Giao dịch Bánh Mì", icon: Coins },
  { id: "ai", href: "/admin/ai-tools", label: "Công cụ AI (PDF, Sinh đề)", icon: FileText },
  { id: "users", href: "/admin/users", label: "Người dùng", icon: Users },
];

const emptySubscribe = () => () => {};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleLogout = () => {
    queryClient.clear();
    logout();
    router.push("/");
  };

  const isReady = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (isReady && (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER'))) {
      router.push("/");
    }
  }, [isReady, user, router]);

  if (!isReady || !user) return null;

  const sidebarNav = (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="p-6 text-2xl font-bold text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/admin" onClick={() => setIsMobileNavOpen(false)}>
              <Image src="/logo.png" alt="BreadTrans Logo" width={130} height={60} priority style={{ width: "auto", height: "auto" }} className="object-contain brightness-0 invert max-h-8" />
            </Link>
            <span className="text-sky-300 text-xs bg-blue-900/50 px-2 py-0.5 rounded font-black">CMS</span>
          </div>
          <button
            onClick={() => setIsMobileNavOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-180px)]">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/admin" 
              ? pathname === "/admin" 
              : pathname.startsWith(item.href);
              
            return (
              <Link 
                key={item.id} 
                href={item.href}
                onClick={() => setIsMobileNavOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-slate-800">
        <div className="mb-3 truncate px-2 text-xs text-slate-400 font-bold">
           {user?.email}
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-2.5 bg-slate-800 hover:bg-red-500 hover:text-white text-slate-300 rounded-xl transition-colors text-xs font-bold cursor-pointer"
        >
          <LogOut size={16} /> Đăng xuất
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden text-slate-800">
      {/* Desktop Sidebar (lg+) */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col shrink-0">
        {sidebarNav}
      </aside>

      {/* Mobile Drawer (< lg) */}
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
              className="relative w-72 max-w-[80vw] bg-slate-900 text-slate-300 h-full z-10 shadow-2xl flex flex-col justify-between"
            >
              {sidebarNav}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">BreadTrans CMS</span>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded border border-blue-700">
            Admin
          </span>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* FLOATING SUPPORT ASSISTANT */}
      <FloatingAiTutor />
    </div>
  );
}
