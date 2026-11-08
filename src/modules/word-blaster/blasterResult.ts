/** The words of a Pháo Bánh Mì result. Pure. */
export type BlasterResultInput = {
  outcome: "win" | "lose";
  forfeit: boolean;
  destroyed: number;
  landed: number;
  stake: number;
  net: number;
  bonusCapped: number;
};

export function blasterResultCopy(r: BlasterResultInput) {
  const title = r.outcome === "win" ? "Bạn thắng!" : r.forfeit ? "Đã thoát ván" : "Hết mạng";
  const line =
    r.outcome === "win"
      ? `Bắn vỡ ${r.destroyed} khối, chỉ để lọt ${r.landed}.`
      : r.forfeit
        ? `Bạn đã rời ván sau khi bắn vỡ ${r.destroyed} khối.`
        : `Bắn vỡ ${r.destroyed} khối trước khi 3 khối chạm đất.`;
  const banh = r.net > 0 ? `+${r.net}` : r.net < 0 ? `−${-r.net}` : "±0";
  const note =
    r.outcome === "win" && r.bonusCapped > 0
      ? `Hôm nay đã đủ 150 Bánh Mì thưởng, nên chỉ hoàn cược${r.net > 0 ? ` và thưởng ${r.net}` : ""}.`
      : null;
  return { title, line, banh, note };
}
