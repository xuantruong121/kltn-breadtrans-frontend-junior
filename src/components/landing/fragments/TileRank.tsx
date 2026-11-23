import { LEADERBOARD, formatThousands, rankByPoints } from "@/lib/landing/fragments";
import { TERMS } from "@/lib/ui/terms";
import { FragmentCard } from "./FragmentCard";

/** The tier colours of the ranking board (src/modules/ranking/components/RankingBoard.tsx), as text. */
const TIER_TEXT: Record<string, string> = {
  Vàng: "text-amber-800 dark:text-amber-300",
  "Bạch Kim": "text-cyan-800 dark:text-cyan-300",
  "Kim Cương": "text-sky-800 dark:text-sky-300",
};

/** Leaderboard rows of the test accounts only, ordered by points. */
export function TileRank() {
  return (
    <FragmentCard ui="leaderboard" className="gap-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[18px] font-bold">{TERMS.ranking}</span>
        <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400">Điểm tích luỹ</span>
      </div>
      <ol className="flex flex-col gap-2">
        {rankByPoints(LEADERBOARD).map((row) => {
          const first = row.rank === 1;
          return (
            <li
              key={row.name}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
                first ? "bg-amber-50 dark:bg-amber-950/40" : "bg-slate-50 dark:bg-slate-800/60"
              }`}
            >
              <span
                className={`grid size-7 flex-none place-items-center rounded-full text-[14px] font-bold ${
                  first ? "bg-amber-500 text-amber-950" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                }`}
              >
                {row.rank}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="text-[15px] font-bold leading-snug">{row.name}</span>
                <span className={`text-[13px] font-bold ${TIER_TEXT[row.tier] ?? "text-slate-600 dark:text-slate-300"}`}>{row.tier}</span>
              </span>
              <span className="flex-none text-[16px] font-bold">
                {formatThousands(row.points)}
                <span className="sr-only"> điểm</span>
              </span>
            </li>
          );
        })}
      </ol>
    </FragmentCard>
  );
}
