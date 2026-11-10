import axiosClient from "@/lib/api/axiosClient";

/** Hầm Bánh Mì: the day's dungeon (once a day, ranked) or a free one. */
export type DungeonMode = "daily" | "free";
export type ToppingId =
  | "garlic_butter"
  | "sesame"
  | "cheese"
  | "pate"
  | "chili"
  | "condensed_milk"
  | "floss"
  | "egg"
  | "sausage"
  | "shallot"
  | "cucumber"
  | "chili_sauce"
  | "breadstick"
  | "salt_pepper";
export type MonsterKind =
  | "moldy"
  | "mouse"
  | "ant"
  | "snail"
  | "bee"
  | "fly"
  | "flour_worm"
  | "cheese_worm"
  | "taiyaki"
  | "sourdough_king"
  | "flour_dragon"
  | "matcha_cake"
  | "pandan_jelly"
  | "yeast_frog";

/** A question as the server sends it: no answer. */
export type DungeonQuestion =
  | {
      type: "choice";
      kind: "fill_blank" | "meaning_to_word" | "word_to_meaning";
      prompt: string;
      ipa: string | null;
      options: string[];
      /** Options a topping struck out. */
      removed: number[];
    }
  | {
      type: "typed";
      prompt: string;
      pos: string | null;
      /** One "_" per letter of the English word, spaces kept. */
      hint: string;
      /** Letters shown at the start (a topping). */
      revealed: string;
    };

export interface DungeonOutcome {
  right: boolean;
  timedOut: boolean;
  damage: number;
  crit: boolean;
  taken: number;
  shielded: boolean;
  killed: boolean;
  died: boolean;
  revived: boolean;
  answer: string;
}

export interface DungeonResult {
  mode: DungeonMode;
  forfeit: boolean;
  floor: number;
  bossesDown: number;
  answered: number;
  correct: number;
  bestCombo: number;
  ticket: number;
  net: number;
  bonusCapped: number;
  xp: number;
  record: boolean;
  dailyRank: number | null;
}

/** A number a topping moves, before and after taking it, as the server words it. */
export interface ToppingEffect {
  label: string;
  now: string;
  next: string;
}

/** A topping the run holds: what it does now and the number it sets. */
export interface HeldTopping {
  id: ToppingId;
  name: string;
  level: number;
  max: number;
  line: string;
  label: string;
  value: string;
}

export interface DungeonView {
  sessionId: string;
  mode: DungeonMode;
  serverNow: number;
  floor: number;
  hp: number;
  maxHp: number;
  combo: number;
  toppings: Partial<Record<ToppingId, number>>;
  monster: { kind: MonsterKind; hp: number; maxHp: number; boss: boolean };
  phase: "fight" | "pick" | "over";
  /** `line`: what the topping does at the level it would reach; `effect`: the number it moves, now and after. */
  offers: { id: ToppingId; name: string; line: string; rarity: "common" | "rare" | "epic"; level: number; max: number; effect: ToppingEffect }[];
  toppingsHeld: HeldTopping[];
  question: DungeonQuestion | null;
  questionStartsAt: number | null;
  questionDeadline: number | null;
  questionMs: number | null;
  last: DungeonOutcome | null;
  stats: { answered: number; correct: number; bossesDown: number };
  result: DungeonResult | null;
}

export interface DungeonBoard {
  day: string;
  players: number;
  entries: { rank: number; userId: number; displayName: string; avatarUrl: string | null; floor: number }[];
  me: { dailyFloor: number | null; dailyRank: number | null; playedToday: boolean; bestFree: number | null; bestDaily: number | null };
}

export const dungeonService = {
  start: async (mode: DungeonMode): Promise<DungeonView> => axiosClient.post("/games/dungeon/start", { mode }),
  current: async (): Promise<DungeonView | null> => axiosClient.get("/games/dungeon/current"),
  board: async (): Promise<DungeonBoard> => axiosClient.get("/games/dungeon/board"),
  answer: async (id: string, body: { choice?: number; text?: string }): Promise<DungeonView> =>
    axiosClient.post(`/games/dungeon/${id}/answer`, body),
  pick: async (id: string, topping: ToppingId): Promise<DungeonView> =>
    axiosClient.post(`/games/dungeon/${id}/pick`, { topping }),
  finish: async (id: string, forfeit = false): Promise<DungeonView> =>
    axiosClient.post(`/games/dungeon/${id}/finish`, { forfeit }),
};
