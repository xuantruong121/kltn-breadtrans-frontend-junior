"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Swords, Wheat, X } from "lucide-react";
import { BreadMascot } from "./BreadMascot";
import { SoundToggle } from "./SoundToggle";

export const STAKES = [20, 50, 100] as const;

/** The duel scene: two loaves facing off on an amber floor, crumbs and wheat. */
function DuelScene({ searching }: { searching: boolean }) {
  // The sound toggles sit in the scene's corner, outside the decorative layer.
  const reduce = useReducedMotion();
  const bob = reduce ? undefined : { y: [0, -6, 0] };
  return (
    <div className="relative h-full min-h-[220px] overflow-hidden rounded-xl bg-amber-100 dark:bg-amber-950/50" aria-hidden="true">
      {/* floor */}
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-amber-200 dark:bg-amber-900/60" />
      {/* wheat stalks and crumbs */}
      <svg className="absolute left-4 top-4 h-16 w-16 text-amber-500/70" viewBox="0 0 64 64" fill="currentColor">
        <path d="M31 60V20h2v40z" />
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <ellipse cx="26" cy={22 + i * 9} rx="6" ry="3" transform={`rotate(-35 26 ${22 + i * 9})`} />
            <ellipse cx="38" cy={22 + i * 9} rx="6" ry="3" transform={`rotate(35 38 ${22 + i * 9})`} />
          </g>
        ))}
      </svg>
      <svg className="absolute right-5 top-6 h-12 w-24 text-amber-400/80" viewBox="0 0 96 48" fill="currentColor">
        <circle cx="8" cy="10" r="4" />
        <circle cx="30" cy="30" r="3" />
        <circle cx="54" cy="8" r="5" />
        <circle cx="80" cy="26" r="3.5" />
      </svg>
      {/* the two players */}
      <div className="absolute inset-x-0 bottom-[12%] flex items-end justify-center gap-[6%]">
        <motion.div animate={bob} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
          <BreadMascot team="me" size={148} />
        </motion.div>
        <motion.div animate={bob} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}>
          <BreadMascot team="rival" facing="left" size={148} />
        </motion.div>
      </div>
      <span className="absolute bottom-[38%] left-1/2 -translate-x-1/2 rounded-lg bg-white px-3 py-1 text-xl font-extrabold text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        {searching ? "?" : "VS"}
      </span>
    </div>
  );
}

function useElapsed(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 500);
    return () => {
      window.clearInterval(id);
      setSeconds(0);
    };
  }, [running]);
  return seconds;
}

export function ArenaHero({
  stake,
  onStake,
  balance,
  isGuest,
  isSearching,
  onFind,
  onCancel,
}: {
  stake: number;
  onStake: (stake: number) => void;
  balance: number | null;
  isGuest: boolean;
  isSearching: boolean;
  onFind: () => void;
  onCancel: () => void;
}) {
  const waited = useElapsed(isSearching);
  const affordable = (s: number) => isGuest || balance === null || balance >= s;
  const short = !affordable(stake) && balance !== null ? stake - balance : 0;

  return (
    <section aria-labelledby="arena-title" className="grid h-full gap-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6 md:grid-cols-[1.05fr_1fr]">
      <div className="flex flex-col">
        <h1 id="arena-title" className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Song Đấu Từ Vựng
        </h1>
        <p className="mt-2 max-w-md text-base text-slate-700 dark:text-slate-300">
          Ghép trận với một học viên khác, trả lời 10 câu từ vựng, 12 giây mỗi câu. Ai đúng nhiều và nhanh hơn thì lấy cả hai phần cược.
        </p>

        <fieldset className="mt-5" disabled={isSearching}>
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Mức cược
            {balance !== null && !isGuest && (
              <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
                Bạn có <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{balance.toLocaleString("vi-VN")}</span> Bánh Mì
              </span>
            )}
          </legend>
          <div className="mt-2 flex gap-3">
            {STAKES.map((s) => {
              const selected = stake === s;
              const ok = affordable(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onStake(s)}
                  className={`flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 transition-transform active:scale-95 sm:h-[72px] sm:w-[72px] ${
                    selected
                      ? "border-amber-600 bg-amber-500 text-white"
                      : "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-400 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                  } ${ok ? "" : "opacity-45"}`}
                >
                  <span className="text-lg font-extrabold tabular-nums leading-none">{s}</span>
                  <Wheat size={14} strokeWidth={2.25} className="mt-0.5" aria-hidden="true" />
                  <span className="sr-only">Bánh Mì</span>
                </button>
              );
            })}
          </div>
          {short > 0 && (
            <p className="mt-2 text-sm text-rose-700 dark:text-rose-400">
              Cần thêm {short.toLocaleString("vi-VN")} Bánh Mì cho mức này.
            </p>
          )}
        </fieldset>

        {/* What the chosen stake means, so the stake is a decision, not a guess. */}
        <div className="mt-5 rounded-lg border border-slate-200 dark:border-slate-800">
          <dl className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800">
            {[
              { label: "Thắng", value: `+${stake}`, note: `nhận ${stake * 2}`, ink: "text-emerald-700 dark:text-emerald-400" },
              { label: "Hoà", value: "±0", note: "hoàn cược", ink: "text-slate-800 dark:text-slate-200" },
              { label: "Thua", value: `−${stake}`, note: "mất cược", ink: "text-rose-700 dark:text-rose-400" },
            ].map((o) => (
              <div key={o.label} className="px-3 py-2.5 text-center">
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{o.label}</dt>
                <dd className={`mt-0.5 inline-flex items-center gap-1 text-lg font-extrabold tabular-nums ${o.ink}`}>
                  {o.value}
                  <Wheat size={14} strokeWidth={2.25} aria-hidden="true" />
                </dd>
                <dd className="text-xs text-slate-500 dark:text-slate-400">{o.note}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-slate-200 px-3 py-2 text-center text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
            Thắng hay thua, mỗi câu đúng đều được <span className="font-semibold text-sky-700 dark:text-sky-400">+5 XP</span> (tối đa 150 XP mỗi ngày).
          </p>
        </div>

        <div className="mt-auto pt-6">
          {isSearching ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-1 items-center gap-3 rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-950/40" role="status">
                <span className="relative flex h-3 w-3" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                </span>
                <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Đang tìm đối thủ cược {stake} Bánh Mì
                </span>
                <span className="ml-auto text-sm font-bold tabular-nums text-amber-900 dark:text-amber-200">
                  {String(Math.floor(waited / 60)).padStart(2, "0")}:{String(waited % 60).padStart(2, "0")}
                </span>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X size={16} strokeWidth={2.25} aria-hidden="true" />
                Huỷ
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onFind}
              disabled={!affordable(stake)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3.5 text-base font-extrabold text-white transition-colors hover:bg-amber-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Swords size={18} strokeWidth={2.25} aria-hidden="true" />
              {isGuest ? "Đăng nhập để thách đấu" : "Tìm đối thủ"}
            </button>
          )}
        </div>
      </div>
      <div className="relative">
        <DuelScene searching={isSearching} />
        <div className="absolute right-2 top-2 rounded-lg bg-white/90 dark:bg-slate-900/90">
          <SoundToggle />
        </div>
      </div>
    </section>
  );
}
