"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, BookOpen, Target, User } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

interface MobileBottomNavProps {
  onOpenSkills?: () => void;
  onOpenAccount?: () => void;
}

export function MobileBottomNav({ onOpenSkills, onOpenAccount }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const isHome = pathname === "/" || pathname === "/dashboard";
  const isToeic = pathname.startsWith("/practice/quizzes");
  const isSkills =
    (pathname.startsWith("/practice") && !pathname.startsWith("/practice/quizzes")) ||
    pathname.startsWith("/flashcard") ||
    pathname.startsWith("/grammar");
  const isCourses = pathname.startsWith("/courses") || pathname.startsWith("/my-courses");
  const isProfile = pathname.startsWith("/student/profile");

  return (
    <nav
      aria-label="Điều hướng di động dưới cùng"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] px-3 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.04)] lg:hidden"
    >
      {/* 1. Trang chủ */}
      <Link
        href={user ? "/dashboard" : "/"}
        className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
          isHome ? "text-amber-700 font-bold" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <Home size={20} className={isHome ? "stroke-[2.5]" : "stroke-2"} />
        <span className="text-[11px]">Trang chủ</span>
      </Link>

      {/* 2. Trung tâm kỹ năng */}
      {onOpenSkills ? (
        <button
          type="button"
          onClick={onOpenSkills}
          className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 py-1 transition-colors cursor-pointer ${
            isSkills ? "text-amber-700 font-bold" : "text-slate-500 hover:text-amber-700"
          }`}
        >
          <Compass size={20} className={isSkills ? "stroke-[2.5]" : "stroke-2"} />
          <span className="text-[11px] font-semibold">Kỹ năng</span>
        </button>
      ) : (
        <Link
          href="/practice"
          className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
            isSkills ? "text-amber-700 font-bold" : "text-slate-500 hover:text-amber-700"
          }`}
        >
          <Compass size={20} className={isSkills ? "stroke-[2.5]" : "stroke-2"} />
          <span className="text-[11px] font-semibold">Kỹ năng</span>
        </Link>
      )}

      {/* 3. Luyện đề TOEIC */}
      <Link
        href="/practice/quizzes"
        className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
          isToeic ? "text-amber-700 font-bold" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <Target size={20} className={isToeic ? "stroke-[2.5]" : "stroke-2"} />
        <span className="text-[11px]">Luyện đề</span>
      </Link>

      {/* 4. Khóa học */}
      <Link
        href={user ? "/my-courses" : "/courses"}
        className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
          isCourses ? "text-amber-700 font-bold" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <BookOpen size={20} className={isCourses ? "stroke-[2.5]" : "stroke-2"} />
        <span className="text-[11px]">Khóa học</span>
      </Link>

      {/* 5. Tài khoản / Đăng nhập */}
      {user ? (
        <Link
          href="/student/profile"
          className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
            isProfile ? "text-amber-700 font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <User size={20} className={isProfile ? "stroke-[2.5]" : "stroke-2"} />
          <span className="text-[11px]">Hồ sơ</span>
        </Link>
      ) : onOpenAccount ? (
        <button
          type="button"
          onClick={onOpenAccount}
          className="flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 py-1 text-slate-500 hover:text-amber-700 transition-colors cursor-pointer"
        >
          <User size={20} className="stroke-2" />
          <span className="text-[11px] font-semibold">Tài khoản</span>
        </button>
      ) : (
        <Link
          href="/login"
          className="flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 py-1 text-slate-500 hover:text-amber-700 transition-colors"
        >
          <User size={20} className="stroke-2" />
          <span className="text-[11px] font-semibold">Tài khoản</span>
        </Link>
      )}
    </nav>
  );
}
