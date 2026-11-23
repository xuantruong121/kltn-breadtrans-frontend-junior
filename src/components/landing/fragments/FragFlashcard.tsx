import { RotateCcw } from "lucide-react";
import { FLASHCARD } from "@/lib/landing/fragments";
import { FragmentCard, FragmentHeader } from "./FragmentCard";

/**
 * A flashcard with both faces side by side (they stack on a narrow card),
 * so the back is legible without flipping. The flip control is a picture of
 * the app's.
 */
export function FragFlashcard() {
  const card = FLASHCARD;
  return (
    <FragmentCard ui="flashcard" className="gap-4 p-6">
      <FragmentHeader title={card.deck} meta="Thẻ 1" lang="en" />

      <div className="flex flex-wrap gap-3">
        <div className="flex min-h-[220px] flex-[1_1_200px] flex-col items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-slate-200 p-5 text-center dark:border-slate-700">
          <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400">Mặt trước</span>
          <span lang="en" className="text-[34px] font-bold leading-[1.1]">
            {card.word}
          </span>
          <span lang="en" className="text-[16px] font-semibold text-slate-600 dark:text-slate-300">
            {card.ipa} · {card.partOfSpeech}
          </span>
        </div>
        <div className="flex min-h-[220px] flex-[1_1_200px] flex-col justify-center gap-2.5 rounded-[20px] bg-blue-50 p-5 dark:bg-blue-950/40">
          <span className="text-[13px] font-bold text-blue-800 dark:text-blue-300">Mặt sau</span>
          <span className="text-[26px] font-bold leading-[1.15] text-blue-900 dark:text-blue-200">{card.meaning}</span>
          <span lang="en" className="text-[15px] font-semibold leading-normal">
            {card.example}
          </span>
          <span className="text-[15px] font-semibold leading-normal text-slate-600 dark:text-slate-300">{card.exampleVi}</span>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="inline-flex min-h-11 items-center gap-2 self-center rounded-full border-[1.5px] border-blue-200 bg-white px-[18px] text-[15px] font-bold text-blue-800 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300"
      >
        <RotateCcw size={16} strokeWidth={2} />
        Lật thẻ
      </span>
    </FragmentCard>
  );
}
