"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Dumbbell,
  Headphones,
  Home,
  KeyRound,
  LayoutDashboard,
  LogIn,
  Menu,
  Mic,
  PenTool,
  ShoppingBag,
  Target,
  Trophy,
  User,
  Wheat,
  X,
  Bell,
  BellOff,
  LogOut,
  Flame,
  LineChart,
  Loader2,
  ShieldCheck,
  CheckCheck,
  Clock,
  Settings,
  Inbox,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { usePushNotification } from "@/lib/hooks/usePushNotification";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService, NotificationItem } from "@/lib/api/services/notification.service";

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
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "settings">("inbox");
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, []);

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markReadMut.mutate(item.id);
    }
    if (item.url) {
      setOpen(false);
      router.push(item.url);
    }
  };

  const status = !isSupported
    ? "Trình duyệt chưa hỗ trợ"
    : permission === "denied"
      ? "Đã bị chặn"
      : isSubscribed
        ? "Đang bật"
        : "Chưa bật";

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Mở thông báo"
        aria-expanded={open}
        aria-controls="student-notification-menu"
        className={`relative flex min-h-11 min-w-11 items-center justify-center rounded-xl border transition-all focus-visible:outline-none ${
          open
            ? "border-amber-200 bg-amber-50 text-amber-800 shadow-sm"
            : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800"
        }`}
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : !isSubscribed && isSupported && permission !== "denied" ? (
          <span className="absolute right-2 top-2 size-2 rounded-full bg-amber-500 ring-2 ring-white" aria-label="Chưa thiết lập thông báo" />
        ) : null}
      </button>

      {open && (
        <section id="student-notification-menu" className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* TABS HEADER */}
          <div className="flex border-b border-slate-100 bg-slate-50/80 p-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("inbox")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
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
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
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
            <div>
              {/* Inbox Subheader */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
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
              <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
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
                        onClick={() => handleItemClick(item)}
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
            <div>
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
        </section>
      )}
    </div>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { breads, streak } = useGamificationStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const skillsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const isReady = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setSkillsOpen(false);
        setProfileMenuOpen(false);
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      if (skillsRef.current && !skillsRef.current.contains(event.target as Node)) {
        setSkillsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMenus = () => {
    setMobileOpen(false);
    setSkillsOpen(false);
    setProfileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenus();
    router.push("/");
  };

  const isStudent = isReady && user?.role === "STUDENT";
  const isAdmin = isReady && user?.role === "ADMIN";
  const isSkillsPath =
    (pathname.startsWith("/practice") && !pathname.startsWith("/practice/quizzes")) ||
    pathname.startsWith("/flashcard") ||
    pathname.startsWith("/grammar");

  const primaryLinks = isStudent
    ? [
        { label: "Trang chủ", href: "/dashboard", icon: Home },
        { label: "Khóa học của tôi", href: "/my-courses", icon: BookOpen },
        { label: "Luyện đề", href: "/practice/quizzes", icon: Target },
        { label: "Cửa hàng", href: "/market", icon: ShoppingBag },
        { label: "Bảng xếp hạng", href: "/arena", icon: Trophy },
      ]
    : [
        { label: "Trang chủ", href: "/", icon: Home },
        { label: "Khóa học", href: "/courses", icon: BookOpen },
        { label: "Luyện đề", href: "/practice/quizzes", icon: Target },
        { label: "Cửa hàng", href: "/market", icon: ShoppingBag },
        { label: "Bảng xếp hạng", href: "/arena", icon: Trophy },
      ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all duration-200 shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 h-20 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand Logo & Role Tag */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={isStudent ? "/dashboard" : "/"}
            onClick={closeMenus}
            className="flex items-center gap-2.5 rounded-xl group focus:outline-none focus:ring-2 focus:ring-amber-500 shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-900/10 group-hover:scale-105 transition-transform shrink-0">
              <Wheat size={22} strokeWidth={2.25} aria-hidden="true" />
            </div>
            <div className="flex flex-col shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-slate-900 whitespace-nowrap">
                  Bread<span className="text-amber-600">Trans</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wide whitespace-nowrap shrink-0">
                  {isStudent ? "Học viên" : isAdmin ? "Quản trị" : "Khách"}
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Center Desktop Navigation */}
        <nav
          aria-label="Menu chính"
          className="hidden xl:flex items-center justify-center gap-1 xl:gap-1.5 2xl:gap-2.5 text-sm font-bold flex-nowrap shrink-0"
        >
          {/* Trang chủ */}
          <Link
            href={isStudent ? "/dashboard" : "/"}
            className={`px-3 xl:px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
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
              className={`px-3 xl:px-3.5 py-2 rounded-l-xl flex items-center gap-1.5 transition-colors font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 shrink-0 whitespace-nowrap ${
                isSkillsPath
                  ? "text-amber-800 bg-amber-50/80 font-black"
                  : "text-slate-600 hover:text-amber-800 hover:bg-amber-50/50"
              }`}
            >
              <Dumbbell size={16} className="shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">Luyện kỹ năng</span>
            </Link>
            <button
              type="button"
              onClick={() => setSkillsOpen((prev) => !prev)}
              aria-label={skillsOpen ? "Đóng danh sách kỹ năng" : "Mở danh sách kỹ năng"}
              aria-expanded={skillsOpen}
              aria-controls="skills-navigation-menu"
              aria-haspopup="menu"
              className={`-ml-2 flex min-h-11 min-w-11 items-center justify-center rounded-r-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
                isSkillsPath || skillsOpen
                  ? "bg-amber-50/80 text-amber-700"
                  : "text-slate-400 hover:bg-amber-50/50 hover:text-amber-700"
              }`}
            >
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 text-slate-400 shrink-0 ${
                  skillsOpen ? "rotate-180 text-amber-700" : "group-hover:rotate-180 group-hover:text-amber-700"
                }`}
              />
            </button>

            {/* Dropdown Menu (Opens on hover and on click) */}
            <div
              className={`absolute top-full left-0 pt-1.5 w-[330px] z-50 transition-all duration-150 ${
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
                      Cải thiện phát âm, ngữ điệu và phản xạ với trợ lý AI.
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
                      Luyện viết câu, email và nhận góp ý chi tiết từ AI.
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Other primary links */}
          {primaryLinks.slice(1).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 xl:px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap ${
                isActivePath(pathname, link.href)
                  ? "text-amber-800 bg-amber-50/90 font-black border border-amber-200/60"
                  : "text-slate-600 hover:text-amber-800 hover:bg-amber-50/50"
              }`}
            >
              <link.icon size={16} className="shrink-0" />
              <span className="whitespace-nowrap">{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Right Header Utilities */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* If Student: Show Gamification badges & Profile Menu */}
          {isStudent && (
            <>
              {/* Badge Bánh Mì */}
              <Link
                href="/student/profile?tab=quotas"
                title={`Số dư: ${breads || 0} Bánh Mì`}
                className="group flex items-center gap-1.5 bg-amber-50/90 border border-amber-200/90 px-3 py-1.5 rounded-2xl shadow-2xs hover:border-amber-400 transition-colors shrink-0 whitespace-nowrap"
              >
                <span className="text-base shrink-0" role="img" aria-label="Bánh Mì">🥖</span>
                <span className="text-xs font-black text-amber-900 tracking-tight whitespace-nowrap">
                  {breads || 0}
                </span>
              </Link>

              {/* Badge Streak */}
              <div
                title={`Chuỗi học tập liên tục: ${streak || 1} ngày`}
                className="flex items-center gap-1.5 bg-orange-50/90 border border-orange-200/90 px-3 py-1.5 rounded-2xl shadow-2xs text-orange-700 shrink-0 whitespace-nowrap"
              >
                <Flame size={16} className="fill-orange-500 text-orange-500 shrink-0" />
                <span className="text-xs font-black tracking-tight whitespace-nowrap">
                  {streak || 1} ngày
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
                  className="flex min-h-11 min-w-11 items-center gap-1.5 rounded-full bg-white px-1.5 ring-2 ring-amber-500/60 shadow-sm transition-all hover:bg-amber-50 hover:ring-amber-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-amber-700 cursor-pointer shrink-0"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center overflow-hidden shrink-0">
                    {user?.profile?.name ? (
                      user.profile.name.charAt(0).toUpperCase()
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <ChevronDown size={14} className="text-slate-400 mr-0.5 shrink-0" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-2 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {user?.profile?.name || user?.email}
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
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-container shrink-0 whitespace-nowrap"
            >
              <LayoutDashboard size={15} /> Quản trị
            </Link>
          )}

          {/* If Guest */}
          {!user && (
            <>
              <Link
                href="/login"
                className="shrink-0 whitespace-nowrap border border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50 rounded-xl px-4 py-2 font-bold text-sm transition-colors text-center cursor-pointer"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="shrink-0 whitespace-nowrap btn-tactile-primary bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl px-4 sm:px-5 py-2 text-sm transition-all text-center cursor-pointer"
              >
                Đăng ký miễn phí
              </Link>
            </>
          )}

          {/* Mobile menu toggle button */}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none xl:hidden shrink-0"
          >
            {mobileOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          id="mobile-navigation"
          className="fixed inset-x-0 top-20 bottom-0 z-50 overflow-y-auto border-t border-slate-200 bg-white px-5 py-6 shadow-2xl xl:hidden"
        >
          <nav className="space-y-1.5" aria-label="Điều hướng di động">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenus}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors"
              >
                <link.icon size={19} className="text-amber-600" />
                {link.label}
              </Link>
            ))}

            <Link
              href="/practice"
              onClick={closeMenus}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-bold transition-colors ${
                isSkillsPath
                  ? "bg-amber-50 text-amber-900"
                  : "text-slate-700 hover:bg-amber-50 hover:text-amber-900"
              }`}
            >
              <Dumbbell size={19} className="text-amber-600" />
              Trung tâm luyện kỹ năng
            </Link>

            <p className="px-4 pb-1 pt-5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Luyện theo kỹ năng
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/practice/listening"
                onClick={closeMenus}
                  className="flex items-center gap-2 p-3 rounded-xl bg-blue-50/70 border border-blue-200/50 text-xs font-bold text-blue-900"
                >
                  <Headphones size={16} aria-hidden="true" /> Luyện Nghe
              </Link>
              <Link
                href="/practice/speaking"
                onClick={closeMenus}
                  className="flex items-center gap-2 p-3 rounded-xl bg-purple-50/70 border border-purple-200/50 text-xs font-bold text-purple-900"
                >
                  <Mic size={16} aria-hidden="true" /> Luyện nói
              </Link>
              <Link
                href="/practice/reading"
                onClick={closeMenus}
                  className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/50 text-xs font-bold text-emerald-900"
                >
                  <BookOpen size={16} aria-hidden="true" /> Luyện Đọc
              </Link>
              <Link
                href="/practice/writing"
                onClick={closeMenus}
                  className="flex items-center gap-2 p-3 rounded-xl bg-rose-50/70 border border-rose-200/50 text-xs font-bold text-rose-900"
                >
                  <PenTool size={16} aria-hidden="true" /> Luyện Viết AI
              </Link>
            </div>
          </nav>

          <div className="mt-8 grid gap-3 border-t border-slate-100 pt-6">
            {isStudent && (
              <>
                <Link
                  href="/student/profile"
                  onClick={closeMenus}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 font-bold text-amber-900"
                >
                  <User size={18} /> Hồ sơ cá nhân & Gói học
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 font-bold text-rose-600"
                >
                  Đăng xuất
                </button>
              </>
            )}
            {!user && (
              <>
                <Link
                  href="/login"
                  onClick={closeMenus}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 font-bold text-slate-700"
                >
                  <LogIn size={18} /> Đăng nhập
                </Link>
                <Link
                  href="/register"
                  onClick={closeMenus}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 font-bold text-white shadow-sm"
                >
                  Đăng ký miễn phí <ArrowRight size={18} />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
