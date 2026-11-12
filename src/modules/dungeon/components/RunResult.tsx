"use client";

import React, { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Crown,
  Flame,
  Footprints,
  RotateCcw,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { BreadCoinIcon } from "@/components/ui/BreadCoinIcon";
import type { DungeonResult } from "@/lib/api/services/dungeon.service";

/** The end of a run: how deep, what it earned, and a record or a place on today's board. */
export function RunResult({ result, onAgain, onExit }: { result: DungeonResult; onAgain: () => void; onExit: () => void }) {
  const reduce = Boolean(useReducedMotion());
  const againRef = useRef<HTMLButtonElement>(null);
  useEffect(() => againRef.current?.focus(), []);
  const accuracy = result.answered ? Math.round((result.correct / result.answered) * 100) : 0;
  const stats = [
    { icon: Footprints, label: "Tầng đạt", value: `${result.floor}` },
    { icon: Crown, label: "Boss đã hạ", value: `${result.bossesDown}` },
    { icon: Target, label: "Chính xác", value: `${accuracy}%` },
    { icon: Flame, label: "Combo dài nhất", value: `×${result.bestCombo}` },
  ];
  return (
    <div className="fixed inset-0 z-[100] flex overflow-y-auto bg-black/70 p-4">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dungeon-result-title"
        initial={reduce ? false : { scale: 0.85, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className="m-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900"
      >
        <div className="bg-gradient-to-b from-[#3a2219] to-[#1a100c] px-6 pb-5 pt-6 text-center text-white">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-200/80">{result.mode === "daily" ? "Hầm hôm nay" : "Hầm tự do"}</p>
          <h2 id="dungeon-result-title" className="mt-1 text-3xl font-extrabold">
            {result.forfeit ? "Đã rời hầm" : "Hết máu"} ở tầng {result.floor}
          </h2>
          {result.record && (
            <motion.p
              initial={reduce ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.4, type: "spring", stiffness: 400, damping: 12 }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-sm font-bold text-amber-200 ring-1 ring-amber-300/50"
            >
              <Trophy size={15} strokeWidth={2.5} aria-hidden="true" />
              Kỷ lục mới
            </motion.p>
          )}
          {result.dailyRank !== null && <p className="mt-2 text-sm text-white/80">Hạng {result.dailyRank} hôm nay</p>}
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-2 gap-2">
            {stats.map(({ icon: Icon, label, value }, i) => (
              <motion.div
                key={label}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : 0.3 + i * 0.08 }}
                className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800"
              >
                <dt className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Icon size={13} strokeWidth={2.5} aria-hidden="true" />
                  {label}
                </dt>
                <dd className="mt-0.5 text-xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100">{value}</dd>
              </motion.div>
            ))}
          </dl>
          <div className="mt-4 flex justify-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-base font-extrabold tabular-nums ${
                result.net > 0
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : result.net < 0
                    ? "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              {result.net > 0 ? `+${result.net}` : result.net < 0 ? `−${-result.net}` : "±0"}
              <BreadCoinIcon size={16} strokeWidth={2.25} aria-hidden="true" />
              <span className="sr-only">Bánh Mì</span>
            </span>
            <span className="inline-flex items-center rounded-full bg-sky-50 px-3.5 py-1.5 text-base font-extrabold tabular-nums text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
              +{result.xp} XP
            </span>
          </div>
          <p className="mt-2 text-center text-xs text-slate-600 dark:text-slate-400">
            {result.bossesDown > 0 ? "Đã hoàn vé vì hạ được boss tầng 5" : "Hạ boss tầng 5 để được hoàn vé"}
            {result.bonusCapped > 0 ? ". Hôm nay đã đủ 150 Bánh Mì thưởng." : "."}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              ref={againRef}
              type="button"
              onClick={onAgain}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 font-extrabold text-white hover:bg-amber-600"
            >
              <RotateCcw size={16} strokeWidth={2.5} aria-hidden="true" />
              Vào hầm lần nữa
            </button>
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
