"use client";

import Link from "next/link";
import { ArrowRight, Target, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PlacementTestBannerProps {
  hasCompleted?: boolean;
}

export function PlacementTestBanner({ hasCompleted = false }: PlacementTestBannerProps) {
  if (hasCompleted) return null;

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, overflow: "hidden", marginBottom: 0, transition: { duration: 0.3 } }}
        aria-label="Kiểm tra năng lực đầu vào"
        className="relative overflow-hidden rounded-3xl border border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-6 sm:p-7 shadow-xs"
      >
        {/* Subtle decorative blurred orb */}
        <div
          className="pointer-events-none absolute -right-10 -bottom-10 size-48 rounded-full bg-blue-200/30 dark:bg-blue-900/20 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Visual Icon Anchor */}
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20">
              <Target size={28} strokeWidth={2.2} aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/90 dark:bg-blue-950/70 border border-blue-200/90 dark:border-blue-800/60 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-200">
                  Kiểm tra năng lực đầu vào
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/90 dark:border-amber-800/60 bg-amber-100/90 dark:bg-amber-950/70 px-3 py-1 text-xs font-bold text-amber-900 dark:text-amber-200 shadow-2xs">
                  <Gift size={13} className="text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />
                  <span>Thưởng ngay +50 Bánh mì & Huy hiệu Tân thủ</span>
                </span>
              </div>

              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 sm:text-xl leading-snug">
                Xác định trình độ của bạn để nhận lộ trình cá nhân hóa
              </h2>

              <p className="max-w-3xl text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Chỉ mất 10-15 phút để kiểm tra nhanh trình độ từ vựng, ngữ pháp và phát âm. Hoàn thành ngay để mở khóa toàn bộ bài học phù hợp và nhận quà thưởng!
              </p>
            </div>
          </div>

          {/* Primary CTA Button */}
          <div className="flex items-center lg:self-center shrink-0">
            <Link
              href="/diagnostic"
              className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-black text-white shadow-md shadow-blue-600/20 transition-all hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-95"
            >
              <span>Làm bài kiểm tra ngay</span>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
