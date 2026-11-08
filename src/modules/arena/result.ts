/**
 * The words of the match result: a title, one line on why, the net Bánh Mì
 * and the XP. Only what a learner needs to know how the match went.
 */
export type ResultInput = {
  outcome: "win" | "lose" | "draw";
  forfeitReason: "left" | "disconnected" | null;
  rivalName: string;
  stake: number;
  /** What the winner receives: twice the stake. */
  reward: number;
  xp?: number;
  xpCapped: boolean;
};

export function resultCopy(r: ResultInput) {
  const title = r.outcome === "win" ? "Bạn thắng!" : r.outcome === "draw" ? "Hoà" : "Bạn thua";
  const line =
    r.outcome === "win"
      ? r.forfeitReason === "left"
        ? `${r.rivalName} đã rời trận.`
        : r.forfeitReason === "disconnected"
          ? `${r.rivalName} mất kết nối quá 15 giây.`
          : `Bạn đã vượt qua ${r.rivalName}.`
      : r.outcome === "draw"
        ? "Hai bên bằng điểm, cược được hoàn lại."
        : r.forfeitReason === "disconnected"
          ? "Bạn mất kết nối quá 15 giây."
          : `${r.rivalName} nhanh hơn lần này. Phục thù ở trận sau nhé!`;
  // Net change: the stake left the balance when the match started.
  const banh = r.outcome === "win" ? `+${r.reward - r.stake}` : r.outcome === "draw" ? "±0" : `−${r.stake}`;
  const banhTone: "up" | "flat" | "down" = r.outcome === "win" ? "up" : r.outcome === "draw" ? "flat" : "down";
  const xp = r.xp === undefined ? null : `+${r.xp} XP`;
  const xpNote = r.xpCapped ? "Đã đủ 150 XP từ Đấu trường hôm nay." : null;
  return { title, line, banh, banhTone, xp, xpNote };
}
