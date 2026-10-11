"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
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
          className="absolute bottom-[calc(100%+14px)] right-0 w-72 sm:w-84 max-w-[calc(100vw-2.5rem)] bg-white dark:bg-slate-900 border-2 border-amber-300/90 dark:border-amber-500/40 shadow-2xl rounded-3xl p-4 sm:p-5 z-50 select-none after:content-[''] after:absolute after:bottom-[-9px] after:right-5 sm:after:right-6 after:w-4.5 after:h-4.5 after:bg-white dark:after:bg-slate-900 after:border-b-2 after:border-r-2 after:border-amber-300/90 dark:after:border-amber-500/40 after:rotate-45"
        >
          {/* Header with micro status indicator & subtle close button */}
          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-amber-100/80 dark:border-slate-800">
            <span className="font-bold text-sm sm:text-base text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <span>{dialogue.header}</span>
            </span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Đóng hội thoại"
              className="size-7 -mr-1 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {/* Dialogue Text */}
          <p className="text-base sm:text-lg text-slate-800 dark:text-slate-100 leading-relaxed font-semibold">
            {dialogue.text}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PetSpeechBubble;
