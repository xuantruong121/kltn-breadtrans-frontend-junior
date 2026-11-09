/** The Arena's games, picked in the sidebar and kept in ?game=… */
export type ArenaGame = "duel" | "blaster" | "dungeon";

/** Reads ?game=… ; anything else opens the duel. */
export function arenaGameFrom(value: string | null): ArenaGame {
  return value === "blaster" || value === "dungeon" ? value : "duel";
}
