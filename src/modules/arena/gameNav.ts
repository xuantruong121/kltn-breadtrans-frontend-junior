/**
 * What each Arena game's card says (owner 2026-11-09: the game list should
 * draw learners in): its kind, a "new" tag for a while, and one line about
 * the learner's own play, from data the page already has. Pure.
 */
import type { ArenaGame } from "./games.ts";

export type GameKind = "1v1" | "Solo" | "Roguelite";

export const GAME_KIND: Record<ArenaGame, GameKind> = {
  duel: "1v1",
  blaster: "Solo",
  dungeon: "Roguelite",
};

/** Until when a game wears the "Mới" tag (end of that day, Vietnam time). */
const NEW_UNTIL: Partial<Record<ArenaGame, string>> = {
  dungeon: "2026-11-15T23:59:59+07:00",
};

export function isNew(game: ArenaGame, now: Date): boolean {
  const until = NEW_UNTIL[game];
  return until !== undefined && now.getTime() <= Date.parse(until);
}

export type DuelFacts = { played: number; winRate: number | null; currentWinStreak: number } | null | undefined;
export type DungeonFacts =
  | { me: { playedToday: boolean; dailyFloor: number | null; bestFree: number | null; bestDaily: number | null } }
  | null
  | undefined;

/** The card's status line, and whether it is a call to play (shown in amber). */
export function gameStatus(
  game: ArenaGame,
  data: { isGuest: boolean; duel?: DuelFacts; dungeon?: DungeonFacts },
): { text: string; nudge: boolean } {
  if (game === "blaster") return { text: "20 khối · 3 mạng", nudge: false };
  if (data.isGuest)
    return game === "duel" ? { text: "Đấu thật với học viên khác", nudge: false } : { text: "Boss mỗi 5 tầng", nudge: false };

  if (game === "duel") {
    const d = data.duel;
    if (!d || d.played === 0) return { text: "Chưa đấu trận nào", nudge: true };
    const streak = d.currentWinStreak > 1 ? ` · chuỗi ${d.currentWinStreak}` : "";
    return { text: `Thắng ${d.winRate ?? 0}%${streak}`, nudge: false };
  }

  const me = data.dungeon?.me;
  if (!me) return { text: "Boss mỗi 5 tầng", nudge: false };
  const best = Math.max(me.bestFree ?? 0, me.bestDaily ?? 0);
  const record = best > 0 ? ` · kỷ lục tầng ${best}` : "";
  if (!me.playedToday) return { text: `Hôm nay còn 1 lượt${record}`, nudge: true };
  return { text: `Hôm nay: tầng ${me.dailyFloor ?? 1}${record}`, nudge: false };
}
