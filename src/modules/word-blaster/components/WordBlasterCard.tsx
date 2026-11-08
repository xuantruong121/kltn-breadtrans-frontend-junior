"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Crosshair, Heart, Wheat } from "lucide-react";
import { BreadCannon } from "./BreadCannon";

const PREVIEW = [
  { text: "negotiate", left: "12%", delay: 0, tone: "bg-sky-100 text-sky-900 border-sky-300" },
  { text: "đàm phán → ?", left: "52%", delay: 1.4, tone: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  { text: "r_n_wal", left: "30%", delay: 2.8, tone: "bg-amber-100 text-amber-900 border-amber-300" },
];

/** The Bắn chữ rơi entry on /arena: what it is, the stakes, and a moving preview. */
export function WordBlasterCard({ isGuest, onGuest }: { isGuest: boolean; onGuest: () => void }) {
  const reduce = Boolean(useReducedMotion());
  return (
    <section
      aria-labelledby="blaster-title"
      className="grid gap-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6 md:grid-cols-[1fr_1.05fr]"
    >
      <div className="flex flex-col">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Trò mới</p>
        <h2 id="blaster-title" className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Bắn chữ rơi
        </h2>
        <p className="mt-2 max-w-md text-base text-slate-700 dark:text-slate-300">
          Các khối chữ rơi xuống. Gõ đúng từ, chữ còn thiếu hoặc nghĩa của nó để khẩu pháo bánh mì bắn vỡ trước khi khối chạm đất.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <li className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
            <Crosshair size={15} strokeWidth={2.25} aria-hidden="true" /> Hạ 20 khối
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
            <Heart size={15} strokeWidth={2.25} className="text-rose-600" aria-hidden="true" /> 3 mạng
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
            <Wheat size={15} strokeWidth={2.25} aria-hidden="true" /> Thắng: hoàn cược + 50%
          </li>
        </ul>
        <div className="mt-auto pt-6">
          {isGuest ? (
            <button
              type="button"
              onClick={onGuest}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3.5 text-base font-extrabold text-white hover:bg-amber-600 sm:w-auto"
            >
              <Crosshair size={18} strokeWidth={2.25} aria-hidden="true" />
              Đăng nhập để chơi
            </button>
          ) : (
            <Link
              href="/arena/word-blaster"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3.5 text-base font-extrabold text-white hover:bg-amber-600 sm:w-auto"
            >
              <Crosshair size={18} strokeWidth={2.25} aria-hidden="true" />
              Chơi Bắn chữ rơi
            </Link>
          )}
        </div>
      </div>

      <div className="relative h-56 overflow-hidden rounded-xl bg-gradient-to-b from-sky-100 via-amber-50 to-amber-100 dark:from-slate-800 dark:via-slate-900 dark:to-amber-950/50 sm:h-64" aria-hidden="true">
        {PREVIEW.map((b) => (
          <motion.span
            key={b.text}
            className={`absolute top-0 rounded-lg border-2 px-3 py-1.5 text-sm font-bold shadow-sm ${b.tone}`}
            style={{ left: b.left }}
            initial={{ y: -40 }}
            animate={reduce ? { y: 40 } : { y: [-40, 150, 150], opacity: [1, 1, 0], scale: [1, 1, 1.4] }}
            transition={reduce ? undefined : { duration: 4.2, delay: b.delay, repeat: Infinity, times: [0, 0.82, 1], ease: "linear" }}
          >
            {b.text}
          </motion.span>
        ))}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-amber-200 dark:bg-amber-900/60" />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <BreadCannon angle={reduce ? 0 : -12} size={72} />
        </div>
      </div>
    </section>
  );
}
