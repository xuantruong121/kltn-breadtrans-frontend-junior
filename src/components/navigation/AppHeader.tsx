"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  CreditCard,
  Crown,
  ChevronDown,
  Dumbbell,
  GraduationCap,
  Headphones,
  Home,
  KeyRound,
  LayoutDashboard,
  Menu,
  Mic,
  PenTool,
  ShoppingBag,
  Target,
  Trophy,
  User,
  X,
  Bell,
  LogOut,
  Flame,
  Heart,
  Loader2,
  CheckCheck,
  Clock,
  MoreHorizontal,
  Layers,
  CircleHelp,
  Lightbulb,
  Activity,
  Sun,
  Moon,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService, NotificationItem } from "@/lib/api/services/notification.service";
import { getNotificationActionLabel, resolveNotificationAction } from "@/lib/notifications/notificationLogic";
import { useTheme } from "@/lib/theme/useTheme";
import { BrandLogo } from "@/components/brand";
import {
  isExamRoute,
  isSkillsRoute,
  isListeningRoute,
  isSpeakingRoute,
  isReadingRoute,
  isWritingRoute,
  isFlashcardRoute,
  isCoursesRoute,
  isMarketRoute,
  isMoreRoute,
} from "./navUtils";
import { ThemeToggle } from "./ThemeToggle";

const emptySubscribe = () => () => {};

function isActivePath(pathname: string, href: string) {
  if (href === "/" || href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatRelativeTime(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { breads, streak, level, exp } = useGamificationStore();
  const { resolvedTheme, toggleTheme } = useTheme();

  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsExpanded, setNotificationsExpanded] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const isReady = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const isDark = isReady ? resolvedTheme === "dark" : false;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setProfileMenuOpen(false);
        setMoreOpen(false);
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onResize);
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMenus = () => {
    setMobileOpen(false);
    setProfileMenuOpen(false);
    setMoreOpen(false);
  };

  const handleLogout = () => {
    queryClient.clear();
    logout();
    closeMenus();
    router.push("/");
  };

  const isStudent = isReady && user?.role === "STUDENT";
  const isAdmin = isReady && user?.role === "ADMIN";
  const isExamPath = isExamRoute(pathname);
  const isSkillsPath = isSkillsRoute(pathname);

  const { data: unreadData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationService.getUnreadCount(),
    enabled: !!user && user.role === "STUDENT",
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count || 0;

  const { data: inboxData, isLoading: isInboxLoading } = useQuery({
    queryKey: ["notifications", "recent", "unread"],
    queryFn: () => notificationService.getInbox(3, undefined, "unread"),
    enabled: !!user && user.role === "STUDENT" && profileMenuOpen,
  });
  const recentNotifications = inboxData?.items || [];

  const markReadMut = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "recent", "unread"] });
    },
  });

  const markAllReadMut = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "recent", "unread"] });
    },
  });

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markReadMut.mutate(item.id);
    }
    const action = resolveNotificationAction(item);
    closeMenus();
    if (action) {
      router.push(action);
    }
  };

  interface HeaderNavLink {
    label: string;
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
    active?: boolean;
    isExam?: boolean;
    iconBg?: string;
    iconColor?: string;
    description?: string;
  }

  // Desktop Navigation Items following exact required logical order:
  // 1. Logo (Home) - rendered via BrandLogo
  // 2. Nghe
  // 3. Nói
  // 4. Đọc (merges Reading and Grammar)
  // 5. Viết
  // 6. Flashcard
  // 7. Luyện đề (Exam Practice: TOEIC & Certificate test hub)
  // 8. Khóa học (unified Course Hub)
  // 9. Cửa hàng
  // 10. ... More (Dropdown containing: Bảng xếp hạng, Liên hệ, Đề xuất)
  const desktopNavLinks = [
    {
      label: "Nghe",
      href: "/listening",
      icon: Headphones,
      active: isListeningRoute(pathname),
      iconColor: "text-sky-500 dark:text-sky-400",
    },
    {
      label: "Nói",
      href: "/speaking",
      icon: Mic,
      active: isSpeakingRoute(pathname),
      iconColor: "text-rose-500 dark:text-rose-400",
    },
    {
      label: "Đọc",
      href: "/reading",
      icon: BookOpen,
      active: isReadingRoute(pathname),
      iconColor: "text-emerald-500 dark:text-emerald-400",
    },
    {
      label: "Viết",
      href: "/writing",
      icon: PenTool,
      active: isWritingRoute(pathname),
      iconColor: "text-violet-500 dark:text-violet-400",
    },
    {
      label: "Flashcard",
      href: "/flashcard",
      icon: Layers,
      active: isFlashcardRoute(pathname),
      iconColor: "text-cyan-500 dark:text-cyan-400",
    },
    {
      label: "Luyện đề",
      href: "/exams",
      icon: Target,
      active: isExamRoute(pathname),
      iconColor: "text-orange-500 dark:text-orange-400",
    },
    {
      label: "Khóa học",
      href: "/courses",
      icon: GraduationCap,
      active: isCoursesRoute(pathname),
      iconColor: "text-indigo-500 dark:text-indigo-400",
    },
    {
      label: "Cửa hàng",
      href: "/market",
      icon: ShoppingBag,
      active: isMarketRoute(pathname),
      iconColor: "text-pink-500 dark:text-pink-400",
    },
  ];

  // The "... More" dropdown contains exactly:
  // 1. Bảng xếp hạng (/arena)
  // 2. Liên hệ (/help)
  // 3. Đề xuất (/help#feedback)
  const moreDropdownItems = [
    {
      label: "Bảng xếp hạng",
      href: "/arena",
      icon: Trophy,
      iconColor: "text-amber-500 dark:text-amber-400",
      description: "Bảng vàng thi đua tuần & tích lũy EXP",
    },
    {
      label: "Liên hệ",
      href: "/help",
      icon: CircleHelp,
      iconColor: "text-sky-500 dark:text-sky-400",
      description: "Trung tâm trợ giúp & email hỗ trợ học tập",
    },
    {
      label: "Đề xuất",
      href: "/help#feedback",
      icon: Lightbulb,
      iconColor: "text-emerald-500 dark:text-emerald-400",
      description: "Đóng góp ý kiến cải tiến nền tảng & bài học",
    },
  ];

  const isMoreActive = isMoreRoute(pathname);

  // Mobile drawer links
  const mobileSecondaryLinks: HeaderNavLink[] = [
    { label: "Flashcard từ vựng", href: "/flashcard", icon: Layers },
    { label: "Luyện đề", href: "/exams", icon: Target, isExam: true },
    { label: "Khóa học", href: "/courses", icon: GraduationCap },
    { label: "Cửa hàng", href: "/market", icon: ShoppingBag },
    { label: "Bảng xếp hạng", href: "/arena", icon: Trophy },
    { label: "Trợ giúp & Liên hệ", href: "/help", icon: CircleHelp },
  ];

  return (
    <header className="sticky top-0 z-[70] w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 shadow-xs">
      <div className="w-full px-3 sm:px-6 lg:px-6 xl:px-8 2xl:px-12 h-16 sm:h-20 flex items-center justify-between gap-1.5 sm:gap-4">
        
        {/* Brand Logo & Role Tag (Item 1: Logo/Home) */}
        <div className="flex items-center shrink-0">
          <BrandLogo
            href={isStudent ? "/dashboard" : "/"}
            onClick={closeMenus}
            variant="compact"
            size="md"
            roleBadge={isAdmin ? "ADMIN" : undefined}
          />
        </div>

        {/* Center Desktop Navigation (Activates at xl: 1280px+ to ensure tablets have ample breathing space) */}
        <nav
          aria-label="Menu chính"
          className="hidden xl:flex items-center justify-center gap-0.5 xl:gap-1 2xl:gap-1.5 text-xs 2xl:text-sm font-bold shrink-0"
        >
          {desktopNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 2xl:py-2 rounded-xl flex items-center gap-1 xl:gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
                link.active
                  ? "text-amber-800 dark:text-amber-400 bg-amber-50/90 dark:bg-amber-950/50 font-black border border-amber-200/60 dark:border-amber-800/60"
                  : "text-slate-600 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-slate-800/60"
              }`}
            >
              <link.icon
                size={16}
                className={`shrink-0 ${link.active ? "" : (link.iconColor ?? "")}`}
              />
              <span className="whitespace-nowrap">{link.label}</span>
            </Link>
          ))}

          {/* 10. ... More Dropdown */}
          <div
            ref={moreRef}
            className="relative flex shrink-0 group"
            onMouseEnter={() => setMoreOpen(true)}
            onMouseLeave={() => setMoreOpen(false)}
          >
            <button
              type="button"
              onClick={() => setMoreOpen((prev) => !prev)}
              aria-label={moreOpen ? "Đóng danh mục mở rộng" : "Mở danh mục mở rộng"}
              aria-expanded={moreOpen}
              aria-controls="more-navigation-menu"
              aria-haspopup="menu"
              className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 2xl:py-2 rounded-xl flex items-center gap-1 xl:gap-1.5 transition-colors shrink-0 whitespace-nowrap font-bold cursor-pointer ${
                isMoreActive
                  ? "text-amber-800 dark:text-amber-400 bg-amber-50/90 dark:bg-amber-950/50 font-black border border-amber-200/60 dark:border-amber-800/60"
                  : "text-slate-600 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-slate-800/60"
              }`}
            >
              <MoreHorizontal size={16} className="shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">More</span>
              <ChevronDown
                size={14}
                className={`shrink-0 transition-transform duration-200 ${
                  moreOpen ? "rotate-180 text-amber-700 dark:text-amber-400" : "text-slate-400 dark:text-slate-400 group-hover:rotate-180 group-hover:text-amber-700 dark:group-hover:text-amber-400"
                }`}
              />
            </button>

            {/* Dropdown Menu Panel */}
            <div
              className={`absolute top-full right-0 pt-2 w-[350px] max-w-[calc(100vw-2rem)] z-50 transition-all duration-150 ${
                moreOpen
                  ? "opacity-100 pointer-events-auto translate-y-0"
                  : "opacity-0 pointer-events-none -translate-y-1 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0"
              }`}
            >
              <div
                id="more-navigation-menu"
                role="menu"
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl p-2.5 space-y-1"
              >
                {moreDropdownItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenus}
                      role="menuitem"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group/item ${
                        active
                          ? "bg-amber-50/90 dark:bg-amber-950/60 text-amber-950 dark:text-amber-300 font-bold border border-amber-200/70 dark:border-amber-800/60 shadow-2xs"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100 font-semibold"
                      }`}
                    >
                      <item.icon
                        size={18}
                        className={`shrink-0 transition-transform group-hover/item:scale-110 ${
                          active ? "text-amber-600 dark:text-amber-400" : (item.iconColor ?? "text-slate-500")
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate flex items-center justify-between gap-2 group-hover/item:text-amber-800 dark:group-hover/item:text-amber-400 transition-colors">
                          <span>{item.label}</span>
                          {active && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-500 shrink-0" />
                          )}
                        </div>
                        {item.description && (
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-1">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        {/* Right Header Utilities */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 xl:gap-3 shrink-0">
          {/* If Student: Show Upgrade CTA & Profile Menu with embedded stats, notifications & theme toggle */}
          {isStudent && (
            <>
              {/* Nút Nâng cấp */}
              <Link
                href="/plans"
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs sm:text-sm shadow-xs transition-all shrink-0 cursor-pointer"
              >
                <Crown size={15} className="text-white shrink-0" aria-hidden="true" />
                <span>Nâng cấp</span>
              </Link>

              {/* Student Avatar & Dropdown */}
              <div ref={profileRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  aria-expanded={profileMenuOpen}
                  aria-label="Menu tài khoản"
                  className="relative flex size-9 sm:size-auto sm:min-h-11 sm:min-w-11 items-center justify-center sm:gap-1.5 rounded-full bg-white dark:bg-slate-800/90 p-0.5 sm:px-1.5 ring-2 ring-amber-500/60 dark:ring-amber-500/50 shadow-2xs transition-all hover:bg-amber-50 dark:hover:bg-slate-750 hover:ring-amber-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-amber-700 cursor-pointer shrink-0"
                >
                  <div className="size-7.5 sm:size-8 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center overflow-hidden shrink-0">
                    {user?.profile?.avatar ? (
                      <img
                        src={user.profile.avatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : user?.profile?.fullName ? (
                      user.profile.fullName.charAt(0).toUpperCase()
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <ChevronDown size={14} className="hidden sm:inline-block text-slate-400 dark:text-slate-300 mr-0.5 shrink-0" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-slate-900">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-[320px] sm:w-[350px] max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl p-2.5 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                    {/* User Identity */}
                    <div className="px-2 pt-1 pb-1">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                        {user?.profile?.fullName || user?.email}
                      </p>
                      {user?.profile?.fullName && user?.email && (
                        <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">{user.email}</p>
                      )}
                    </div>

                    {/* Gamification Stats Strip (Streak, Breads, Level) */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 rounded-xl p-2.5 flex items-center justify-around my-2 text-xs">
                      <div className="flex items-center gap-1.5" title={`Chuỗi học tập liên tục: ${streak || 1} ngày`}>
                        <Flame size={15} className="fill-orange-500 text-orange-500 shrink-0" />
                        <span className="font-extrabold text-orange-600 dark:text-orange-400">{streak || 1}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">ngày</span>
                      </div>

                      <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700" />

                      <Link
                        href="/hub?tab=account-plan"
                        onClick={closeMenus}
                        title={`Số dư bánh mì: ${breads || 0}`}
                        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                      >
                        <span className="text-sm leading-none" role="img" aria-label="Bánh Mì">🥖</span>
                        <span className="font-extrabold text-amber-600 dark:text-amber-400">{breads || 0}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">bánh</span>
                      </Link>

                      <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700" />

                      <div className="flex items-center gap-1.5" title={`Cấp độ ${level || 1} (${exp || 0} EXP)`}>
                        <span className="text-sm leading-none">⚡</span>
                        <span className="font-extrabold text-sky-600 dark:text-sky-400">Lv.{level || 1}</span>
                      </div>
                    </div>

                    {/* Collapsible Thông báo */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1 pb-1">
                      <button
                        type="button"
                        onClick={() => setNotificationsExpanded((prev) => !prev)}
                        className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                        aria-expanded={notificationsExpanded}
                      >
                        <div className="flex items-center gap-2.5">
                          <Bell size={16} className="text-slate-500 dark:text-slate-400 shrink-0" />
                          <span>Thông báo</span>
                          {unreadCount > 0 && (
                            <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white leading-none">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </div>
                        <ChevronDown
                          size={15}
                          className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                            notificationsExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {notificationsExpanded && (
                        <div className="mt-1 px-1 space-y-1.5 animate-in fade-in duration-150">
                          {isInboxLoading ? (
                            <div className="flex items-center justify-center py-4 text-slate-400">
                              <Loader2 size={16} className="animate-spin text-amber-500" />
                            </div>
                          ) : recentNotifications.length === 0 ? (
                            <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                Chưa có thông báo mới
                              </p>
                              <Link
                                href="/notifications"
                                onClick={closeMenus}
                                className="mt-1 inline-block text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                              >
                                Xem lịch sử thông báo
                              </Link>
                            </div>
                          ) : (
                            <>
                              {recentNotifications.slice(0, 2).map((item) => {
                                const isVocab = item.type === "vocab_review";
                                const isStreak = item.type === "streak";
                                const action = resolveNotificationAction(item);
                                const actionLabel = getNotificationActionLabel(item);

                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => handleNotificationClick(item)}
                                    className="p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-amber-50/60 dark:hover:bg-slate-800 transition-colors cursor-pointer group/notif text-left"
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className="mt-0.5 text-xs shrink-0">
                                        {isVocab ? (
                                          <BookOpen size={14} className="text-amber-600 dark:text-amber-400" />
                                        ) : isStreak ? (
                                          <Flame size={14} className="text-orange-500" />
                                        ) : (
                                          <Bell size={14} className="text-amber-600 dark:text-amber-400" />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover/notif:text-amber-800 dark:group-hover/notif:text-amber-400 transition-colors">
                                            {item.title}
                                          </p>
                                          {!item.isRead && (
                                            <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                                          )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                                          {item.body}
                                        </p>
                                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                                          <span className="flex items-center gap-1">
                                            <Clock size={10} />
                                            {formatRelativeTime(item.createdAt)}
                                          </span>
                                          {action && actionLabel && (
                                            <span className="font-extrabold text-amber-700 dark:text-amber-400 group-hover/notif:underline">
                                              {actionLabel}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Footer Actions */}
                              <div className="flex items-center justify-between px-1 pt-1 text-[11px]">
                                <Link
                                  href="/notifications"
                                  onClick={closeMenus}
                                  className="font-bold text-slate-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                                >
                                  Xem tất cả
                                </Link>
                                {unreadCount > 0 && (
                                  <button
                                    type="button"
                                    disabled={markAllReadMut.isPending}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAllReadMut.mutate();
                                    }}
                                    className="font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <CheckCheck size={12} />
                                    <span>Đọc tất cả</span>
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                    {/* Nav Links */}
                    <Link
                      href="/hub?tab=account-profile"
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap"
                    >
                      <User size={16} className="text-slate-500 dark:text-slate-400 shrink-0" />
                      <span>Thông tin cá nhân</span>
                    </Link>

                    <Link
                      href="/hub?tab=account-plan"
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap"
                    >
                      <Crown size={16} className="text-amber-500 shrink-0" />
                      <span>Gói của tôi</span>
                    </Link>

                    <Link
                      href="/hub?tab=learning-progress"
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap"
                    >
                      <Activity size={16} className="text-emerald-500 shrink-0" />
                      <span>Tiến độ học tập</span>
                    </Link>

                    <Link
                      href="/pet"
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap"
                    >
                      <Heart size={16} className="text-rose-500 shrink-0" />
                      <span>Thú cưng đồng hành</span>
                    </Link>

                    <Link
                      href="/hub?tab=account-password"
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap"
                    >
                      <KeyRound size={16} className="text-slate-400 shrink-0" />
                      <span>Đổi mật khẩu</span>
                    </Link>

                    {/* Dark Mode Toggle Item */}
                    <div
                      onClick={toggleTheme}
                      className="flex items-center justify-between p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleTheme();
                        }
                      }}
                      aria-label="Bật tắt chế độ tối"
                    >
                      <div className="flex items-center gap-2.5">
                        {isDark ? (
                          <Moon size={16} className="text-amber-400 shrink-0" />
                        ) : (
                          <Sun size={16} className="text-slate-500 dark:text-slate-400 shrink-0" />
                        )}
                        <span>Chế độ tối</span>
                      </div>
                      <div
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center shrink-0 ${
                          isDark ? "bg-amber-500 justify-end" : "bg-slate-300 dark:bg-slate-600 justify-start"
                        }`}
                      >
                        <div className="size-4 rounded-full bg-white shadow-xs" />
                      </div>
                    </div>

                    {/* Divider & Logout */}
                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer whitespace-nowrap"
                    >
                      <LogOut size={16} className="shrink-0" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* If Admin */}
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-primary px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-white transition-colors hover:bg-primary-container shrink-0 whitespace-nowrap"
            >
              <LayoutDashboard size={15} />
              <span className="hidden sm:inline">Quản trị</span>
            </Link>
          )}

          {/* If Guest */}
          {!user && (
            <>
              <ThemeToggle className="hidden sm:inline-flex" />
              <Link
                href="/plans"
                className="hidden sm:inline-flex shrink-0 whitespace-nowrap text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 font-bold text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 transition-colors text-center items-center gap-1.5 cursor-pointer"
              >
                <CreditCard size={15} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <span>Gói dịch vụ</span>
              </Link>
              <Link
                href="/login"
                className="shrink-0 whitespace-nowrap border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2 font-bold text-xs sm:text-sm transition-colors text-center cursor-pointer"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="shrink-0 whitespace-nowrap btn-tactile-primary bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm transition-all text-center cursor-pointer"
              >
                <span>Đăng ký</span>
                <span className="hidden sm:inline"> miễn phí</span>
              </Link>
            </>
          )}

          {/* Mobile/Tablet menu toggle button */}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            className={`size-9 sm:size-10 sm:min-h-11 sm:min-w-11 items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none xl:hidden shrink-0 cursor-pointer ${
              user ? "hidden md:inline-flex" : "inline-flex"
            }`}
          >
            {mobileOpen ? (
              <>
                <X size={20} className="sm:hidden" aria-hidden="true" />
                <X size={23} className="hidden sm:inline-block" aria-hidden="true" />
              </>
            ) : (
              <>
                <Menu size={20} className="sm:hidden" aria-hidden="true" />
                <Menu size={23} className="hidden sm:inline-block" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Sidebar Drawer Portal: Rendered directly on document.body to prevent containing-block trap */}
      {isReady && typeof document !== "undefined" && createPortal(
        mobileOpen ? (
          <div className="fixed inset-0 z-[9999]">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in cursor-pointer"
              onClick={closeMenus}
              aria-label="Đóng menu"
            />

            {/* Sidebar Drawer Panel */}
            <aside
              id="mobile-navigation"
              role="dialog"
              aria-modal="true"
              aria-label="Menu điều hướng"
              className="fixed top-0 right-0 bottom-0 h-dvh w-[88vw] sm:w-[26rem] max-w-[420px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 z-[10000] animate-in slide-in-from-right duration-300 ease-out"
            >
              {/* Sticky Drawer Header */}
              <div className="h-18 px-5 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
                <BrandLogo
                  href={isStudent ? "/dashboard" : "/"}
                  onClick={closeMenus}
                  variant="compact"
                  size="sm"
                  roleBadge={isStudent ? "STUDENT" : isAdmin ? "ADMIN" : "GUEST"}
                />
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <button
                    type="button"
                    onClick={closeMenus}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    aria-label="Đóng menu"
                  >
                    <X size={22} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Scrollable Drawer Body */}
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] pb-[calc(5rem+env(safe-area-inset-bottom))]">
                {/* Student Status Summary Card */}
                {user && isStudent && (
                  <div className="rounded-2xl bg-amber-50/80 dark:bg-slate-800/80 border border-amber-200/90 dark:border-slate-700 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center overflow-hidden shrink-0">
                        {user?.profile?.avatar ? (
                          <img src={user.profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : user?.profile?.fullName ? (
                          user.profile.fullName.charAt(0).toUpperCase()
                        ) : (
                          <User size={18} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{user?.profile?.fullName || user?.email}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href="/hub?tab=account-plan"
                        onClick={closeMenus}
                        className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 px-2.5 py-1.5 rounded-xl text-xs font-black text-amber-900 dark:text-amber-300 shadow-2xs hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
                      >
                        <span role="img" aria-label="Bánh Mì">🥖</span>
                        <span>{breads || 0}</span>
                      </Link>
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 px-2.5 py-1.5 rounded-xl text-xs font-black text-orange-700 dark:text-orange-300 shadow-2xs">
                        <Flame size={14} className="fill-orange-500 text-orange-500" />
                        <span>{streak || 1}d</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Theme Switcher Row in Drawer */}
                <div className="pt-1 pb-1">
                  <ThemeToggle variant="row" />
                </div>

                {/* Primary Navigation Links */}
                <nav className="space-y-1" aria-label="Điều hướng chính">
                  <p className="px-3 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Trang học tập
                  </p>

                  {/* 1. Trang chủ */}
                  <Link
                    href={isStudent ? "/dashboard" : "/"}
                    onClick={closeMenus}
                    className={`flex min-h-[48px] items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors ${
                      isActivePath(pathname, isStudent ? "/dashboard" : "/")
                        ? "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-black border border-amber-200/80 dark:border-amber-800/70 shadow-2xs"
                        : "text-slate-700 dark:text-slate-200 hover:bg-amber-50/70 dark:hover:bg-slate-800 hover:text-amber-900 dark:hover:text-amber-300"
                    }`}
                  >
                    <Home size={19} className={isActivePath(pathname, isStudent ? "/dashboard" : "/") ? "text-amber-700 dark:text-amber-400" : "text-amber-600 dark:text-amber-500"} />
                    <span>Trang chủ</span>
                  </Link>

                  {/* 2. Luyện tập kỹ năng & 4 kỹ năng con */}
                  <div className="space-y-1.5 pt-1">
                    <Link
                      href="/listening"
                      onClick={closeMenus}
                      className={`flex min-h-[48px] items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors ${
                        isSkillsPath
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-black border border-amber-200/80 dark:border-amber-800/70 shadow-2xs"
                          : "text-slate-700 dark:text-slate-200 hover:bg-amber-50/70 dark:hover:bg-slate-800 hover:text-amber-900 dark:hover:text-amber-300"
                      }`}
                    >
                      <Dumbbell size={19} className={isSkillsPath ? "text-amber-700 dark:text-amber-400" : "text-amber-600 dark:text-amber-500"} />
                      <span>Luyện tập kỹ năng</span>
                    </Link>

                    {/* 4 Skills Sub-Grid (Nghe, Nói, Đọc, Viết) */}
                    <div className="pl-3 pr-1 py-1">
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href="/listening"
                          onClick={closeMenus}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 text-xs font-bold text-blue-900 dark:text-blue-300 hover:bg-blue-100/70 dark:hover:bg-blue-900/60 transition-colors"
                        >
                          <Headphones size={16} className="text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
                          <span>Luyện Nghe</span>
                        </Link>
                        <Link
                          href="/speaking"
                          onClick={closeMenus}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60 text-xs font-bold text-purple-900 dark:text-purple-300 hover:bg-purple-100/70 dark:hover:bg-purple-900/60 transition-colors"
                        >
                          <Mic size={16} className="text-purple-600 dark:text-purple-400 shrink-0" aria-hidden="true" />
                          <span>Luyện Nói</span>
                        </Link>
                        <Link
                          href="/reading"
                          onClick={closeMenus}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-xs font-bold text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60 transition-colors"
                        >
                          <BookOpen size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                          <span>Luyện Đọc</span>
                        </Link>
                        <Link
                          href="/writing"
                          onClick={closeMenus}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60 text-xs font-bold text-rose-900 dark:text-rose-300 hover:bg-rose-100/70 dark:hover:bg-rose-900/60 transition-colors"
                        >
                          <PenTool size={16} className="text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
                          <span>Luyện Viết</span>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* 3. Luyện đề & Phần còn lại */}
                  {mobileSecondaryLinks.map((link) => {
                    const active = link.isExam ? isExamPath : isActivePath(pathname, link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={closeMenus}
                        className={`flex min-h-[48px] items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors ${
                          active
                            ? "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-black border border-amber-200/80 dark:border-amber-800/70 shadow-2xs"
                            : "text-slate-700 dark:text-slate-200 hover:bg-amber-50/70 dark:hover:bg-slate-800 hover:text-amber-900 dark:hover:text-amber-300"
                        }`}
                      >
                        <link.icon size={19} className={active ? "text-amber-700 dark:text-amber-400" : "text-amber-600 dark:text-amber-500"} />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}

                  {/* Learning Tools */}
                  {isStudent && (
                    <div className="pt-2">
                      <p className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Tiện ích học tập
                      </p>
                      <div className="space-y-1">
                        <Link
                          href="/pet"
                          onClick={closeMenus}
                          className="flex min-h-[44px] items-center gap-3 rounded-2xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-900 dark:hover:text-emerald-300 transition-colors"
                        >
                          <Heart size={17} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Thú cưng đồng hành</span>
                        </Link>

                      </div>
                    </div>
                  )}
                </nav>

                {/* Bottom Account / Auth Actions */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
                  {isStudent && (
                    <>
                      <Link
                        href="/hub?tab=account-plan"
                        onClick={closeMenus}
                        className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 text-xs font-bold transition-colors shadow-xs"
                      >
                        <Crown size={16} />
                        <span>Gói của tôi</span>
                      </Link>
                      <Link
                        href="/hub?tab=account-profile"
                        onClick={closeMenus}
                        className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 px-4 py-2.5 text-xs font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
                      >
                        <User size={16} />
                        <span>Thông tin cá nhân</span>
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                      >
                        <LogOut size={16} />
                        <span>Đăng xuất</span>
                      </button>
                    </>
                  )}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={closeMenus}
                      className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-primary text-white px-4 py-2.5 text-xs font-bold hover:bg-primary-container transition-colors"
                    >
                      <LayoutDashboard size={16} />
                      <span>Trang Quản trị</span>
                    </Link>
                  )}
                  {!user && (
                    <div className="space-y-2">
                      <Link
                        href="/plans"
                        onClick={closeMenus}
                        className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-amber-300/80 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/30 px-4 py-2.5 text-xs font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-900/50 transition-colors"
                      >
                        <CreditCard size={16} className="text-amber-600 dark:text-amber-400" />
                        <span>Gói dịch vụ</span>
                      </Link>
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href="/login"
                          onClick={closeMenus}
                          className="flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          Đăng nhập
                        </Link>
                        <Link
                          href="/register"
                          onClick={closeMenus}
                          className="flex min-h-[44px] items-center justify-center rounded-2xl bg-amber-600 text-white px-4 py-2 text-xs font-black hover:bg-amber-700 transition-colors shadow-xs"
                        >
                          Đăng ký
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        ) : null,
        document.body
      )}
    </header>
  );
}
