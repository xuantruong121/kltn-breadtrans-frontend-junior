import axiosClient from "@/lib/api/axiosClient";

export type BlasterKind = "copy" | "missing" | "vi_to_en" | "en_to_vi";

/** A falling block as the server sends it: no answer. Times are ms since the game started. */
export interface BlasterBlock {
  id: number;
  kind: BlasterKind;
  prompt: string;
  spawnAtMs: number;
  fallMs: number;
  lane: number;
}

export interface BlasterResult {
  outcome: "win" | "lose";
  forfeit: boolean;
  destroyed: number;
  landed: number;
  livesLeft: number;
  stake: number;
  /** Net change in Bánh Mì; the stake left the balance at the start. */
  net: number;
  bonusCapped: number;
  xp: number;
  words: { id: number; displayWord: string; meaningVi: string; hit: boolean }[];
}

export interface BlasterView {
  sessionId: string;
  stake: number;
  serverNow: number;
  startedAt: number;
  lives: number;
  target: number;
  blocks: BlasterBlock[];
  hits: Record<number, number>;
  state: { destroyed: number; landed: number; livesLeft: number; over: boolean; outcome: "win" | "lose" | null };
  result: BlasterResult | null;
}

export const wordBlasterService = {
  start: async (stake: number): Promise<BlasterView> => axiosClient.post("/games/word-blaster/start", { stake }),
  current: async (): Promise<BlasterView | null> => axiosClient.get("/games/word-blaster/current"),
  shot: async (id: string, text: string): Promise<BlasterView & { hitBlockId: number | null }> =>
    axiosClient.post(`/games/word-blaster/${id}/shot`, { text }),
  finish: async (id: string, forfeit = false): Promise<BlasterView> =>
    axiosClient.post(`/games/word-blaster/${id}/finish`, { forfeit }),
};
