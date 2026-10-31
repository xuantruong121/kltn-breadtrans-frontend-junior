import { Compass } from "lucide-react";
import {
  PRACTICE_SKILL_LABEL,
  PRACTICE_SKILL_ORDER,
  practiceLevelLabel,
  type PracticePlacement,
} from "@/lib/learning-path/practiceLevel";

/** "Mức luyện tập đề xuất" from the Entry Diagnostic (internal levels, not CEFR). */
export function PracticePlacementPanel({ placement }: { placement: PracticePlacement }) {
  if (!placement.overall) return null;
  return (
    <section
      aria-labelledby="practice-placement-heading"
      className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/60 p-5 dark:border-blue-900/60 dark:bg-blue-950/30"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Compass size={22} strokeWidth={2.25} className="text-blue-700 dark:text-blue-300" aria-hidden="true" />
        <h2 id="practice-placement-heading" className="text-base font-bold text-slate-700 dark:text-slate-300">
          Mức luyện tập đề xuất
        </h2>
        <span className="text-2xl font-black text-blue-800 dark:text-blue-200">{practiceLevelLabel(placement.overall)}</span>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PRACTICE_SKILL_ORDER.map((skill) => (
          <li key={skill} className="rounded-xl border border-blue-100 bg-white px-4 py-3 dark:border-blue-900/50 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{PRACTICE_SKILL_LABEL[skill]}</p>
            <p className="mt-0.5 text-lg font-black text-slate-900 dark:text-slate-100">
              {placement.skills[skill] ? practiceLevelLabel(placement.skills[skill]) : "Chưa đánh giá"}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
        Đây là mức luyện tập nội bộ của BreadTrans, dùng để gợi ý bài tập phù hợp. Đây không phải trình độ CEFR và không
        phải chứng chỉ.
        {placement.partial ? " Kỹ năng chưa đánh giá sẽ được xếp mức khi có kết quả chấm." : ""}
      </p>
    </section>
  );
}
