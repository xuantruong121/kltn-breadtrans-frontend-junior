"use client";

import { useSyncExternalStore } from "react";
import { Check, Flame, Shield } from "lucide-react";
import { STREAK_RULES, WEEK_DAYS, weekdayIndex } from "@/lib/landing/fragments";
import { FragmentCard } from "./FragmentCard";

const noSubscribe = () => () => {};
const todayOnClient = () => weekdayIndex(new Date());
const noDayOnServer = () => null;

/**
 * The streak rule as a small app card, not a personal count (the test
 * accounts have a 0-1 day streak). The week is a plain row with only today
 * marked. Today is read on the client after hydration, so the server HTML
 * and the first client render match; before that no day is marked.
 */
export function TileStreak() {
  const today = useSyncExternalStore(noSubscribe, todayOnClient, noDayOnServer);
  return (
    <FragmentCard ui="streak-rule" className="gap-3.5 p-5">
      <div className="flex items-center gap-2">
        <Flame size={22} strokeWidth={2} aria-hidden="true" className="fill-orange-200 text-orange-600 dark:fill-orange-900/60 dark:text-orange-400" />
        <span className="text-[18px] font-bold">Chuỗi ngày học</span>
      </div>

      <ol aria-label="Tuần này" className="grid grid-cols-7 gap-1.5">
        {WEEK_DAYS.map((day, index) => {
          const isToday = index === today;
          return (
            <li
              key={day}
              aria-current={isToday ? "date" : undefined}
              className={`flex flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-center ${
                isToday
                  ? "bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
                  : "bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
              }`}
            >
              <span className="text-[14px] font-bold">{day}</span>
              {/* Two lines on a narrow card, one on a wide one; the slot keeps that height on every day. */}
              <span className="min-h-[2lh] text-[13px] font-bold leading-tight @md:min-h-[1lh]">{isToday ? "Hôm nay" : ""}</span>
            </li>
          );
        })}
      </ol>

      <ul className="flex flex-col gap-2 text-[15px] font-semibold leading-normal text-slate-700 dark:text-slate-200">
        <li className="flex gap-2">
          <Check size={16} strokeWidth={2.5} aria-hidden="true" className="mt-[3px] flex-none text-emerald-500" />
          <span>{STREAK_RULES[0]}</span>
        </li>
        <li className="flex gap-2">
          <Shield size={16} strokeWidth={2} aria-hidden="true" className="mt-[3px] flex-none fill-blue-100 text-blue-600 dark:fill-blue-950/60 dark:text-blue-400" />
          <span>{STREAK_RULES[1]}</span>
        </li>
      </ul>
    </FragmentCard>
  );
}
