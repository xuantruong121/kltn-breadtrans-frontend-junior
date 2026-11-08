"use client";

import React, { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Confetti from "react-confetti";
import { Check, Minus, RotateCcw, Wheat, X } from "lucide-react";
import { BreadMascot } from "./BreadMascot";

export type RoundRecord = { myCorrect: boolean; myPoints: number; rivalCorrect: boolean; rivalPoints: number };

export function MatchResultDialog({
  outcome,
  forfeit,
  myScore,
  rivalScore,
  rivalName,
  stake,
  reward,
  rounds,
  onRematch,
  onExit,
}: {
  outcome: "win" | "lose" | "draw";
  forfeit: boolean;
  myScore: number;
  rivalScore: number;
  rivalName: string;
  stake: number;
  reward: number;
  rounds: RoundRecord[];
  onRematch: () => void;
  onExit: () => void;
}) {
  const reduce = useReducedMotion();
  const exitRef = useRef<HTMLButtonElement>(null);
  useEffect(() => exitRef.current?.focus(), []);

  const title = outcome === "win" ? "Bạn thắng!" : outcome === "draw" ? "Hoà" : "Bạn thua";
  const line =
    outcome === "win"
      ? forfeit
        ? `${rivalName} rời trận quá 15 giây, bạn được xử thắng.`
        : `Bạn hơn ${rivalName} ${(myScore - rivalScore).toLocaleString("vi-VN")} điểm.`
      : outcome === "draw"
        ? "Hai bên bằng điểm, mỗi người được hoàn cược."
        : `${rivalName} hơn bạn ${(rivalScore - myScore).toLocaleString("vi-VN")} điểm. Ôn lại các từ sai rồi phục thù nhé.`;
  // Net change: the stake left the balance when the match started.
  const banh = outcome === "win" ? `+${reward - stake}` : outcome === "draw" ? "±0" : `−${stake}`;
  const banhInk =
    outcome === "win" ? "text-emerald-700 dark:text-emerald-400" : outcome === "draw" ? "text-slate-700 dark:text-slate-300" : "text-rose-700 dark:text-rose-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4">
      {outcome === "win" && !reduce && <Confetti recycle={false} numberOfPieces={320} />}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        initial={reduce ? false : { scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-900"
      >
        <div className={`flex justify-center pt-6 ${outcome === "win" ? "bg-amber-100 dark:bg-amber-950/50" : "bg-slate-100 dark:bg-slate-800"}`}>
          <BreadMascot team="me" mood={outcome === "lose" ? "sad" : "happy"} size={112} />
        </div>
        <div className="p-6">
          <h2 id="result-title" className="text-center text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          <p className="mt-1 text-center text-sm text-slate-600 dark:text-slate-400">{line}</p>

          <div className="mt-5 grid grid-cols-3 items-end text-center">
            <p>
              <span className="block text-3xl font-extrabold tabular-nums text-sky-700 dark:text-sky-400">{myScore.toLocaleString("vi-VN")}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Bạn</span>
            </p>
            <p>
              <span className={`inline-flex items-center gap-1 text-2xl font-extrabold tabular-nums ${banhInk}`}>
                {banh}
                <Wheat size={18} strokeWidth={2.25} aria-hidden="true" />
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {outcome === "win" ? `nhận ${reward}, đã cược ${stake}` : outcome === "draw" ? "đã hoàn cược" : "Bánh Mì đã cược"}
              </span>
            </p>
            <p>
              <span className="block text-3xl font-extrabold tabular-nums text-rose-700 dark:text-rose-400">{rivalScore.toLocaleString("vi-VN")}</span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{rivalName}</span>
            </p>
          </div>

          {rounds.length > 0 && (
            <table className="mt-5 w-full text-sm">
              <caption className="sr-only">Điểm từng câu</caption>
              <thead>
                <tr className="text-xs text-slate-500 dark:text-slate-400">
                  <th scope="col" className="pb-1 text-left font-medium">Câu</th>
                  <th scope="col" className="pb-1 text-right font-medium">Bạn</th>
                  <th scope="col" className="pb-1 text-right font-medium">Đối thủ</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 text-slate-700 dark:text-slate-300">{i + 1}</td>
                    {[
                      [r.myCorrect, r.myPoints],
                      [r.rivalCorrect, r.rivalPoints],
                    ].map(([ok, pts], j) => (
                      <td key={j} className="py-1.5 text-right tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          {ok ? (
                            <Check size={14} strokeWidth={3} className="text-emerald-600" aria-label="đúng" />
                          ) : (
                            <Minus size={14} strokeWidth={3} className="text-slate-400" aria-label="sai hoặc hết giờ" />
                          )}
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{pts as number}</span>
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              onClick={onRematch}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 font-extrabold text-white hover:bg-amber-600"
            >
              <RotateCcw size={16} strokeWidth={2.5} aria-hidden="true" />
              Đấu tiếp · {stake}
              <Wheat size={16} strokeWidth={2.25} aria-hidden="true" />
              <span className="sr-only">Bánh Mì</span>
            </button>
            <button
              ref={exitRef}
              type="button"
              onClick={onExit}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X size={16} strokeWidth={2.5} aria-hidden="true" />
              Về sảnh
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
