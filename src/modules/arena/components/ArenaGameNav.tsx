"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import type { ArenaStats } from "@/lib/api/services/gamification.service";
import { dungeonService } from "@/lib/api/services/dungeon.service";
import { useAuthStore } from "@/stores/authStore";
import type { ArenaGame } from "../games";
import { GAME_KIND, gameStatus, isNew } from "../gameNav";
import { GameCover } from "./GameCover";

export const ARENA_GAMES: { id: ArenaGame; name: string }[] = [
  { id: "duel", name: "Song Đấu Từ Vựng" },
  { id: "blaster", name: "Pháo Bánh Mì" },
  { id: "dungeon", name: "Hầm Bánh Mì" },
];

/**
 * The Arena's games as cover cards (owner 2026-11-09): a picture drawn for
 * each game, its kind, a "Mới" tag for a while, and one line about the
 * learner's own play. A column on wide screens, a sliding row on phones.
 */
export function ArenaGameNav({
  game,
  onPick,
  isGuest,
  arenaStats,
}: {
  game: ArenaGame;
  onPick: (game: ArenaGame) => void;
  isGuest: boolean;
  arenaStats?: ArenaStats | null;
}) {
  const reduce = Boolean(useReducedMotion());
  const { user } = useAuthStore();
  const [hovered, setHovered] = useState<ArenaGame | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);
  // Same key as the dungeon lobby, so the two share one request.
  const { data: board } = useQuery({
    queryKey: ["dungeon-board", user?.id],
    queryFn: dungeonService.board,
    enabled: !isGuest,
    staleTime: 30_000,
  });
  const [now] = useState(() => new Date());

  // On a phone the row slides the chosen game into view. Only the row scrolls:
  // scrollIntoView would also move the page and cut the covers off at the top.
  useEffect(() => {
    const list = listRef.current;
    const item = activeRef.current;
    if (!list || !item || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: item.offsetLeft - list.offsetLeft - 16, behavior: reduce ? "auto" : "smooth" });
  }, [game, reduce]);

  return (
    <nav aria-label="Trò chơi trong Đấu trường" className="lg:sticky lg:top-24">
      <ul ref={listRef} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {ARENA_GAMES.map((g) => {
          const active = g.id === game;
          const status = gameStatus(g.id, { isGuest, duel: arenaStats, dungeon: board });
          return (
            <li key={g.id} ref={active ? activeRef : undefined} className="w-[220px] shrink-0 snap-start lg:w-auto">
              <motion.button
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onPick(g.id)}
                onHoverStart={() => setHovered(g.id)}
                onHoverEnd={() => setHovered(null)}
                whileHover={reduce || active ? undefined : { y: -3 }}
                animate={{ y: active && !reduce ? -2 : 0 }}
                className={`group block w-full overflow-hidden rounded-2xl border-2 text-left transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60 ${
                  active
                    ? "border-amber-400 bg-white shadow-[0_10px_30px_-10px_rgba(217,119,6,0.55)] dark:bg-slate-900"
                    : "border-slate-200 bg-white shadow-sm hover:border-amber-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-900"
                }`}
              >
                <div className="relative h-24">
                  <GameCover game={g.id} live={active || hovered === g.id} reduce={reduce} />
                  {isNew(g.id, now) && (
                    <span className="absolute right-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                      Mới
                    </span>
                  )}
                  <span className="absolute left-2 top-2 rounded-md bg-black/45 px-1.5 py-0.5 text-[11px] font-bold text-white">{GAME_KIND[g.id]}</span>
                </div>
                <div className="px-3 py-2.5">
                  <span className={`block font-extrabold ${active ? "text-amber-700 dark:text-amber-300" : "text-slate-900 dark:text-slate-100"}`}>{g.name}</span>
                  <span className={`mt-0.5 block truncate text-sm ${status.nudge ? "font-semibold text-amber-700 dark:text-amber-300" : "text-slate-600 dark:text-slate-400"}`}>
                    {status.text}
                  </span>
                </div>
              </motion.button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
