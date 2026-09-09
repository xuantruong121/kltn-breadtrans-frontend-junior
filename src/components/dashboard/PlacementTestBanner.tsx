"use client";

import Link from "next/link";
import { ArrowRight, Compass, Gift } from "lucide-react";
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
        className="relative overflow-hidden rounded-3xl border-2 border-amber-200/90 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50/40 p-6 sm:p-7 shadow-xs"
      >
        {/* Subtle decorative blurred orb */}
        <div
          className="pointer-events-none absolute -right-10 -bottom-10 size-48 rounded-full bg-orange-200/40 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Visual Icon Anchor */}
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-900/10">
              <Compass size={28} strokeWidth={2.2} aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-900">
                  Kiểm tra năng lực đầu vào
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200/80 bg-orange-100/90 px-3 py-1 text-xs font-bold text-orange-900">
                  <Gift size={13} className="text-orange-700 shrink-0" aria-hidden="true" />
                  <span>Thưởng ngay +50 Bánh mì & Huy hiệu Tân thủ</span>
                </span>
              </div>

              <h2 className="text-lg font-black text-slate-900 sm:text-xl leading-snug">
                Xác định trình độ của bạn để nhận lộ trình cá nhân hóa
              </h2>

              <p className="max-w-3xl text-xs sm:text-sm text-slate-600 leading-relaxed">
                Chỉ mất 10-15 phút để kiểm tra nhanh trình độ từ vựng, ngữ pháp và phát âm. Hoàn thành ngay để mở khóa toàn bộ bài học phù hợp và nhận quà thưởng!
              </p>
            </div>
          </div>

          {/* Primary CTA Button */}
          <div className="flex items-center lg:self-center shrink-0">
            <Link
              href="/diagnostic"
              className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-amber-600 px-6 py-3.5 text-sm font-black text-white shadow-xs transition-all hover:bg-amber-700 hover:scale-[1.02] active:scale-95"
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
