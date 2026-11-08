"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Crosshair, Heart, Wheat } from "lucide-react";
import { wordBlasterService } from "@/lib/api/services/wordBlaster.service";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { arenaSound } from "@/modules/arena/sound/arenaSound";
import { BreadCannon } from "./BreadCannon";

const STAKES = [20, 50, 100] as const;
const PREVIEW = [
  { text: "negotiate", left: "12%", delay: 0, tone: "bg-sky-100 text-sky-900 border-sky-300" },
  { text: "đàm phán → ?", left: "52%", delay: 1.4, tone: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  { text: "r_n_wal", left: "30%", delay: 2.8, tone: "bg-amber-100 text-amber-900 border-amber-300" },
];

/** Bắn chữ rơi's lobby on /arena: the rules, the stake, what it wins or loses, and a moving preview. */
export function BlasterLobby({ balance, isGuest, onGuest }: { balance: number | null; isGuest: boolean; onGuest: () => void }) {
  const router = useRouter();
  const reduce = Boolean(useReducedMotion());
  const [stake, setStake] = useState<number>(20);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const short = balance !== null && balance < stake ? stake - balance : 0;

  const begin = async () => {
    if (isGuest) return onGuest();
    setError(null);
    setStarting(true);
    arenaSound.unlock();
    try {
      await wordBlasterService.start(stake);
      router.push("/arena/word-blaster");
    } catch (e) {
      setError(getApiErrorMessage(e, "Không mở được ván. Vui lòng thử lại."));
      setStarting(false);
    }
  };

  return (
    <section aria-labelledby="blaster-title" className="grid h-full gap-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6 md:grid-cols-[1.05fr_1fr]">
      <div className="flex flex-col">
        <h1 id="blaster-title" className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Bắn chữ rơi
        </h1>
        <p className="mt-2 max-w-md text-base text-slate-700 dark:text-slate-300">
          Các khối chữ rơi xuống. Gõ đúng từ, chữ còn thiếu hoặc nghĩa của nó rồi nhấn Enter để khẩu pháo bánh mì bắn vỡ trước khi khối chạm đất.
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-slate-800 dark:text-slate-200">
          <li className="flex items-center gap-2"><Crosshair size={15} strokeWidth={2.25} aria-hidden="true" /> 20 khối, rơi nhanh dần. Qua hết mà còn mạng là thắng.</li>
          <li className="flex items-center gap-2"><Heart size={15} strokeWidth={2.25} className="text-rose-600" aria-hidden="true" /> 3 mạng: mỗi khối chạm đất mất một mạng.</li>
          <li className="flex items-center gap-2"><Wheat size={15} strokeWidth={2.25} aria-hidden="true" /> Gõ không dấu cũng được khi trả lời nghĩa tiếng Việt.</li>
        </ul>

        <fieldset className="mt-5" disabled={starting}>
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Mức cược
            {balance !== null && !isGuest && (
              <span className="ml-2 font-normal text-slate-600 dark:text-slate-400">
                Bạn có <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{balance.toLocaleString("vi-VN")}</span> Bánh Mì
              </span>
            )}
          </legend>
          <div className="mt-2 flex gap-3">
            {STAKES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={stake === s}
                onClick={() => setStake(s)}
                className={`flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 transition-transform active:scale-95 sm:h-[72px] sm:w-[72px] ${
                  stake === s ? "border-amber-600 bg-amber-500 text-white" : "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-400 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                } ${balance !== null && !isGuest && balance < s ? "opacity-45" : ""}`}
              >
                <span className="text-lg font-extrabold tabular-nums leading-none">{s}</span>
                <Wheat size={14} strokeWidth={2.25} className="mt-0.5" aria-hidden="true" />
                <span className="sr-only">Bánh Mì</span>
              </button>
            ))}
          </div>
          {short > 0 && !isGuest && <p className="mt-2 text-sm text-rose-700 dark:text-rose-400">Cần thêm {short.toLocaleString("vi-VN")} Bánh Mì cho mức này.</p>}
        </fieldset>

        <dl className="mt-5 grid grid-cols-2 divide-x divide-slate-200 rounded-lg border border-slate-200 text-center dark:divide-slate-800 dark:border-slate-800">
          <div className="px-3 py-2.5">
            <dt className="text-xs font-medium text-slate-600 dark:text-slate-400">Thắng</dt>
            <dd className="inline-flex items-center gap-1 text-lg font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
              +{Math.floor(stake / 2)} <Wheat size={14} strokeWidth={2.25} aria-hidden="true" />
            </dd>
            <dd className="text-xs text-slate-600 dark:text-slate-400">hoàn cược + 50%</dd>
          </div>
          <div className="px-3 py-2.5">
            <dt className="text-xs font-medium text-slate-600 dark:text-slate-400">Thua</dt>
            <dd className="inline-flex items-center gap-1 text-lg font-extrabold tabular-nums text-rose-700 dark:text-rose-400">
              −{stake} <Wheat size={14} strokeWidth={2.25} aria-hidden="true" />
            </dd>
            <dd className="text-xs text-slate-600 dark:text-slate-400">mất cược</dd>
          </div>
        </dl>
        {error && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-400">{error}</p>}

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={() => void begin()}
            disabled={starting || (!isGuest && short > 0)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3.5 text-base font-extrabold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Crosshair size={18} strokeWidth={2.25} aria-hidden="true" />
            {isGuest ? "Đăng nhập để chơi" : starting ? "Đang mở ván…" : "Bắt đầu"}
          </button>
        </div>
      </div>

      <div className="relative min-h-[260px] overflow-hidden rounded-xl bg-gradient-to-b from-sky-100 via-amber-50 to-amber-100 dark:from-slate-800 dark:via-slate-900 dark:to-amber-950/50" aria-hidden="true">
        {PREVIEW.map((b) => (
          <motion.span
            key={b.text}
            className={`absolute top-0 rounded-lg border-2 px-3 py-1.5 text-sm font-bold shadow-sm ${b.tone}`}
            style={{ left: b.left }}
            initial={{ y: -40 }}
            animate={reduce ? { y: 60 } : { y: [-40, 190, 190], opacity: [1, 1, 0], scale: [1, 1, 1.4] }}
            transition={reduce ? undefined : { duration: 4.2, delay: b.delay, repeat: Infinity, times: [0, 0.82, 1], ease: "linear" }}
          >
            {b.text}
          </motion.span>
        ))}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-amber-200 dark:bg-amber-900/60" />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <BreadCannon angle={reduce ? 0 : -12} size={84} />
        </div>
      </div>
    </section>
  );
}
