/**
 * Hầm Bánh Mì in the browser: names for monsters and toppings, the clock as
 * the server runs it, and the boss's letter cells. The server decides every
 * answer; this only draws it. Pure: no React, no I/O.
 */
import type { MonsterKind, ToppingId } from "@/lib/api/services/dungeon.service";

export const MONSTER_NAME: Record<MonsterKind, string> = {
  moldy: "Bánh Thiu",
  mouse: "Chuột Bột",
  ant: "Kiến Đường",
  snail: "Ốc Bơ",
  sourdough_king: "Vua Bột Chua",
  flour_dragon: "Rồng Bột Mì",
};

/** Short names for the HUD; the server sends the full line with each offer. */
export const TOPPING_NAME: Record<ToppingId, string> = {
  garlic_butter: "Bơ tỏi",
  sesame: "Mè đen",
  cheese: "Phô mai",
  pate: "Pate",
  chili: "Ớt",
  condensed_milk: "Sữa đặc",
  floss: "Chà bông",
  egg: "Trứng ốp la",
  sausage: "Xúc xích",
  shallot: "Hành phi",
  cucumber: "Dưa leo",
  chili_sauce: "Tương ớt",
  breadstick: "Bánh mì que",
  salt_pepper: "Muối tiêu",
};

export const RARITY_LABEL = { common: "Thường", rare: "Hiếm", epic: "Quý" } as const;

/** Server time minus browser time, measured when a reply arrives. */
export const clockOffset = (serverNow: number, browserNow: number) => serverNow - browserNow;

/**
 * Where the question's clock stands at server time `now`: not started yet
 * (the page is still showing the last outcome), running, or out.
 */
export function clockAt(startsAt: number | null, deadline: number | null, now: number) {
  if (startsAt === null || deadline === null) return { started: false, share: 1, secondsLeft: 0, out: false };
  const total = Math.max(1, deadline - startsAt);
  if (now < startsAt) return { started: false, share: 1, secondsLeft: Math.ceil(total / 1000), out: false };
  const left = Math.max(0, deadline - now);
  return { started: true, share: left / total, secondsLeft: Math.ceil(left / 1000), out: left === 0 };
}

export const floorLabel = (floor: number, boss: boolean) => (boss ? `Tầng ${floor} · Boss` : `Tầng ${floor}`);

/** Letters as the learner sees them: "đàm" is three. */
const letters = (text: string) => [...text.normalize("NFC")];

/** Word lengths of a hint: "____ ___" → [4, 3]. */
const hintShape = (hint: string) => hint.split(" ").filter(Boolean).map((w) => w.length);

/**
 * Can `typed` still be the boss's word? Letters only, single spaces, no
 * word longer than the hint's and no more words. The server judges the word.
 */
export function fitsHint(hint: string, typed: string): boolean {
  if (!typed) return true;
  if (typed.startsWith(" ") || typed.includes("  ")) return false;
  if (!/^[\p{L}' -]+$/u.test(typed)) return false;
  const shape = hintShape(hint);
  const words = typed.split(" ");
  if (words.length > shape.length) return false;
  return words.every((w, i) => letters(w).length <= shape[i]);
}

export type Cell = { char: string; state: "typed" | "revealed" | "empty" };

/**
 * The boss's letter cells, word by word: what is typed, else the letters a
 * topping revealed (faint), else an empty underscore.
 */
export function typedCells(hint: string, revealed: string, typed: string): Cell[][] {
  const shape = hintShape(hint);
  const typedWords = typed.split(" ");
  const shown = letters(revealed);
  let flat = 0;
  return shape.map((length, w) => {
    const mine = letters(typedWords[w] ?? "");
    return Array.from({ length }, (_, i) => {
      const at = flat++;
      if (mine[i]) return { char: mine[i], state: "typed" as const };
      if (shown[at] && shown[at] !== " ") return { char: shown[at], state: "revealed" as const };
      return { char: "", state: "empty" as const };
    });
  });
}

/** Health as a share and a tone: amber when low, rose when nearly gone. */
export function hpTone(hp: number, max: number): { share: number; tone: "ok" | "low" | "critical" } {
  const share = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
  return { share, tone: share <= 0.25 ? "critical" : share <= 0.5 ? "low" : "ok" };
}
