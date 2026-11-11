"use client";

import { hungerLine } from "../dialogueLogic";

/**
 * What a hungry pet says inside its own card. The floating pet and its
 * bubble are not shown on the dashboard or on the pet page, so without this
 * a hungry pet said nothing where the learner looks at it. Shown for as long
 * as the pet is hungry; feeding it removes the line.
 */
export function PetHungerLine({
  satietyState,
  balance,
  feedCost,
}: {
  satietyState?: string;
  balance: number;
  feedCost: number;
}) {
  const line = hungerLine({ satietyState, balance, feedCost });
  if (!line) return null;
  return (
    <p
      role="status"
      data-pet-hunger={line.veryHungry ? "very-hungry" : "hungry"}
      className={`rounded-2xl rounded-tl-sm border px-3.5 py-2.5 text-sm font-semibold leading-relaxed ${
        line.veryHungry
          ? "border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100"
          : "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100"
      }`}
    >
      {line.text}
    </p>
  );
}
