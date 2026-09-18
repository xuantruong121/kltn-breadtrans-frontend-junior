"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
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
  BellOff,
  LogOut,
  Flame,
  LineChart,
  Heart,
  Loader2,
  ShieldCheck,
  CheckCheck,
  Clock,
  Settings,
  Inbox,
  MoreHorizontal,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { usePushNotification } from "@/lib/hooks/usePushNotification";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService, NotificationItem } from "@/lib/api/services/notification.service";
import { BrandLogo } from "@/components/brand";

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

function StudentNotificationMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "settings">("inbox");
  const menuRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLElement>(null);

  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading: isPushLoading,
    subscribeToPush,
    unsubscribeFromPush,
  } = usePushNotification();

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => notificationService.getUnreadCount(),
    enabled: !!user,
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count || 0;

  const { data: inboxData, isLoading: isInboxLoading } = useQuery({
    queryKey: ["notifications-inbox"],
    queryFn: () => notificationService.getInbox(20),
    enabled: !!user && open && activeTab === "inbox",
  });
  const items = inboxData?.items || [];

  const markReadMut = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-inbox"] });
    },
  });

  const markAllReadMut = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-inbox"] });
    },
  });

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        (!mobilePanelRef.current || !mobilePanelRef.current.contains(target))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, []);

  const handleItemClick = (item: NotificationItem, isMobile: boolean = false) => {
    if (!item.isRead) {
      markReadMut.mutate(item.id);
    }
    if (item.url) {
      setOpen(false);
      router.push(item.url);
    } else if (isMobile) {
      setOpen(false);
    }
  };

  const status = !isSupported
    ? "Trình duyệt chưa hỗ trợ"
    : permission === "denied"
      ? "Đã bị chặn"
      : isSubscribed
        ? "Đang bật"
        : "Chưa bật";

  const renderMenuContent = (isMobile: boolean = false) => (
    <div className="flex flex-col overflow-hidden">
      {/* TABS HEADER */}
      <div className="flex border-b border-slate-100 bg-slate-50/80 p-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("inbox")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "inbox"
              ? "bg-white text-amber-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Inbox size={15} />
          <span>Hộp thư</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[9px] font-black text-white">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "settings"
              ? "bg-white text-amber-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Settings size={15} />
          <span>Cài đặt nhận tin</span>
        </button>
      </div>

      {/* TAB 1: INBOX */}
      {activeTab === "inbox" && (
        <div className="flex flex-col min-h-0">
          {/* Inbox Subheader */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 shrink-0 bg-white">
            <span className="text-xs font-bold text-slate-500">
              {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Đã đọc tất cả"}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={markAllReadMut.isPending}
                onClick={() => markAllReadMut.mutate()}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 disabled:opacity-50 cursor-pointer"
              >
                <CheckCheck size={13} />
                <span>Đọc tất cả</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className={`${isMobile ? "max-h-[50dvh]" : "max-h-[360px]"} overflow-y-auto divide-y divide-slate-100`}>
            {isInboxLoading ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 size={24} className="animate-spin text-amber-500" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Inbox size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold">Chưa có thông báo nào</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Các lời nhắc ôn từ vựng và chuỗi học tập sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const isVocab = item.type === "vocab_review";
                const isStreak = item.type === "streak";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item, isMobile)}
                    className={`group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer ${
                      item.isRead ? "bg-white hover:bg-slate-50/80" : "bg-amber-50/50 hover:bg-amber-50"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl text-xs ${
                        isVocab
                          ? "bg-amber-100 text-amber-800"
                          : isStreak
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {isVocab ? (
                        <BookOpen size={16} />
                      ) : isStreak ? (
                        <Flame size={16} />
                      ) : (
                        <Bell size={16} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs leading-snug line-clamp-1 ${
                            item.isRead ? "font-semibold text-slate-700" : "font-extrabold text-slate-900"
                          }`}
                        >
                          {item.title}
                        </p>
                        {!item.isRead && (
                          <span className="size-2 shrink-0 rounded-full bg-amber-500" />
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 line-clamp-2">
                        {item.body}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock size={11} />
                        <span>{formatRelativeTime(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PUSH SETTINGS */}
      {activeTab === "settings" && (
        <div className="overflow-y-auto max-h-[50dvh] sm:max-h-none">
          <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/70 p-4">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${isSubscribed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {isSubscribed ? <ShieldCheck size={20} aria-hidden="true" /> : <BellOff size={20} aria-hidden="true" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900">Thông báo trình duyệt</h2>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isSubscribed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{status}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">Nhận nhắc ôn tập từ vựng Spaced Repetition và duy trì ngọn lửa streak ngay trên thiết bị này.</p>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {!isSupported ? (
              <p className="rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500">Trình duyệt hiện tại không hỗ trợ thông báo đẩy.</p>
            ) : permission === "denied" ? (
              <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-700">Bạn đã chặn thông báo. Hãy bật lại quyền thông báo trong cài đặt trình duyệt để tiếp tục.</p>
            ) : isSubscribed ? (
              <button type="button" disabled={isPushLoading} onClick={unsubscribeFromPush} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">
                {isPushLoading ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <BellOff size={17} aria-hidden="true" />} Tắt thông báo đẩy
              </button>
            ) : (
              <button type="button" disabled={isPushLoading} onClick={subscribeToPush} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-extrabold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">
                {isPushLoading ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Bell size={17} aria-hidden="true" />} Bật nhận thông báo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Mở thông báo"
        aria-expanded={open}
        aria-controls="student-notification-menu-desktop"
        className={`relative flex size-9 sm:size-10 sm:min-h-11 sm:min-w-11 items-center justify-center rounded-xl border transition-all focus-visible:outline-none ${
          open
            ? "border-amber-200 bg-amber-50 text-amber-800 shadow-2xs"
            : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800"
        }`}
      >
        <Bell size={18} className="sm:hidden" aria-hidden="true" />
        <Bell size={20} className="hidden sm:inline-block" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 sm:h-5 sm:min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] sm:text-[10px] font-black text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : !isSubscribed && isSupported && permission !== "denied" ? (
          <span className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2 size-2 rounded-full bg-amber-500 ring-2 ring-white" aria-label="Chưa thiết lập thông báo" />
        ) : null}
      </button>

      {/* Desktop Dropdown (sm and up >= 640px) */}
      {open && (
        <section
          id="student-notification-menu-desktop"
          className="hidden sm:block absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {renderMenuContent(false)}
        </section>
      )}

      {/* Mobile Portal Modal (< sm < 640px, e.g. iPhone 16 Pro Max, 440px) */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="sm:hidden">
            {/* Darkened Backdrop */}
            <div
              className="fixed inset-0 z-[9990] bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            {/* Floating Card Sheet */}
            <section
              ref={mobilePanelRef}
              id="student-notification-menu-mobile"
              className="fixed top-20 inset-x-3 z-[9995] max-w-[420px] mx-auto overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[calc(100dvh-6rem)] flex flex-col"
            >
              {/* Mobile Header Bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Bell size={17} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Thông báo</h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Đã đọc tất cả"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng thông báo"
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Shared Content Body */}
              {renderMenuContent(true)}
            </section>
          </div>,
          document.body
        )}
    </div>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { breads, streak } = useGamificationStore();

  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const skillsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const isReady = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setSkillsOpen(false);
        setProfileMenuOpen(false);
        setMoreOpen(false);
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      if (skillsRef.current && !skillsRef.current.contains(event.target as Node)) {
        setSkillsOpen(false);
      }
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
    setSkillsOpen(false);
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
  const isExamPath = pathname.startsWith("/practice/toeic") || pathname.startsWith("/practice/quizzes");
  const isSkillsPath =
    (pathname.startsWith("/practice") && !isExamPath) ||
    pathname.startsWith("/flashcard") ||
    pathname.startsWith("/grammar");

  interface HeaderNavLink {
    label: string;
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
    isExam?: boolean;
    iconBg?: string;
    description?: string;
  }

  const primaryLinks: HeaderNavLink[] = [
    { label: "Luyện đề", href: "/practice/quizzes", icon: Target, isExam: true },
    { label: "Khóa học", href: "/courses", icon: BookOpen },
  ];

  const overflowLinks: HeaderNavLink[] = isStudent
    ? [
        {
          label: "Khóa học của tôi",
          href: "/my-courses",
          icon: GraduationCap,
          iconBg: "bg-indigo-50 text-indigo-600",
          description: "Tiến độ khóa học & lộ trình",
        },
        {
          label: "Cửa hàng",
          href: "/market",
          icon: ShoppingBag,
          iconBg: "bg-emerald-50 text-emerald-600",
          description: "Đổi vật phẩm & quà tặng",
        },
        {
          label: "Bảng xếp hạng",
          href: "/arena",
          icon: Trophy,
          iconBg: "bg-amber-50 text-amber-600",
          description: "Bảng vàng thi đua tuần & EXP",
        },
      ]
    : [
        {
          label: "Cửa hàng",
          href: "/market",
          icon: ShoppingBag,
          iconBg: "bg-emerald-50 text-emerald-600",
          description: "Đổi vật phẩm & tiện ích",
        },
        {
          label: "Bảng xếp hạng",
          href: "/arena",
          icon: Trophy,
          iconBg: "bg-amber-50 text-amber-600",
          description: "Bảng vàng thi đua học tập",
        },
      ];

  const secondaryLinks: HeaderNavLink[] = [...primaryLinks, ...overflowLinks];

  const isAnyOverflowActive = overflowLinks.some((link) =>
    Boolean(link.isExam ? isExamPath : isActivePath(pathname, link.href))
  );

  return (
    <header className="sticky top-0 z-[70] w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all duration-200 shadow-xs">
      <div className="w-full px-3 sm:px-6 lg:px-6 xl:px-8 2xl:px-12 h-16 sm:h-20 flex items-center justify-between gap-1.5 sm:gap-4">
        
        {/* Brand Logo & Role Tag */}
        <div className="flex items-center shrink-0">
          <BrandLogo
            href={isStudent ? "/dashboard" : "/"}
            onClick={closeMenus}
            variant="compact"
            size="md"
            roleBadge={isStudent ? "STUDENT" : isAdmin ? "ADMIN" : "GUEST"}
          />
        </div>

        {/* Center Desktop Navigation (Activates at xl: 1280px+ to ensure tablets have ample breathing space) */}
        <nav
          aria-label="Menu chính"
          className="hidden xl:flex items-center justify-center gap-1 2xl:gap-2 text-xs 2xl:text-sm font-bold shrink-0"
        >
          {/* Trang chủ */}
          <Link
            href={isStudent ? "/dashboard" : "/"}
            className={`px-2 xl:px-3 py-1.5 2xl:py-2 rounded-xl flex items-center gap-1 xl:gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
              isActivePath(pathname, isStudent ? "/dashboard" : "/")
                ? "text-amber-800 bg-amber-50/90 font-black border border-amber-200/60"
                : "text-slate-600 hover:text-amber-800 hover:bg-amber-50/50"
            }`}
          >
            <Home size={16} className="shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">Trang chủ</span>
          </Link>

          {/* Trung tâm luyện kỹ năng + lối tắt theo từng kỹ năng */}
          <div
            ref={skillsRef}
            className="relative flex shrink-0 group"
            onMouseEnter={() => setSkillsOpen(true)}
            onMouseLeave={() => setSkillsOpen(false)}
          >
            <Link
              href="/practice"
              onClick={closeMenus}
              className={`px-2 xl:px-3 py-1.5 2xl:py-2 rounded-l-xl flex items-center gap-1 xl:gap-1.5 transition-colors font-bold shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 whitespace-nowrap ${
                isSkillsPath
                  ? "text-amber-800 bg-amber-50/80 font-black"
                  : "text-slate-600 hover:text-amber-800 hover:bg-amber-50/50"
              }`}
            >
              <Dumbbell size={16} className="shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">Luyện tập kỹ năng</span>
            </Link>
            <button
              type="button"
              onClick={() => setSkillsOpen((prev) => !prev)}
              aria-label={skillsOpen ? "Đóng danh sách kỹ năng" : "Mở danh sách kỹ năng"}
              aria-expanded={skillsOpen}
              aria-controls="skills-navigation-menu"
              aria-haspopup="menu"
              className={`-ml-2 flex min-h-10 min-w-7 xl:min-w-9 items-center justify-center rounded-r-xl transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 cursor-pointer ${
                isSkillsPath || skillsOpen
                  ? "bg-amber-50/80 text-amber-700"
                  : "text-slate-400 hover:bg-amber-50/50 hover:text-amber-700"
              }`}
            >
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${
                  skillsOpen ? "rotate-180 text-amber-700" : "group-hover:rotate-180 group-hover:text-amber-700"
                }`}
              />
            </button>

            {/* Dropdown Menu (Opens on hover and on click) */}
            <div
              className={`absolute top-full left-0 pt-1.5 w-[330px] max-w-[calc(100vw-2rem)] z-50 transition-all duration-150 ${
                skillsOpen
                  ? "opacity-100 pointer-events-auto translate-y-0"
                  : "opacity-0 pointer-events-none -translate-y-1 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0"
              }`}
            >
              <div id="skills-navigation-menu" role="menu" className="bg-white border border-slate-200/90 rounded-2xl shadow-xl p-2 space-y-1">
                {/* 1. Luyện nghe */}
                <Link
                  href="/practice/listening"
                  onClick={closeMenus}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-blue-50/70 text-slate-800 transition-colors group/item"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover/item:scale-105 transition-transform">
                    <Headphones size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 group-hover/item:text-blue-700 transition-colors">
                      Luyện nghe
                    </div>
                    <div className="text-xs font-semibold text-slate-500 leading-snug mt-0.5">
                      Rèn khả năng nghe hiểu qua hội thoại và tình huống thực tế.
                    </div>
                  </div>
                </Link>

                {/* 2. Luyện nói */}
                <Link
                  href="/practice/speaking"
                  onClick={closeMenus}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-purple-50/70 text-slate-800 transition-colors group/item"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover/item:scale-105 transition-transform">
                    <Mic size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 group-hover/item:text-purple-700 transition-colors">
                      Luyện nói
                    </div>
                    <div className="text-xs font-semibold text-slate-500 leading-snug mt-0.5">
                      Cải thiện phát âm, ngữ điệu và phản xạ qua các bài tập tương tác.
                    </div>
                  </div>
                </Link>

                {/* 3. Luyện đọc */}
                <Link
                  href="/practice/reading"
                  onClick={closeMenus}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-emerald-50/70 text-slate-800 transition-colors group/item"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover/item:scale-105 transition-transform">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 group-hover/item:text-emerald-700 transition-colors">
                      Luyện đọc
                    </div>
                    <div className="text-xs font-semibold text-slate-500 leading-snug mt-0.5">
                      Phát triển kỹ năng đọc hiểu, tìm ý chính và xử lý thông tin.
                    </div>
                  </div>
                </Link>

                {/* 4. Luyện viết */}
                <Link
                  href="/practice/writing"
                  onClick={closeMenus}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-rose-50/70 text-slate-800 transition-colors group/item"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover/item:scale-105 transition-transform">
                    <PenTool size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 group-hover/item:text-rose-700 transition-colors">
                      Luyện viết
                    </div>
                    <div className="text-xs font-semibold text-slate-500 leading-snug mt-0.5">
                      Luyện viết câu, email và nhận gợi ý chỉnh sửa chi tiết.
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Primary Links: Luyện đề, Khóa học */}
          {primaryLinks.map((link) => {
            const active = link.isExam ? isExamPath : isActivePath(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2 xl:px-3 py-1.5 2xl:py-2 rounded-xl flex items-center gap-1 xl:gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
                  active
                    ? "text-amber-800 bg-amber-50/90 font-black border border-amber-200/60"
                    : "text-slate-600 hover:text-amber-800 hover:bg-amber-50/50"
                }`}
              >
                <link.icon size={16} className="shrink-0" />
                <span className="whitespace-nowrap">{link.label}</span>
              </Link>
            );
          })}

          {/* Secondary Links inline on wide screens (>= 2xl) */}
          {overflowLinks.map((link) => {
            const active = link.isExam ? isExamPath : isActivePath(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`hidden 2xl:flex px-2.5 2xl:px-3 py-1.5 2xl:py-2 rounded-xl items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
                  active
                    ? "text-amber-800 bg-amber-50/90 font-black border border-amber-200/60"
                    : "text-slate-600 hover:text-amber-800 hover:bg-amber-50/50"
                }`}
              >
                <link.icon size={16} className="shrink-0" />
                <span className="whitespace-nowrap">{link.label}</span>
              </Link>
            );
          })}

          {/* Adaptive "Khác" (More) Dropdown on intermediate viewports (< 2xl) */}
          <div
            ref={moreRef}
            className="relative flex 2xl:hidden shrink-0 group"
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
              className={`px-2 xl:px-3 py-1.5 2xl:py-2 rounded-xl flex items-center gap-1 xl:gap-1.5 transition-colors shrink-0 whitespace-nowrap font-bold cursor-pointer ${
                isAnyOverflowActive
                  ? "text-amber-800 bg-amber-50/90 font-black border border-amber-200/60"
                  : "text-slate-600 hover:text-amber-800 hover:bg-amber-50/50"
              }`}
            >
              <MoreHorizontal size={16} className="shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">Khác</span>
              <ChevronDown
                size={14}
                className={`shrink-0 transition-transform duration-200 ${
                  moreOpen ? "rotate-180 text-amber-700" : "text-slate-400 group-hover:rotate-180 group-hover:text-amber-700"
                }`}
              />
            </button>

            {/* Dropdown Menu Panel */}
            <div
              className={`absolute top-full right-0 pt-1.5 w-[280px] max-w-[calc(100vw-2rem)] z-50 transition-all duration-150 ${
                moreOpen
                  ? "opacity-100 pointer-events-auto translate-y-0"
                  : "opacity-0 pointer-events-none -translate-y-1 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0"
              }`}
            >
              <div
                id="more-navigation-menu"
                role="menu"
                className="bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 space-y-0.5"
              >
                {overflowLinks.map((link) => {
                  const active = link.isExam ? isExamPath : isActivePath(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenus}
                      role="menuitem"
                      className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${
                        active
                          ? "bg-amber-50/90 text-amber-950 font-bold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          active
                            ? "bg-amber-600 text-white"
                            : link.iconBg || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <link.icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate flex items-center justify-between">
                          <span>{link.label}</span>
                          {active && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                          )}
                        </div>
                        {link.description && (
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {link.description}
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
          {/* If Student: Show Gamification badges & Profile Menu */}
          {isStudent && (
            <>
              {/* Mobile Compact Pill: Bánh Mì */}
              <Link
                href="/student/profile?tab=quotas"
                title={`Số dư: ${breads || 0} Bánh Mì`}
                className="flex sm:hidden items-center gap-1 bg-amber-50/90 border border-amber-200/90 px-2 py-1 rounded-xl shadow-2xs text-amber-900 shrink-0 whitespace-nowrap text-xs font-black"
              >
                <span className="text-sm shrink-0" role="img" aria-label="Bánh Mì">🥖</span>
                <span>{breads || 0}</span>
              </Link>

              {/* Badge Bánh Mì */}
              <Link
                href="/student/profile?tab=quotas"
                title={`Số dư: ${breads || 0} Bánh Mì`}
                className="group hidden items-center gap-1 sm:gap-1.5 bg-amber-50/90 border border-amber-200/90 px-2 sm:px-2.5 2xl:px-3 py-1 2xl:py-1.5 rounded-2xl shadow-2xs hover:border-amber-400 transition-colors shrink-0 whitespace-nowrap sm:flex"
              >
                <span className="text-base shrink-0" role="img" aria-label="Bánh Mì">🥖</span>
                <span className="text-xs font-black text-amber-900 tracking-tight whitespace-nowrap">
                  {breads || 0}
                </span>
              </Link>

              {/* Badge Streak */}
              <div
                title={`Chuỗi học tập liên tục: ${streak || 1} ngày`}
                className="hidden items-center gap-1 sm:gap-1.5 bg-orange-50/90 border border-orange-200/90 px-2 sm:px-2.5 2xl:px-3 py-1 2xl:py-1.5 rounded-2xl shadow-2xs text-orange-700 shrink-0 whitespace-nowrap sm:flex"
              >
                <Flame size={16} className="fill-orange-500 text-orange-500 shrink-0" />
                <span className="text-xs font-black tracking-tight whitespace-nowrap">
                  {streak || 1}
                  <span className="hidden xl:inline"> ngày</span>
                </span>
              </div>

              <StudentNotificationMenu />

              {/* Student Avatar & Dropdown */}
              <div ref={profileRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  aria-expanded={profileMenuOpen}
                  aria-label="Menu tài khoản"
                  className="flex size-9 sm:size-auto sm:min-h-11 sm:min-w-11 items-center justify-center sm:gap-1.5 rounded-full bg-white p-0.5 sm:px-1.5 ring-2 ring-amber-500/60 shadow-2xs transition-all hover:bg-amber-50 hover:ring-amber-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-amber-700 cursor-pointer shrink-0"
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
                  <ChevronDown size={14} className="hidden sm:inline-block text-slate-400 mr-0.5 shrink-0" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-1.5rem)] bg-white border border-slate-200/90 rounded-2xl shadow-xl p-2 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {user?.profile?.fullName || user?.email}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400 truncate">{user?.email}</p>
                    </div>

                    <Link
                      href="/student/profile"
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors whitespace-nowrap"
                    >
                      <User size={16} className="text-amber-600 shrink-0" />
                      <span>Hồ sơ & Gói học</span>
                    </Link>

                    {isStudent && (
                      <Link
                        href="/pet"
                        onClick={closeMenus}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors whitespace-nowrap"
                      >
                        <Heart size={16} className="text-emerald-600 shrink-0" />
                        <span>Thú cưng đồng hành</span>
                      </Link>
                    )}

                    <Link
                      href="/change-password"
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors whitespace-nowrap"
                    >
                      <KeyRound size={16} className="text-slate-400 shrink-0" />
                      <span>Đổi mật khẩu</span>
                    </Link>

                    <Link
                      href="/history"
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-900 transition-colors whitespace-nowrap"
                    >
                      <LineChart size={16} className="text-sky-600 shrink-0" />
                      <span>Lịch sử luyện tập</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer mt-1 pt-2 border-t border-slate-100 whitespace-nowrap"
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
              <Link
                href="/login"
                className="shrink-0 whitespace-nowrap border border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50 rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2 font-bold text-xs sm:text-sm transition-colors text-center cursor-pointer"
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
            className="inline-flex size-9 sm:size-10 sm:min-h-11 sm:min-w-11 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none xl:hidden shrink-0 cursor-pointer"
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
              className="fixed top-0 right-0 bottom-0 h-dvh w-[88vw] sm:w-[26rem] max-w-[420px] bg-white shadow-2xl flex flex-col border-l border-slate-200 z-[10000] animate-in slide-in-from-right duration-300 ease-out"
            >
              {/* Sticky Drawer Header */}
              <div className="h-18 px-5 sm:px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <BrandLogo
                  href={isStudent ? "/dashboard" : "/"}
                  onClick={closeMenus}
                  variant="compact"
                  size="sm"
                  roleBadge={isStudent ? "STUDENT" : isAdmin ? "ADMIN" : "GUEST"}
                />
                <button
                  type="button"
                  onClick={closeMenus}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  aria-label="Đóng menu"
                >
                  <X size={22} aria-hidden="true" />
                </button>
              </div>

              {/* Scrollable Drawer Body */}
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] pb-[calc(5rem+env(safe-area-inset-bottom))]">
                {/* Student Status Summary Card */}
                {user && isStudent && (
                  <div className="rounded-2xl bg-amber-50/80 border border-amber-200/90 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
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
                        <p className="text-xs font-bold text-slate-900 truncate">{user?.profile?.fullName || user?.email}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href="/student/profile?tab=quotas"
                        onClick={closeMenus}
                        className="flex items-center gap-1 bg-white border border-amber-200 px-2.5 py-1.5 rounded-xl text-xs font-black text-amber-900 shadow-2xs hover:border-amber-400 transition-colors"
                      >
                        <span role="img" aria-label="Bánh Mì">🥖</span>
                        <span>{breads || 0}</span>
                      </Link>
                      <div className="flex items-center gap-1 bg-white border border-orange-200 px-2.5 py-1.5 rounded-xl text-xs font-black text-orange-700 shadow-2xs">
                        <Flame size={14} className="fill-orange-500 text-orange-500" />
                        <span>{streak || 1}d</span>
                      </div>
                    </div>
                  </div>
                )}

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
                        ? "bg-amber-50 text-amber-900 font-black border border-amber-200/80 shadow-2xs"
                        : "text-slate-700 hover:bg-amber-50/70 hover:text-amber-900"
                    }`}
                  >
                    <Home size={19} className={isActivePath(pathname, isStudent ? "/dashboard" : "/") ? "text-amber-700" : "text-amber-600"} />
                    <span>Trang chủ</span>
                  </Link>

                  {/* 2. Luyện tập kỹ năng & 4 kỹ năng con */}
                  <div className="space-y-1.5 pt-1">
                    <Link
                      href="/practice"
                      onClick={closeMenus}
                      className={`flex min-h-[48px] items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors ${
                        isSkillsPath
                          ? "bg-amber-50 text-amber-900 font-black border border-amber-200/80 shadow-2xs"
                          : "text-slate-700 hover:bg-amber-50/70 hover:text-amber-900"
                      }`}
                    >
                      <Dumbbell size={19} className={isSkillsPath ? "text-amber-700" : "text-amber-600"} />
                      <span>Luyện tập kỹ năng</span>
                    </Link>

                    {/* 4 Skills Sub-Grid (Nghe, Nói, Đọc, Viết) */}
                    <div className="pl-3 pr-1 py-1">
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href="/practice/listening"
                          onClick={closeMenus}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/60 text-xs font-bold text-blue-900 hover:bg-blue-100/70 transition-colors"
                        >
                          <Headphones size={16} className="text-blue-600 shrink-0" aria-hidden="true" />
                          <span>Luyện Nghe</span>
                        </Link>
                        <Link
                          href="/practice/speaking"
                          onClick={closeMenus}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/60 text-xs font-bold text-purple-900 hover:bg-purple-100/70 transition-colors"
                        >
                          <Mic size={16} className="text-purple-600 shrink-0" aria-hidden="true" />
                          <span>Luyện Nói</span>
                        </Link>
                        <Link
                          href="/practice/reading"
                          onClick={closeMenus}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-xs font-bold text-emerald-900 hover:bg-emerald-100/70 transition-colors"
                        >
                          <BookOpen size={16} className="text-emerald-600 shrink-0" aria-hidden="true" />
                          <span>Luyện Đọc</span>
                        </Link>
                        <Link
                          href="/practice/writing"
                          onClick={closeMenus}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/60 text-xs font-bold text-rose-900 hover:bg-rose-100/70 transition-colors"
                        >
                          <PenTool size={16} className="text-rose-600 shrink-0" aria-hidden="true" />
                          <span>Luyện Viết</span>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* 3. Luyện đề & Phần còn lại */}
                  {secondaryLinks.map((link) => {
                    const active = link.isExam ? isExamPath : isActivePath(pathname, link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={closeMenus}
                        className={`flex min-h-[48px] items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors ${
                          active
                            ? "bg-amber-50 text-amber-900 font-black border border-amber-200/80 shadow-2xs"
                            : "text-slate-700 hover:bg-amber-50/70 hover:text-amber-900"
                        }`}
                      >
                        <link.icon size={19} className={active ? "text-amber-700" : "text-amber-600"} />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}

                  {/* Learning Tools */}
                  {isStudent && (
                    <div className="pt-2">
                      <p className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        Tiện ích học tập
                      </p>
                      <div className="space-y-1">
                        <Link
                          href="/pet"
                          onClick={closeMenus}
                          className="flex min-h-[44px] items-center gap-3 rounded-2xl px-4 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
                        >
                          <Heart size={17} className="text-emerald-600" />
                          <span>Thú cưng đồng hành</span>
                        </Link>
                        <Link
                          href="/history"
                          onClick={closeMenus}
                          className="flex min-h-[44px] items-center gap-3 rounded-2xl px-4 py-2 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-900 transition-colors"
                        >
                          <LineChart size={17} className="text-sky-600" />
                          <span>Lịch sử luyện tập</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </nav>

                {/* Bottom Account / Auth Actions */}
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  {isStudent && (
                    <>
                      <Link
                        href="/student/profile"
                        onClick={closeMenus}
                        className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors"
                      >
                        <User size={16} />
                        <span>Hồ sơ & Gói học</span>
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
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
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/login"
                        onClick={closeMenus}
                        className="flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
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
