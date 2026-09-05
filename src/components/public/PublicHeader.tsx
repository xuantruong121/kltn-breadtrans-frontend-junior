"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { BookOpen, Menu, X, ArrowRight, LayoutDashboard } from "lucide-react";

const emptySubscribe = () => () => {};

export function PublicHeader() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isReady = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const navLinks = [
    { name: "Trang chủ", href: "/" },
    { name: "Khóa học", href: "/courses" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl bg-junior-blue flex items-center justify-center text-white font-bold text-2xl shadow-sm transition-transform group-hover:scale-105">
            B
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight text-slate-800 leading-tight">
              BreadTrans <span className="text-junior-blue font-extrabold">Junior</span>
            </span>
            <span className="text-xs font-semibold text-slate-400">Tiếng Anh & TOEIC Tương Tác</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-base font-bold transition-colors pb-1 border-b-2 ${
                  isActive
                    ? "text-junior-blue border-junior-blue"
                    : "text-slate-600 border-transparent hover:text-slate-900"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth State CTA */}
        <div className="hidden md:flex items-center gap-4">
          {isReady && user ? (
            <div className="flex items-center gap-3">
              {user.role === "STUDENT" && (
                <>
                  <Link
                    href="/my-courses"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <BookOpen size={18} />
                    Lớp của tôi
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-junior-blue text-white hover:bg-junior-blue-dark transition-colors shadow-xs"
                  >
                    <LayoutDashboard size={18} />
                    Vào học
                  </Link>
                </>
              )}
              {user.role === "TEACHER" && (
                <Link
                  href="/teacher/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-junior-blue text-white hover:bg-junior-blue-dark transition-colors shadow-xs"
                >
                  <LayoutDashboard size={18} />
                  Khu vực giảng viên
                </Link>
              )}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
                >
                  <LayoutDashboard size={18} />
                  Bảng quản trị
                </Link>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-xl text-base font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-base font-bold bg-junior-orange text-white hover:bg-junior-orange-dark transition-all shadow-xs"
              >
                Đăng ký ngay
                <ArrowRight size={18} strokeWidth={2.5} />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2.5 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          aria-label="Menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-6 space-y-4">
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-lg font-bold text-slate-700 py-2 hover:text-junior-blue transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
            {isReady && user ? (
              user.role === "STUDENT" ? (
                <>
                  <Link
                    href="/my-courses"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold bg-slate-100 text-slate-700"
                  >
                    <BookOpen size={18} /> Lớp của tôi
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold bg-junior-blue text-white"
                  >
                    <LayoutDashboard size={18} /> Vào học
                  </Link>
                </>
              ) : user.role === "TEACHER" ? (
                <Link
                  href="/teacher/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold bg-junior-blue text-white"
                >
                  <LayoutDashboard size={18} /> Khu vực giảng viên
                </Link>
              ) : (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold bg-slate-900 text-white"
                >
                  <LayoutDashboard size={18} /> Bảng quản trị
                </Link>
              )
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center w-full py-3 rounded-xl font-bold bg-slate-100 text-slate-700"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold bg-junior-orange text-white"
                >
                  Đăng ký ngay <ArrowRight size={18} />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
