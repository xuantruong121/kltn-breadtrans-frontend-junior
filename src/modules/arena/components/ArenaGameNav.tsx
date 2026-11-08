"use client";

import React from "react";
import { Crosshair, Swords, type LucideIcon } from "lucide-react";
import type { ArenaGame } from "../games";

export const ARENA_GAMES: { id: ArenaGame; name: string; line: string; meta: string; icon: LucideIcon }[] = [
  { id: "duel", name: "Đấu 1v1", line: "Đấu từ vựng với một học viên khác", meta: "10 câu · 12 giây mỗi câu", icon: Swords },
  { id: "blaster", name: "Bắn chữ rơi", line: "Gõ đáp án để bắn vỡ khối chữ", meta: "20 khối · 3 mạng", icon: Crosshair },
];

/** The Arena's game list: a column on wide screens, a row of tabs on phones. */
export function ArenaGameNav({ game, onPick }: { game: ArenaGame; onPick: (game: ArenaGame) => void }) {
  return (
    <nav aria-label="Trò chơi trong Đấu trường" className="lg:sticky lg:top-24">
      <p className="mb-2 hidden px-1 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400 lg:block">Trò chơi</p>
      <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {ARENA_GAMES.map((g) => {
          const active = g.id === game;
          const Icon = g.icon;
          return (
            <li key={g.id} className="shrink-0 lg:shrink">
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onPick(g.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors lg:items-start lg:px-4 lg:py-3 ${
                  active
                    ? "border-amber-300 bg-amber-50 shadow-sm dark:border-amber-800 dark:bg-amber-950/40"
                    : "border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    active ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  <Icon size={18} strokeWidth={2.25} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-slate-900 dark:text-slate-100">{g.name}</span>
                  <span className="hidden text-sm text-slate-700 dark:text-slate-300 lg:block">{g.line}</span>
                  <span className="hidden text-xs text-slate-600 dark:text-slate-400 lg:block">{g.meta}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
