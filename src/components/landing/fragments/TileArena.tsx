import { Clock, SquareCheckBig } from "lucide-react";
import { ARENA_DUEL } from "@/lib/landing/fragments";
import { FragmentCard } from "./FragmentCard";

const AVATAR_TONES = [
  "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
];

/** The real duel format of the arena: two players shown by initials only, and no stakes. */
export function TileArena() {
  const duel = ARENA_DUEL;
  return (
    <FragmentCard ui="arena-duel" className="gap-3.5 p-5">
      <div className="flex flex-col gap-1">
        <span className="text-[18px] font-bold">{duel.title}</span>
        <span className="text-[15px] font-semibold leading-normal text-slate-600 dark:text-slate-300">{duel.summary}</span>
      </div>

      <div className="flex items-center justify-center gap-4 rounded-[18px] bg-slate-50 p-3 dark:bg-slate-800/60">
        <Player initial={duel.players[0].initial} label={duel.players[0].label} tone={AVATAR_TONES[0]} />
        <span className="text-[15px] font-bold text-slate-500 dark:text-slate-400">{duel.format}</span>
        <Player initial={duel.players[1].initial} label={duel.players[1].label} tone={AVATAR_TONES[1]} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <span className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 p-2 text-[14px] font-bold text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <SquareCheckBig size={16} strokeWidth={2} aria-hidden="true" />
          {duel.questions} câu
        </span>
        <span className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 p-2 text-[14px] font-bold text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <Clock size={16} strokeWidth={2} aria-hidden="true" />
          {duel.secondsPerQuestion} giây/câu
        </span>
      </div>
    </FragmentCard>
  );
}

function Player({ initial, label, tone }: { initial: string; label: string; tone: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span aria-hidden="true" className={`grid size-[52px] place-items-center rounded-full text-[18px] font-bold ${tone}`}>
        {initial}
      </span>
      <span className="text-[13px] font-bold text-slate-600 dark:text-slate-300">{label}</span>
    </div>
  );
}
