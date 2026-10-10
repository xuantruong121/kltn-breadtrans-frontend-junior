"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import type { PetDialogueContent } from "../dialogueLogic";

export interface PetSpeechBubbleProps {
  dialogue: PetDialogueContent | null;
  isVisible: boolean;
  onDismiss: () => void;
  onActionClick?: () => void;
  onOpenDetails?: () => void;
}

export function PetSpeechBubble({
  dialogue,
  isVisible,
  onDismiss,
  onActionClick,
  onOpenDetails,
}: PetSpeechBubbleProps) {
  return (
    <AnimatePresence>
      {isVisible && dialogue && (
        <motion.div
          role="dialog"
          aria-live="polite"
          aria-label={dialogue.header}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="absolute bottom-[calc(100%+12px)] right-0 w-64 max-w-[calc(100vw-2.5rem)] sm:max-w-[280px] bg-white dark:bg-slate-900 border border-amber-200/90 dark:border-amber-500/30 shadow-xl rounded-2xl p-3.5 z-50 select-none after:content-[''] after:absolute after:bottom-[-8px] after:right-6 after:w-4 after:h-4 after:bg-white dark:after:bg-slate-900 after:border-b after:border-r after:border-amber-200/90 dark:after:border-amber-500/30 after:rotate-45"
        >
          {/* Header with micro status indicator & subtle close button */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <span className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <span>{dialogue.header}</span>
            </span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Đóng lời nhắn"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none cursor-pointer"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          {/* Dialogue Text */}
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-snug font-medium mb-3">
            {dialogue.text}
          </p>

          {/* Micro CTA Button & Details Link */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {onOpenDetails ? (
              <button
                type="button"
                onClick={() => {
                  onDismiss();
                  onOpenDetails();
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Mở chi tiết
              </button>
            ) : <span />}

            {dialogue.action && (
              dialogue.action.url ? (
                <Link
                  href={dialogue.action.url}
                  onClick={() => {
                    onActionClick?.();
                    onDismiss();
                  }}
                  className="inline-flex min-h-[30px] items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none shadow-xs"
                >
                  <span>{dialogue.action.label}</span>
                  <ArrowRight size={12} aria-hidden="true" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onActionClick?.();
                    onDismiss();
                  }}
                  className="inline-flex min-h-[30px] items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none shadow-xs"
                >
                  <span>{dialogue.action.label}</span>
                  <ArrowRight size={12} aria-hidden="true" />
                </button>
              )
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PetSpeechBubble;
