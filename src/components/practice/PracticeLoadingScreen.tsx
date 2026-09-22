"use client";

import React, { useEffect, useState } from "react";
import { BrandIcon } from "@/components/brand";

export type PracticeSkill = "listening" | "speaking" | "reading" | "writing";

export interface PracticeLoadingScreenProps {
  /**
   * The active practice skill, used to derive contextual secondary text.
   */
  skill?: PracticeSkill;
  /**
   * Optional custom primary text override.
   * Defaults to: "Đậu đang chuẩn bị bài luyện cho bạn"
   */
  mainText?: string;
  /**
   * Optional custom secondary text override.
   */
  secondaryText?: string;
  /**
   * Delay in milliseconds before rendering (default: 0 for instant, perceptible launch display).
   */
  delayMs?: number;
  /**
   * Additional CSS class names.
   */
  className?: string;
}

const SKILL_SECONDARY_TEXT_MAP: Record<PracticeSkill, string> = {
  listening: "Đang chuẩn bị bài nghe",
  speaking: "Đang chuẩn bị bài luyện nói",
  reading: "Đang chuẩn bị bài đọc",
  writing: "Đang chuẩn bị bài viết",
};

export function PracticeLoadingScreen({
  skill,
  mainText = "Đậu đang chuẩn bị bài luyện cho bạn",
  secondaryText,
  delayMs = 0,
  className = "",
}: PracticeLoadingScreenProps) {
  const [shouldRender, setShouldRender] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) return;
    const timer = setTimeout(() => setShouldRender(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!shouldRender) {
    return null;
  }

  const resolvedSecondaryText =
    secondaryText || (skill ? SKILL_SECONDARY_TEXT_MAP[skill] : "Đang tải dữ liệu bài luyện");

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mx-auto flex min-h-[380px] w-full max-w-3xl flex-col items-center justify-center rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-8 text-center sm:p-12 ${className}`}
    >
      {/* Centered BreadTrans brand asset */}
      <div className="mb-4">
        <BrandIcon size="xl" hasContainer animated />
      </div>

      {/* Main text */}
      <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 sm:text-lg">
        {mainText}
      </h2>

      {/* Contextual secondary text by skill */}
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:text-sm">
        {resolvedSecondaryText}
      </p>

      {/* Three subtle CSS loading dots */}
      <div
        className="mt-4 flex items-center justify-center gap-1.5"
        aria-hidden="true"
      >
        <span
          className="size-2 rounded-full bg-slate-400 animate-bounce motion-reduce:animate-none"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="size-2 rounded-full bg-slate-400 animate-bounce motion-reduce:animate-none"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="size-2 rounded-full bg-slate-400 animate-bounce motion-reduce:animate-none"
          style={{ animationDelay: "300ms" }}
        />
      </div>

      <span className="sr-only">
        {mainText}. {resolvedSecondaryText}.
      </span>
    </div>
  );
}
