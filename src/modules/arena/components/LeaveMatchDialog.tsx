"use client";

import React, { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LogOut } from "lucide-react";

/** Asks before leaving a running match: leaving loses it at once. */
export function LeaveMatchDialog({
  stake,
  rivalName,
  title = "Thoát trận đấu?",
  message,
  pending,
  onStay,
  onLeave,
}: {
  stake: number;
  rivalName?: string;
  title?: string;
  /** Replaces the 1v1 wording, e.g. for Pháo Bánh Mì. */
  message?: string;
  pending: boolean;
  onStay: () => void;
  onLeave: () => void;
}) {
  const reduce = useReducedMotion();
  const stayRef = useRef<HTMLButtonElement>(null);
  useEffect(() => stayRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onStay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStay]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4" onClick={onStay}>
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-title"
        aria-describedby="leave-body"
        initial={reduce ? false : { scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
          <LogOut size={20} strokeWidth={2.25} aria-hidden="true" />
        </span>
        <h2 id="leave-title" className="mt-4 text-xl font-extrabold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        <p id="leave-body" className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          {message ?? `Bạn sẽ bị xử thua ngay và mất ${stake} Bánh Mì đã cược. ${rivalName} thắng trận này.`}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onLeave}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            {pending ? "Đang thoát…" : "Thoát, chịu thua"}
          </button>
          <button
            ref={stayRef}
            type="button"
            onClick={onStay}
            className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-amber-600"
          >
            Ở lại đấu tiếp
          </button>
        </div>
      </motion.div>
    </div>
  );
}
