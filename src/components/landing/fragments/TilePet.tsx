import { Smile, Utensils } from "lucide-react";
import { PET } from "@/lib/landing/fragments";
import { TERMS } from "@/lib/ui/terms";
import { CompanionPet2D } from "@/modules/pet/components/CompanionPet2D";
import { FragmentCard } from "./FragmentCard";

const BARS = [
  {
    label: "Độ no",
    aria: "Độ no của thú ảo",
    value: PET.satiety,
    icon: <Utensils size={13} strokeWidth={2.2} aria-hidden="true" className="text-orange-500 dark:text-orange-400" />,
    track: "bg-orange-100 dark:bg-slate-700",
    fill: "bg-orange-500",
  },
  {
    label: "Vui vẻ",
    aria: "Độ vui vẻ của thú ảo",
    value: PET.happiness,
    icon: <Smile size={13} strokeWidth={2.2} aria-hidden="true" className="text-amber-600 dark:text-amber-400" />,
    track: "bg-amber-100 dark:bg-slate-700",
    fill: "bg-amber-500",
  },
];

/**
 * The pet card: the real pet component (an SVG, sharp at any size), its
 * names as the pet page shows them, its level and two of its bars.
 */
export function TilePet() {
  return (
    <FragmentCard ui="pet-card" className="gap-3.5 p-5">
      <div className="flex items-center gap-3.5">
        {/* Decorative: the component's own label reads the raw id "foxy"; the names are the text beside it. */}
        <div aria-hidden="true" className="grid size-28 flex-none place-items-center rounded-[20px] bg-orange-50 dark:bg-orange-950/40">
          <CompanionPet2D speciesId={PET.speciesId} level={PET.level} className="size-full [&>div]:size-full" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[18px] font-bold">{PET.speciesName}</span>
          <span className="text-[14px] font-semibold text-slate-500 dark:text-slate-400">{PET.stageName}</span>
          <span className="mt-1 self-start rounded-full bg-blue-50 px-2.5 py-[3px] text-[13px] font-bold text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
            {TERMS.level} {PET.level} · {PET.exp} {TERMS.petPoints}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {BARS.map((bar) => (
          <div key={bar.label} className="flex flex-col gap-[5px]">
            <div className="flex justify-between text-[13px] font-bold text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-[5px]">
                {bar.icon}
                {bar.label}
              </span>
              <span>{bar.value}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={bar.aria}
              aria-valuenow={bar.value}
              aria-valuemin={0}
              aria-valuemax={100}
              className={`h-2 overflow-hidden rounded-full ${bar.track}`}
            >
              <div className={`h-full rounded-full ${bar.fill}`} style={{ width: `${bar.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </FragmentCard>
  );
}
