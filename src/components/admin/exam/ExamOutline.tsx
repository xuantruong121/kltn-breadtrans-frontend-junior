import type { ReactElement } from "react";
import { CheckCircle2, AlertTriangle, Circle } from "lucide-react";
import {
  buildLrOutline,
  groupBySkill,
  type OutlineGroup,
  type OutlineIssue,
} from "@/lib/examStudio/examOutlineLogic";

const stateIcon: Record<string, ReactElement> = {
  READY: <CheckCircle2 size={14} className="text-emerald-600" />,
  WARNING: <AlertTriangle size={14} className="text-amber-600" />,
  INCOMPLETE: <Circle size={14} className="text-slate-400" />,
};

/** Real Part-level navigation + content counts + readiness, no decoration. */
export function ExamOutline({
  groups,
  issues,
  selectedPart,
  onSelectPart,
}: {
  groups: OutlineGroup[];
  issues: OutlineIssue[];
  selectedPart: number | null;
  onSelectPart: (part: number) => void;
}) {
  const rows = buildLrOutline(groups, issues);
  const { listening, reading } = groupBySkill(rows);

  const renderGroup = (label: string, items: typeof rows) => (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="space-y-1">
        {items.map((row) => (
          <button
            key={row.part}
            type="button"
            onClick={() => onSelectPart(row.part)}
            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm ${selectedPart === row.part ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}
          >
            <span className="flex items-center gap-2">
              {selectedPart === row.part ? null : stateIcon[row.state]}
              Part {row.part}
            </span>
            <span className="text-xs opacity-80">
              {row.questionCount} câu
              {row.issueCount > 0 ? ` · ${row.issueCount} vấn đề` : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <nav className="space-y-4" aria-label="Cấu trúc đề thi">
      {renderGroup("Listening", listening)}
      {renderGroup("Reading", reading)}
    </nav>
  );
}
