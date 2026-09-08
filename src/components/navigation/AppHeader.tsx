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
  Sparkles,
  Target,
  Trophy,
  User,
  X,
  Bell,
  LogOut,
  Flame,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";

const emptySubscribe = () => () => {};

function isActivePath(pathname: string, href: string) {
  if (href === "/" || href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
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

  const primaryLinks = isStudent
    ? [
        { label: "Trang chủ", href: "/dashboard", icon: Home },
        { label: "Khóa học của tôi", href: "/my-courses", icon: BookOpen },
        { label: "Luyện đề TOEIC", href: "/practice/quizzes", icon: Target },
        { label: "Cửa hàng", href: "/market", icon: ShoppingBag },
        { label: "Bảng xếp hạng", href: "/arena", icon: Trophy },
      ]
    : [
        { label: "Trang chủ", href: "/", icon: Home },
        { label: "Khóa học", href: "/courses", icon: BookOpen },
        { label: "Luyện đề TOEIC", href: "/practice/quizzes", icon: Target },
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
              <span className="text-2xl" role="img" aria-label="BreadTrans Bánh Mì">🍞</span>
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
            <span className="shrink-0 text-base leading-none">🏠</span>
            <span className="whitespace-nowrap">Trang chủ</span>
          </Link>

          {/* Dropdown Luyện kỹ năng */}
          <div
            ref={skillsRef}
            className="relative shrink-0 group"
            onMouseEnter={() => setSkillsOpen(true)}
            onMouseLeave={() => setSkillsOpen(false)}
          >
            <button
              type="button"
              onClick={() => setSkillsOpen((prev) => !prev)}
              aria-expanded={skillsOpen}
              className={`px-3 xl:px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors font-bold focus:outline-none cursor-pointer shrink-0 whitespace-nowrap ${
                skillsOpen || pathname.startsWith("/practice") || pathname.startsWith("/flashcard") || pathname.startsWith("/grammar")
                  ? "text-amber-800 bg-amber-50/80 font-black"
                  : "text-slate-600 hover:text-amber-800 hover:bg-amber-50/50"
              }`}
            >
              <span className="shrink-0 text-base leading-none">🎯</span>
              <span className="whitespace-nowrap">Luyện kỹ năng</span>
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
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xl p-2 space-y-1">
                {/* 1. Luyện nghe */}
                <Link
                  href="/practice"
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

                {/* 2. Luyện nói và phát âm */}
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
                      Luyện nói và phát âm
                    </div>
                    <div className="text-xs font-semibold text-slate-500 leading-snug mt-0.5">
                      Cải thiện phát âm, ngữ điệu và phản xạ với trợ lý AI.
                    </div>
                  </div>
                </Link>

                {/* 3. Luyện đọc */}
                <Link
                  href="/practice"
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

              {/* Notification Bell */}
              <button
                type="button"
                aria-label="Thông báo"
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>

              {/* Student Avatar & Dropdown */}
              <div ref={profileRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  aria-expanded={profileMenuOpen}
                  aria-label="Menu tài khoản"
                  className="flex items-center gap-1.5 p-0.5 rounded-full ring-2 ring-amber-500/60 hover:ring-amber-600 transition-all focus:outline-none cursor-pointer shrink-0"
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
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 shrink-0 whitespace-nowrap"
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

            <p className="px-4 pb-1 pt-5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Luyện tập 4 kỹ năng AI
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/practice"
                onClick={closeMenus}
                className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/50 text-xs font-bold text-blue-900"
              >
                🎧 Luyện Nghe
              </Link>
              <Link
                href="/practice/speaking"
                onClick={closeMenus}
                className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/50 text-xs font-bold text-purple-900"
              >
                🎙️ Luyện Nói AI
              </Link>
              <Link
                href="/practice"
                onClick={closeMenus}
                className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/50 text-xs font-bold text-emerald-900"
              >
                📖 Luyện Đọc
              </Link>
              <Link
                href="/practice/writing"
                onClick={closeMenus}
                className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/50 text-xs font-bold text-rose-900"
              >
                ✍️ Luyện Viết AI
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
