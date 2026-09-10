"use client";

import React, { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

export interface PracticeExitConfirmDialogProps {
  isOpen: boolean;
  onStay: () => void;
  onConfirmExit: () => void;
  isNavigating?: boolean;
}

export function PracticeExitConfirmDialog({
  isOpen,
  onStay,
  onConfirmExit,
  isNavigating = false,
}: PracticeExitConfirmDialogProps) {
  const stayButtonRef = useRef<HTMLButtonElement | null>(null);
  const exitButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Focus management: focus secondary button ("Ở lại học tiếp") by default on open
  useEffect(() => {
    if (isOpen) {
      // Small timeout to ensure DOM element is mounted and rendered
      const timer = setTimeout(() => {
        stayButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle keyboard events (Escape key closes as "Ở lại học tiếp", Tab traps focus)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onStay();
        return;
      }

      if (e.key === "Tab") {
        const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex="0"]'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onStay]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        // Clicking backdrop closes modal safely as "Ở lại học tiếp"
        if (e.target === e.currentTarget && !isNavigating) {
          onStay();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-confirm-title"
        aria-describedby="exit-confirm-description"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in zoom-in-95 duration-150"
      >
        <h3
          id="exit-confirm-title"
          className="text-lg font-extrabold text-slate-900"
        >
          Thoát bài luyện?
        </h3>

        <p
          id="exit-confirm-description"
          className="mt-2 text-sm leading-relaxed text-slate-600"
        >
          Nếu thoát lúc này, toàn bộ tiến độ của bài luyện này sẽ bị xoá và bạn sẽ phải làm lại từ đầu.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          {/* Secondary: "Ở lại học tiếp" */}
          <button
            ref={stayButtonRef}
            type="button"
            onClick={onStay}
            disabled={isNavigating}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer"
          >
            Ở lại học tiếp
          </button>

          {/* Destructive/primary exit action: "Thoát bài luyện" */}
          <button
            ref={exitButtonRef}
            type="button"
            onClick={onConfirmExit}
            disabled={isNavigating}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 text-sm font-bold text-white shadow-xs transition hover:bg-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer"
          >
            {isNavigating ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" aria-hidden="true" />
                <span>Đang rời...</span>
              </>
            ) : (
              "Thoát bài luyện"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
