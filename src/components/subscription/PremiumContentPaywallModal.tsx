"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowRight, X } from "lucide-react";
import { useModalAccessibility } from "@/hooks/useModalAccessibility";

export type PremiumSkillType =
  | "READING"
  | "LISTENING"
  | "SPEAKING"
  | "WRITING"
  | "VOCABULARY";

export interface PremiumContentPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  skillType?: PremiumSkillType;
  title?: string;
  itemTitle?: string;
  description?: string;
}

export const PremiumContentPaywallModal: React.FC<PremiumContentPaywallModalProps> = ({
  isOpen,
  onClose,
  skillType,
  title = "Nội dung dành cho PLUS",
  itemTitle,
  description = "Nâng cấp PLUS để mở khóa thêm nội dung luyện tập.",
}) => {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);

  useModalAccessibility({
    isOpen,
    onClose,
    modalRef,
  });

  if (!isOpen) return null;

  const handleNavigateToPlans = () => {
    onClose();
    router.push("/plans?highlight=plus");
  };

  const getSkillLabel = () => {
    switch (skillType) {
      case "READING":
        return "Bài đọc";
      case "LISTENING":
        return "Bài nghe";
      case "SPEAKING":
        return "Bài nói";
      case "WRITING":
        return "Bài viết";
      case "VOCABULARY":
        return "Chủ đề";
      default:
        return "Nội dung";
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        aria-describedby="paywall-desc"
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 outline-none"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          {/* Icon Badge */}
          <div className="flex items-center gap-3 mb-4">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <Lock size={22} aria-hidden="true" />
            </span>
            <div>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                Nội dung PLUS
              </span>
            </div>
          </div>

          {/* Title & Body */}
          <h2
            id="paywall-title"
            className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            {title}
          </h2>

          {itemTitle && (
            <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-400 truncate">
              {getSkillLabel()}: {itemTitle}
            </p>
          )}

          <p
            id="paywall-desc"
            className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
          >
            {description}
          </p>

          {/* Verified Entitlement Highlights */}
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 space-y-2">
            {skillType === "VOCABULARY" ? (
              <>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-600 dark:text-amber-400 font-bold">•</span>
                  <span>Toàn quyền học và ôn tập bộ từ vựng chuyên sâu</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-600 dark:text-amber-400 font-bold">•</span>
                  <span>Bài tập và thẻ ôn tập cho các chủ đề từ vựng Premium</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-600 dark:text-amber-400 font-bold">•</span>
                  <span>Mở khóa toàn bộ kho bài đọc và bài nghe Premium</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-600 dark:text-amber-400 font-bold">•</span>
                  <span>Mở khóa toàn bộ bài luyện nói và bài viết Premium</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-600 dark:text-amber-400 font-bold">•</span>
                  <span>Mở khóa toàn bộ chủ đề Từ vựng Premium</span>
                </div>
              </>
            )}
          </div>

          {/* Action CTAs */}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Để sau
            </button>
            <button
              type="button"
              onClick={handleNavigateToPlans}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-5 text-xs font-bold text-white shadow-xs hover:bg-amber-600 transition-colors cursor-pointer"
            >
              <span>Xem gói PLUS</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
