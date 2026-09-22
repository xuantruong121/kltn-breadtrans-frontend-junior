"use client";

import React, { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme/useTheme";

const emptySubscribe = () => () => {};

interface ThemeToggleProps {
  className?: string;
  variant?: "button" | "row";
  showLabel?: boolean;
}

export function ThemeToggle({
  className = "",
  variant = "button",
  showLabel = false,
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  // Safe hydration check without triggering cascading setState in useEffect
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isDark = mounted ? resolvedTheme === "dark" : false;
  const label = isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối";

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        aria-pressed={isDark}
        title={label}
        className={`w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer hover:bg-amber-50 dark:hover:bg-slate-800 hover:border-amber-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-2xs">
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </div>
          <span>Giao diện: {isDark ? "Chế độ tối" : "Chế độ sáng"}</span>
        </div>
        <div
          className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center ${
            isDark ? "bg-amber-500 justify-end" : "bg-slate-300 dark:bg-slate-600 justify-start"
          }`}
        >
          <div className="size-5 rounded-full bg-white shadow-md transform transition-transform" />
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className={`inline-flex min-h-11 min-w-11 size-9 sm:size-10 items-center justify-center rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-200 shadow-2xs transition-all hover:border-amber-300 dark:hover:border-slate-600 hover:bg-amber-50 dark:hover:bg-slate-800 hover:text-amber-700 dark:hover:text-amber-400 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer shrink-0 ${className}`}
    >
      {/* Icon with subtle rotate micro-transition */}
      <span className="transition-transform duration-200 hover:rotate-12">
        {isDark ? (
          <Sun size={18} className="text-amber-400" />
        ) : (
          <Moon size={18} className="text-slate-600 dark:text-slate-300" />
        )}
      </span>
      {showLabel && (
        <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          {isDark ? "Tối" : "Sáng"}
        </span>
      )}
    </button>
  );
}
