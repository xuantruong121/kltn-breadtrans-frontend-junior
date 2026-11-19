"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Compass,
  Headphones,
  Home,
  Layers,
  Mic,
  PenTool,
  SpellCheck,
  Target,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { isExamRoute, isSkillsRoute, SKILL_SHEET_ITEMS } from "./navUtils";

const SKILL_ICONS: Record<string, LucideIcon> = {
  "/listening": Headphones,
  "/speaking": Mic,
  "/reading": BookOpen,
  "/writing": PenTool,
  "/flashcard": Layers,
  "/grammar": SpellCheck,
};

interface MobileBottomNavProps {
  onOpenAccount?: () => void;
}

export function MobileBottomNav({ onOpenAccount }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [skillsOpen, setSkillsOpen] = useState(false);
  // A new page closes the sheet. Adjusted during render, not in an effect.
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setSkillsOpen(false);
  }

  useEffect(() => {
    if (!skillsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSkillsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [skillsOpen]);

  const isHome = pathname === "/" || pathname === "/dashboard";
  const isToeic = isExamRoute(pathname);
  const isSkills = isSkillsRoute(pathname);
  const isProfile = pathname.startsWith("/hub");

  return (
    <>
      {skillsOpen && (
        <div className="fixed inset-0 z-[90] md:hidden" role="dialog" aria-modal="true" aria-labelledby="skills-sheet-title">
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setSkillsOpen(false)}
            className="absolute inset-0 cursor-default bg-slate-950/40"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-slate-200 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <p id="skills-sheet-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Luyện tập kỹ năng
              </p>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setSkillsOpen(false)}
                className="grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <ul className="divide-y divide-slate-100 px-2 dark:divide-slate-800">
              {SKILL_SHEET_ITEMS.map((item) => {
                const Icon = SKILL_ICONS[item.href] ?? Compass;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSkillsOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 items-center gap-3 rounded-lg px-3 text-base transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                        active ? "font-semibold text-amber-700 dark:text-amber-400" : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <Icon
                        size={20}
                        aria-hidden="true"
                        className={active ? "text-amber-700 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <nav
        aria-label="Điều hướng di động dưới cùng"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800/90 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] px-3 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.04)] md:hidden transition-colors duration-150"
      >
        {/* 1. Trang chủ */}
        <Link
          href={user ? "/dashboard" : "/"}
          className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
            isHome
              ? "text-amber-700 dark:text-amber-400 font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Home size={20} className={isHome ? "stroke-[2.5]" : "stroke-2"} />
          <span className="text-xs">Trang chủ</span>
        </Link>

        {/* 2. Kỹ năng: opens the skills sheet */}
        <button
          type="button"
          onClick={() => setSkillsOpen((open) => !open)}
          aria-haspopup="dialog"
          aria-expanded={skillsOpen}
          className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 py-1 transition-colors cursor-pointer ${
            isSkills || skillsOpen
              ? "text-amber-700 dark:text-amber-400 font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-400"
          }`}
        >
          <Compass size={20} className={isSkills ? "stroke-[2.5]" : "stroke-2"} />
          <span className="text-xs font-semibold">Kỹ năng</span>
        </button>

        {/* 3. Luyện đề TOEIC */}
        <Link
          href="/exams"
          className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
            isToeic
              ? "text-amber-700 dark:text-amber-400 font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Target size={20} className={isToeic ? "stroke-[2.5]" : "stroke-2"} />
          <span className="text-xs">Luyện đề</span>
        </Link>

        {/* 4. Tài khoản / Đăng nhập */}
        {user ? (
          <Link
            href="/hub?tab=account-profile"
            className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
              isProfile
                ? "text-amber-700 dark:text-amber-400 font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <User size={20} className={isProfile ? "stroke-[2.5]" : "stroke-2"} />
            <span className="text-xs">Hồ sơ</span>
          </Link>
        ) : onOpenAccount ? (
          <button
            type="button"
            onClick={onOpenAccount}
            className="flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 py-1 text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-400 transition-colors cursor-pointer"
          >
            <User size={20} className="stroke-2" />
            <span className="text-xs font-semibold">Tài khoản</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 py-1 text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
          >
            <User size={20} className="stroke-2" />
            <span className="text-xs font-semibold">Tài khoản</span>
          </Link>
        )}
      </nav>
    </>
  );
}
