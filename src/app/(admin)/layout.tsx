"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/brand";
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
  CreditCard,
  UserPlus,
  Cpu,
  Activity,
  Flag,
  ChevronDown,
  BookMarked,
  Settings,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const FloatingAiTutor = dynamic(() => import("@/components/FloatingAiTutor"), {
  ssr: false,
});

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles?: "ADMIN"[];
}

interface NavCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: NavItem[];
}

const OVERVIEW_ITEM: NavItem = {
  id: "overview",
  href: "/admin",
  label: "Tổng quan",
  icon: LayoutDashboard,
};

const NAV_GROUPS: NavCategory[] = [
  {
    id: "courses-group",
    title: "Đào Tạo & Khóa Học",
    icon: GraduationCap,
    items: [
      {
        id: "courses",
        href: "/admin/courses",
        label: "Khóa học & Gói học",
        icon: BookOpen,
      },
      {
        id: "practice",
        href: "/admin/practice",
        label: "Chủ đề luyện tập",
        icon: Gamepad2,
      },
      {
        id: "assignments",
        href: "/admin/assignments",
        label: "Bài tập & Chấm điểm",
        icon: PenTool,
      },
    ],
  },
  {
    id: "content-group",
    title: "Kho Học Liệu & Kỹ Năng",
    icon: BookMarked,
    items: [
      {
        id: "vocab",
        href: "/admin/vocab",
        label: "Từ vựng (Flashcard)",
        icon: Layers,
      },
      {
        id: "grammar",
        href: "/admin/grammar",
        label: "Ngữ pháp",
        icon: GraduationCap,
      },
      {
        id: "speaking",
        href: "/admin/speaking",
        label: "Luyện phát âm",
        icon: Mic,
      },
      {
        id: "quizzes",
        href: "/admin/quizzes",
        label: "Đề thi & Trắc nghiệm",
        icon: FileText,
      },
    ],
  },
  {
    id: "users-group",
    title: "Học Viên & Doanh Thu",
    icon: Users,
    items: [
      {
        id: "users",
        href: "/admin/users",
        label: "Quản lý người dùng",
        icon: Users,
      },
      {
        id: "enroll",
        href: "/admin/enroll",
        label: "Quyền vào khóa học",
        icon: UserPlus,
      },
      {
        id: "payments",
        href: "/admin/payments",
        label: "Thanh toán gói học",
        icon: CreditCard,
        roles: ["ADMIN"],
      },
    ],
  },
  {
    id: "market-group",
    title: "Thương Mại & Gamification",
    icon: ShoppingBag,
    items: [
      {
        id: "market",
        href: "/admin/market",
        label: "Cửa hàng đổi quà",
        icon: ShoppingBag,
      },
      {
        id: "currency",
        href: "/admin/currency",
        label: "Sổ Bánh Mì (Coin)",
        icon: Coins,
      },
    ],
  },
  {
    id: "system-group",
    title: "Vận Hành & Hệ Thống",
    icon: Settings,
    items: [
      {
        id: "issue-reports",
        href: "/admin/issue-reports",
        label: "Báo cáo lỗi",
        icon: Flag,
      },
      {
        id: "ai",
        href: "/admin/ai-tools",
        label: "Soạn nội dung AI",
        icon: Cpu,
      },
      {
        id: "costs",
        href: "/admin/costs",
        label: "Chi phí & Hiệu năng",
        icon: Activity,
      },
    ],
  },
];

const emptySubscribe = () => () => {};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // User manual collapsed state; default is all open (!collapsedGroups[group.id])
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleLogout = () => {
    queryClient.clear();
    logout();
    router.push("/");
  };

  const isReady = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (isReady && (!user || user.role !== "ADMIN")) {
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

  const isOverviewActive = pathname === "/admin";

  const sidebarNav = (
    <div className="flex flex-col h-full justify-between">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between border-b border-slate-200 p-6 shrink-0">
          <BrandLogo
            href="/admin"
            onClick={() => setIsMobileNavOpen(false)}
            variant="admin"
            size="md"
          />
          <button
            onClick={() => setIsMobileNavOpen(false)}
            className="cursor-pointer p-1 text-slate-500 hover:text-slate-900 lg:hidden"
            aria-label="Đóng thanh điều hướng"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-3 flex flex-col gap-1.5 overflow-y-auto flex-1 min-h-0">
          {/* Standalone Tổng quan Link */}
          <Link
            href={OVERVIEW_ITEM.href}
            onClick={() => setIsMobileNavOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              isOverviewActive
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <OVERVIEW_ITEM.icon size={18} className={isOverviewActive ? "text-white" : "text-slate-500"} />
            <span>{OVERVIEW_ITEM.label}</span>
          </Link>

          <div className="h-px bg-slate-200/80 my-1 mx-2 shrink-0" />

          {/* Categorized Dropdowns */}
          {NAV_GROUPS.map((group) => {
            const filteredItems = group.items.filter(
              (item) =>
                !item.roles ||
                (user && item.roles.includes(user.role as "ADMIN")),
            );
            if (filteredItems.length === 0) return null;

            const isGroupActive = filteredItems.some((item) =>
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href),
            );
            const isOpen = !collapsedGroups[group.id];

            return (
              <div key={group.id} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer select-none ${
                    isGroupActive
                      ? "text-blue-700 bg-blue-50/70 hover:bg-blue-50"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <group.icon
                      size={16}
                      className={isGroupActive ? "text-blue-600 shrink-0" : "text-slate-400 shrink-0"}
                    />
                    <span className="truncate uppercase tracking-wider text-[11px] font-bold text-left">
                      {group.title}
                    </span>
                    {isGroupActive && (
                      <span className="size-1.5 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key={`content-${group.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 pl-3.5 border-l-2 border-slate-200/80 space-y-1 pt-1 pb-1">
                        {filteredItems.map((item) => {
                          const isActive =
                            item.href === "/admin"
                              ? pathname === "/admin"
                              : pathname.startsWith(item.href);

                          return (
                            <Link
                              key={item.id}
                              href={item.href}
                              onClick={() => setIsMobileNavOpen(false)}
                              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                isActive
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                            >
                              <item.icon
                                size={15}
                                className={isActive ? "text-white shrink-0" : "text-slate-400 shrink-0"}
                              />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-slate-200 p-4 shrink-0">
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
    <div
      data-theme="light"
      className="light flex h-[100dvh] bg-slate-50 overflow-hidden text-slate-800"
    >
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
              <span className="text-sm font-bold text-slate-900">
                BreadTrans CMS
              </span>
            </div>
          </div>
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-junior-blue">
            Admin
          </span>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-4 md:p-8 flex-1 min-w-0">{children}</div>
        </div>
      </main>

      {/* FLOATING SUPPORT ASSISTANT */}
      <FloatingAiTutor />
    </div>
  );
}
