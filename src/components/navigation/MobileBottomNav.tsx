"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CircleHelp,
  Compass,
  Ellipsis,
  Headphones,
  Home,
  Layers,
  LogIn,
  Mic,
  PawPrint,
  PenTool,
  ShoppingBag,
  Swords,
  Target,
  Trophy,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import {
  GUEST_MORE_SHEET_ITEMS,
  isArenaRoute,
  isExamRoute,
  isMoreSheetRoute,
  isSkillsRoute,
  MORE_SHEET_ITEMS,
  SKILL_SHEET_ITEMS,
  type NavItemConfig,
} from "./navUtils";

const SHEET_ICONS: Record<string, LucideIcon> = {
  "/listening": Headphones,
  "/speaking": Mic,
  "/reading": BookOpen,
  "/writing": PenTool,
  "/flashcard": Layers,
  "/ranking": Trophy,
  "/market": ShoppingBag,
  "/pet": PawPrint,
  "/help": CircleHelp,
  "/hub?tab=account-profile": UserRound,
  "/login": LogIn,
};

type Sheet = "skills" | "more" | null;

/** A bottom sheet of links, shared by "Kỹ năng" and "Thêm". */
function NavSheet({
  id,
  title,
  items,
  pathname,
  onClose,
}: {
  id: string;
  title: string;
  items: NavItemConfig[];
  pathname: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] md:hidden" role="dialog" aria-modal="true" aria-labelledby={id}>
      <button type="button" aria-label="Đóng" onClick={onClose} className="absolute inset-0 cursor-default bg-slate-950/40" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-slate-200 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between px-4 pb-1 pt-3">
          <p id={id} className="text-base font-bold text-slate-900 dark:text-slate-100">
            {title}
          </p>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <ul className="divide-y divide-slate-100 px-2 dark:divide-slate-800">
          {items.map((item) => {
            const Icon = SHEET_ICONS[item.href] ?? Compass;
            const base = item.href.split("?")[0];
            const active = pathname === base || pathname.startsWith(`${base}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
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
  );
}

const TAB =
  "flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors";
const tabTone = (active: boolean) =>
  active
    ? "text-amber-700 dark:text-amber-400 font-bold"
    : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200";
const LABEL = "max-w-full truncate text-[11px] min-[360px]:text-xs";

/**
 * The phone's bottom bar (owner 2026-11-19): Trang chủ, Kỹ năng, Luyện đề,
 * Đấu trường and Thêm. A signed-in phone has no header menu, so "Thêm" is the
 * way to the ranking, shop, pet, FAQ and account.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [sheet, setSheet] = useState<Sheet>(null);
  // A new page closes the sheet. Adjusted during render, not in an effect.
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setSheet(null);
  }

  useEffect(() => {
    if (!sheet) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheet(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sheet]);

  const toggle = (next: Exclude<Sheet, null>) => setSheet((open) => (open === next ? null : next));
  const isHome = pathname === "/" || pathname === "/dashboard";
  const isExams = isExamRoute(pathname);
  const isSkills = isSkillsRoute(pathname);
  const isArena = isArenaRoute(pathname);
  const isMore = isMoreSheetRoute(pathname);

  return (
    <>
      {sheet === "skills" && (
        <NavSheet id="skills-sheet-title" title="Luyện tập kỹ năng" items={SKILL_SHEET_ITEMS} pathname={pathname} onClose={() => setSheet(null)} />
      )}
      {sheet === "more" && (
        <NavSheet
          id="more-sheet-title"
          title="Thêm"
          items={user ? MORE_SHEET_ITEMS : GUEST_MORE_SHEET_ITEMS}
          pathname={pathname}
          onClose={() => setSheet(null)}
        />
      )}

      <nav
        aria-label="Điều hướng di động dưới cùng"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800/90 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] px-1 min-[360px]:px-2 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.04)] md:hidden transition-colors duration-150"
      >
        <Link href={user ? "/dashboard" : "/"} aria-current={isHome ? "page" : undefined} className={`${TAB} ${tabTone(isHome)}`}>
          <Home size={20} aria-hidden="true" className={isHome ? "stroke-[2.5]" : "stroke-2"} />
          <span className={LABEL}>Trang chủ</span>
        </Link>

        <button
          type="button"
          onClick={() => toggle("skills")}
          aria-haspopup="dialog"
          aria-expanded={sheet === "skills"}
          className={`${TAB} cursor-pointer ${tabTone(isSkills || sheet === "skills")}`}
        >
          <Compass size={20} aria-hidden="true" className={isSkills ? "stroke-[2.5]" : "stroke-2"} />
          <span className={LABEL}>Kỹ năng</span>
        </button>

        <Link href="/exams" aria-current={isExams ? "page" : undefined} className={`${TAB} ${tabTone(isExams)}`}>
          <Target size={20} aria-hidden="true" className={isExams ? "stroke-[2.5]" : "stroke-2"} />
          <span className={LABEL}>Luyện đề</span>
        </Link>

        <Link href="/arena" aria-current={isArena ? "page" : undefined} className={`${TAB} ${tabTone(isArena)}`}>
          <Swords size={20} aria-hidden="true" className={isArena ? "stroke-[2.5]" : "stroke-2"} />
          <span className={LABEL}>Đấu trường</span>
        </Link>

        <button
          type="button"
          onClick={() => toggle("more")}
          aria-haspopup="dialog"
          aria-expanded={sheet === "more"}
          className={`${TAB} cursor-pointer ${tabTone(isMore || sheet === "more")}`}
        >
          <Ellipsis size={20} aria-hidden="true" className={isMore ? "stroke-[2.5]" : "stroke-2"} />
          <span className={LABEL}>Thêm</span>
        </button>
      </nav>
    </>
  );
}
