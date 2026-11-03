"use client";

export type RestoreOption = {
  key: string;
  title: string;
  detail: string;
  onPick: () => void;
};

/** What Khôi phục can bring back: the last save, an unfinished session, or both. */
export function ExamRestoreDialog({ options, onClose }: { options: RestoreOption[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="restore-title" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <h2 id="restore-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Khôi phục bài làm
        </h2>
        <ul className="mt-3 space-y-3">
          {options.map((option) => (
            <li key={option.key} className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{option.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{option.detail}</p>
              <button
                type="button"
                onClick={option.onPick}
                className="mt-2 min-h-10 rounded-md bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
              >
                Khôi phục
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="min-h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
