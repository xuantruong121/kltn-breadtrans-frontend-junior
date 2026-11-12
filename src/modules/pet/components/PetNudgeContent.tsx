"use client";

import Link from "next/link";
import { ChevronRight, Utensils } from "lucide-react";

import type { PetNudge } from "../dialogueLogic";

/**
 * What the pet says, with its action: shared by the speech bubble (wide
 * screens) and the pet panel (every screen), so both say the same thing.
 */
export function PetNudgeContent({
  dialogue,
  onFeed,
  feedDisabled,
  onAction,
}: {
  dialogue: PetNudge;
  onFeed?: () => void;
  feedDisabled?: boolean;
  /** Called after the action, e.g. to close the bubble or the panel. */
  onAction?: () => void;
}) {
  const action = dialogue.action;
  return (
    <>
      <p className="text-base text-slate-800 dark:text-slate-100 leading-relaxed font-semibold">{dialogue.text}</p>
      {action?.type === "feed" && onFeed && (
        <button
          type="button"
          disabled={feedDisabled}
          onClick={() => {
            onFeed();
            onAction?.();
          }}
          className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Utensils size={15} strokeWidth={2.25} aria-hidden="true" />
          {action.label}
        </button>
      )}
      {action?.type === "link" && (
        <Link
          href={action.url}
          onClick={onAction}
          className="mt-3 inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-bold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
        >
          {action.label}
          <ChevronRight size={15} strokeWidth={2.25} aria-hidden="true" />
        </Link>
      )}
    </>
  );
}

export default PetNudgeContent;
