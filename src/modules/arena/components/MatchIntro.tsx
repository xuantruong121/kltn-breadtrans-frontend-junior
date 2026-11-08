"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BreadMascot } from "./BreadMascot";

/**
 * The 2.5 seconds between "match found" and round 1: both players face off
 * and a 3-2-1 count runs. Ends when the first round arrives.
 */
export function MatchIntro({ myName, rivalName, stake }: { myName: string; rivalName: string; stake: number }) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(3);
  useEffect(() => {
    const id = window.setInterval(() => setCount((c) => (c > 1 ? c - 1 : c)), 800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center rounded-xl bg-amber-100 px-6 py-10 text-center dark:bg-amber-950/50" role="status">
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Đã tìm thấy đối thủ · cược {stake} Bánh Mì mỗi bên</p>
      <div className="mt-6 flex items-end justify-center gap-6 sm:gap-12">
        <div className="flex flex-col items-center">
          <motion.div initial={reduce ? false : { x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 180, damping: 16 }}>
            <BreadMascot team="me" size={120} />
          </motion.div>
          <p className="mt-2 max-w-[9rem] truncate font-bold text-slate-900 dark:text-slate-100">{myName}</p>
        </div>
        <div className="mb-14 flex h-20 w-20 items-center justify-center">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={count}
              initial={reduce ? false : { scale: 1.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduce ? undefined : { scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-6xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100"
            >
              {count}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="flex flex-col items-center">
          <motion.div initial={reduce ? false : { x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 180, damping: 16 }}>
            <BreadMascot team="rival" facing="left" size={120} />
          </motion.div>
          <p className="mt-2 max-w-[9rem] truncate font-bold text-slate-900 dark:text-slate-100">{rivalName}</p>
        </div>
      </div>
      <p className="mt-6 text-sm text-slate-700 dark:text-slate-300">10 câu · 12 giây mỗi câu · câu cuối nhân đôi điểm</p>
    </div>
  );
}
