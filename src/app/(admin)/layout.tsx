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
  Activity,
  CreditCard,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const FloatingAiTutor = dynamic(() => import("@/components/FloatingAiTutor"), { ssr: false });
import { AppFooter } from "@/components/navigation/AppFooter";

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles?: ("ADMIN")[];
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { id: "costs", href: "/admin/costs", label: "Quản lý Chi Phí (Cloud)", icon: Activity },
  { id: "payments", href: "/admin/payments", label: "Thanh toán", icon: CreditCard, roles: ["ADMIN"] },
  { id: "courses", href: "/admin/courses", label: "Khóa học & Gói học", icon: BookOpen },
  { id: "assignments", href: "/admin/assignments", label: "Bài tập & Chấm điểm", icon: PenTool },
  { id: "vocab", href: "/admin/vocab", label: "Từ vựng (Flashcard)", icon: Layers },
  { id: "grammar", href: "/admin/grammar", label: "Ngữ pháp (Video)", icon: GraduationCap },
  { id: "practice", href: "/admin/practice", label: "Luyện tập (Bánh mì)", icon: Gamepad2 },
  { id: "speaking", href: "/admin/speaking", label: "Luyện phát âm", icon: Mic },
  { id: "quizzes", href: "/admin/quizzes", label: "Đề thi & Quiz", icon: PenTool },
  { id: "market", href: "/admin/market", label: "Vật phẩm Market", icon: ShoppingBag },
  { id: "currency", href: "/admin/currency", label: "Giao dịch Bánh Mì", icon: Coins },
  { id: "ai", href: "/admin/ai-tools", label: "Công cụ tạo đề (PDF, Tự động)", icon: FileText },
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
    if (isReady && (!user || user.role !== 'ADMIN')) {
      router.push("/");
    }
  }, [isReady, user, router]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileNavOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isReady || !user) return null;

  const sidebarNav = (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 p-6 text-2xl font-bold text-slate-900">
          <div className="flex items-center gap-2">
            <Link href="/admin" onClick={() => setIsMobileNavOpen(false)}>
              <Image src="/logo.png" alt="BreadTrans Logo" width={130} height={60} priority style={{ width: "auto", height: "auto" }} className="max-h-8 object-contain" />
            </Link>
            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-black text-junior-blue">CMS</span>
          </div>
          <button
            onClick={() => setIsMobileNavOpen(false)}
            className="cursor-pointer p-1 text-slate-500 hover:text-slate-900 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-180px)]">
          {NAV_ITEMS.filter(
            (item) =>
              !item.roles ||
              (user && item.roles.includes(user.role as "ADMIN"))
          ).map((item) => {
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
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-slate-200 p-4">
        <div className="mb-3 truncate px-2 text-xs font-bold text-slate-500">
           {user?.email}
        </div>
        <button 
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-100 p-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut size={16} /> Đăng xuất
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden text-slate-800">
      {/* Desktop Sidebar (lg+) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white text-slate-700 lg:flex">
        {sidebarNav}
      </aside>

      {/* Mobile Drawer (< lg) */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-[60] flex">
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
              className="relative z-10 flex h-full w-72 max-w-[80vw] flex-col justify-between bg-white text-slate-700 shadow-2xl"
            >
              {sidebarNav}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 text-slate-900 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="cursor-pointer rounded-xl bg-slate-100 p-1.5 text-slate-600 hover:text-slate-900"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">BreadTrans CMS</span>
            </div>
          </div>
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-junior-blue">
            Admin
          </span>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 min-w-0 overflow-y-auto flex flex-col justify-between">
          <div className="p-4 md:p-8 flex-1 min-w-0">
            {children}
          </div>
          <AppFooter />
        </div>
      </main>

      {/* FLOATING SUPPORT ASSISTANT */}
      <FloatingAiTutor />
    </div>
  );
}
