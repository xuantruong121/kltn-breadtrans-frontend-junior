import { Clock, SquareCheckBig } from "lucide-react";
import { TOEIC_EXAM, examMinutes, partsOf, sectionTotal, type ExamSection } from "@/lib/landing/fragments";
import { FragmentCard } from "./FragmentCard";

const SECTIONS: { section: ExamSection; label: string; cols: string }[] = [
  { section: "listening", label: "Nghe", cols: "grid-cols-4" },
  { section: "reading", label: "Đọc", cols: "grid-cols-3" },
];

/**
 * The TOEIC exam detail card: the test's structure, Part by Part, and the two
 * ways to take it. No score and no other certificate. The two actions are a
 * picture of the app's buttons.
 */
export function FragToeic() {
  const exam = TOEIC_EXAM;
  return (
    <FragmentCard ui="exam-detail" className="gap-4 p-6">
      <div className="flex flex-col gap-1.5">
        <span className="text-[18px] font-bold leading-[1.35]">{exam.title}</span>
        <span className="text-[14px] font-semibold text-slate-500 dark:text-slate-400">{exam.source}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[14px] font-bold text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <SquareCheckBig size={16} strokeWidth={2} aria-hidden="true" />
          {exam.totalQuestions} câu
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[14px] font-bold text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <Clock size={16} strokeWidth={2} aria-hidden="true" />
          {examMinutes(exam)} phút
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 @md:grid-cols-2">
        {SECTIONS.map(({ section, label, cols }) => (
          <div key={section} className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <span className="text-[14px] font-bold text-slate-600 dark:text-slate-300">
              {label} · {sectionTotal(exam, section)} câu
            </span>
            <ul className={`grid gap-1.5 ${cols}`}>
              {partsOf(exam, section).map((p) => (
                <li key={p.part} className="flex flex-col items-center rounded-[10px] bg-white py-1.5 dark:bg-slate-900">
                  <span className="text-[13px] font-bold whitespace-nowrap text-slate-500 dark:text-slate-400">Part {p.part}</span>
                  <span className="text-[17px] font-bold">{p.questions}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2.5">
        <span className="inline-flex min-h-12 flex-[1_1_160px] items-center justify-center rounded-2xl bg-blue-600 px-3 text-[15px] font-bold text-white">
          {exam.fullTest}
        </span>
        <span className="inline-flex min-h-12 flex-[1_1_160px] items-center justify-center rounded-2xl border-[1.5px] border-blue-200 bg-white px-3 text-[15px] font-bold text-blue-800 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300">
          {exam.pickParts}
        </span>
      </div>
    </FragmentCard>
  );
}
