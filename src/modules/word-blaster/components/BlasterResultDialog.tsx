"use client";

import React, { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Confetti from "react-confetti";
import { Crosshair, Flame, RotateCcw, Target, X } from "lucide-react";
import { BreadCoinIcon } from "@/components/ui/BreadCoinIcon";
import type { BlasterResult } from "@/lib/api/services/wordBlaster.service";
import { BreadMascot } from "@/modules/arena/components/BreadMascot";
import { blasterResultCopy } from "../blasterResult";
import type { BlasterStats } from "./WordBlasterGame";

const CONFETTI_COLORS = ["#F59E0B", "#FBBF24", "#FB923C", "#10B981", "#38BDF8", "#FDE68A"];

/** The end of a game: won or lost, Bánh Mì and XP, and how it went (blocks, best combo, accuracy). */
export function BlasterResultDialog({
  result,
  stats,
  onAgain,
  onExit,
}: {
  result: BlasterResult;
  stats: BlasterStats | null;
  onAgain: () => void;
  onExit: () => void;
}) {
  const reduce = Boolean(useReducedMotion());
  const againRef = useRef<HTMLButtonElement>(null);
  useEffect(() => againRef.current?.focus(), []);
  const copy = blasterResultCopy(result);
  const win = result.outcome === "win";

  return (
    <div className="fixed inset-0 z-[100] flex overflow-y-auto bg-slate-900/60 p-4">
      {win && !reduce && <Confetti recycle={false} numberOfPieces={240} colors={CONFETTI_COLORS} gravity={0.18} />}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="blaster-result-title"
        initial={reduce ? false : { scale: 0.85, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className="m-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900"
      >
        <div className={`flex justify-center pt-6 ${win ? "bg-amber-100 dark:bg-amber-950/50" : "bg-slate-100 dark:bg-slate-800"}`}>
          <motion.div
            initial={reduce ? false : { y: 40, scale: 0.6 }}
            animate={reduce ? undefined : win ? { y: [40, -14, 0, -6, 0], scale: 1 } : { y: 0, scale: 1, rotate: [0, -6, 4, -2, 0] }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            <BreadMascot team="me" mood={win ? "happy" : "sad"} size={104} />
          </motion.div>
        </div>
        <div className="p-6 text-center">
          <h2 id="blaster-result-title" className={`text-3xl font-extrabold ${win ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"}`}>
            {copy.title}
          </h2>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{copy.line}</p>

          <div className="mt-4 flex justify-center gap-2">
            <motion.span
              initial={reduce ? false : { scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 12, delay: reduce ? 0 : 0.5 }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-base font-extrabold tabular-nums ${
                result.net > 0
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : result.net < 0
                    ? "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              {copy.banh}
              <BreadCoinIcon size={16} strokeWidth={2.25} aria-hidden="true" />
              <span className="sr-only">Bánh Mì</span>
            </motion.span>
            <motion.span
              initial={reduce ? false : { scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 12, delay: reduce ? 0 : 0.65 }}
              className="inline-flex items-center rounded-full bg-sky-50 px-3.5 py-1.5 text-base font-extrabold tabular-nums text-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
            >
              +{result.xp} XP
            </motion.span>
          </div>
          {copy.note && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{copy.note}</p>}

          <dl className="mt-5 grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {[
              { icon: Crosshair, label: "Bắn vỡ", value: stats ? `${result.destroyed}/${stats.total}` : `${result.destroyed}` },
              { icon: Flame, label: "Combo dài nhất", value: stats ? `×${stats.maxCombo}` : "–" },
              { icon: Target, label: "Chính xác", value: stats?.accuracy != null ? `${Math.round(stats.accuracy * 100)}%` : "–" },
            ].map(({ icon: Icon, label, value }, i) => (
              <motion.div
                key={label}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : 0.75 + i * 0.1 }}
                className="px-2 py-2.5"
              >
                <dt className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
                  {label}
                </dt>
                <dd className="mt-0.5 text-lg font-extrabold tabular-nums text-slate-900 dark:text-slate-100">{value}</dd>
              </motion.div>
            ))}
          </dl>

          <div className="mt-6 flex flex-col gap-2">
            <button
              ref={againRef}
              type="button"
              onClick={onAgain}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 font-extrabold text-white hover:bg-amber-600"
            >
              <RotateCcw size={16} strokeWidth={2.5} aria-hidden="true" />
              Chơi lại
            </button>
            <button
              type="button"
              onClick={onExit}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X size={16} strokeWidth={2.5} aria-hidden="true" />
              Về Đấu trường
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
