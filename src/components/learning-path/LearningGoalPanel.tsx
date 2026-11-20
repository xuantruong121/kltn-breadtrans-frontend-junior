"use client";

import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PencilLine } from "lucide-react";
import toast from "react-hot-toast";

import { learningPathService } from "@/lib/api/services/learningPath.service";
import {
  goalDraft,
  goalPatch,
  goalSummary,
  isPastDate,
  minuteChoices,
  toDateInput,
  type GoalDraft,
} from "@/lib/learning-path/goalEditor";
import { GOAL_OPTIONS, TRACK_OPTIONS, type LearnerProfile } from "@/lib/learning-path/onboarding";

const fieldClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100";
const labelClass = "text-sm font-semibold text-slate-700 dark:text-slate-300";

/**
 * The learning goal chosen at onboarding (goal, career track, minutes a day,
 * target day), shown as one line with "Sửa" to change it in place. Used on the
 * dashboard week plan and in the learning progress tab.
 */
export function LearningGoalPanel({
  className = "",
  surface = "muted",
}: {
  className?: string;
  /** "muted" inside a white card, "plain" (white) on the page background. */
  surface?: "muted" | "plain";
}) {
  const surfaceClass =
    surface === "plain" ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-900/60";
  const queryClient = useQueryClient();
  const formId = useId();
  const { data: profile } = useQuery({
    queryKey: ["learning-path-profile"],
    queryFn: learningPathService.getProfile,
    staleTime: 60_000,
  });
  const [draft, setDraft] = useState<GoalDraft | null>(null);

  const save = useMutation({
    mutationFn: (patch: Record<string, unknown>) => learningPathService.updateProfile(patch),
    onSuccess: (next: LearnerProfile) => {
      queryClient.setQueryData(["learning-path-profile"], next);
      // Week plan, suggestions, roadmap and progress all depend on the goal.
      queryClient.invalidateQueries({
        predicate: (q) => String(q.queryKey[0]).startsWith("learning-path") && q.queryKey[0] !== "learning-path-profile",
      });
      setDraft(null);
      toast.success("Đã lưu mục tiêu học.");
    },
    onError: () => toast.error("Không lưu được mục tiêu học. Vui lòng thử lại."),
  });

  if (!profile) return null;
  const saved = goalDraft(profile);
  const today = toDateInput(new Date().toISOString());
  const pastDay = draft ? isPastDate(draft.targetDate, new Date()) : false;
  const set = (patch: Partial<GoalDraft>) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  if (!draft) {
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800 ${surfaceClass} ${className}`}
      >
        <p className="min-w-0 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <span className="font-bold text-slate-900 dark:text-slate-100">Mục tiêu: </span>
          {goalSummary(profile)}
        </p>
        <button
          type="button"
          onClick={() => setDraft(saved)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
        >
          <PencilLine size={16} strokeWidth={2} aria-hidden="true" />
          Sửa
          <span className="sr-only"> mục tiêu học</span>
        </button>
      </div>
    );
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (pastDay) return;
    const patch = goalPatch(saved, draft);
    if (Object.keys(patch).length === 0) {
      setDraft(null);
      return;
    }
    save.mutate(patch);
  };

  return (
    <form
      onSubmit={submit}
      aria-label="Sửa mục tiêu học"
      className={`rounded-xl border border-slate-200 p-4 dark:border-slate-800 ${surfaceClass} ${className}`}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Mục tiêu học</span>
          <select
            autoFocus
            value={draft.goal}
            onChange={(e) => set({ goal: e.target.value as GoalDraft["goal"] })}
            className={fieldClass}
          >
            {GOAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Lĩnh vực</span>
          <select
            value={draft.track}
            onChange={(e) => set({ track: e.target.value as GoalDraft["track"] })}
            className={fieldClass}
          >
            {TRACK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Số phút mỗi ngày</span>
          <select
            value={draft.minutesPerDay}
            onChange={(e) => set({ minutesPerDay: Number(e.target.value) })}
            className={fieldClass}
          >
            {minuteChoices(saved.minutesPerDay).map((m) => (
              <option key={m} value={m}>
                {m} phút
              </option>
            ))}
          </select>
        </label>
        <div>
          <label className="block">
            <span className={labelClass}>Ngày mục tiêu (không bắt buộc)</span>
            <input
              type="date"
              min={today}
              value={draft.targetDate}
              onChange={(e) => set({ targetDate: e.target.value })}
              aria-invalid={pastDay}
              aria-describedby={pastDay ? `${formId}-day-error` : undefined}
              className={fieldClass}
            />
          </label>
          {draft.targetDate && (
            <button
              type="button"
              onClick={() => set({ targetDate: "" })}
              className="mt-1 min-h-11 text-sm font-semibold text-slate-600 underline-offset-2 hover:underline dark:text-slate-400"
            >
              Xoá ngày mục tiêu
            </button>
          )}
          {pastDay && (
            <p id={`${formId}-day-error`} className="mt-1 text-sm font-semibold text-rose-700 dark:text-rose-400">
              Ngày mục tiêu phải từ hôm nay trở đi.
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => setDraft(null)}
          disabled={save.isPending}
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-wait dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Huỷ
        </button>
        <button
          type="submit"
          disabled={save.isPending}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-wait ${
            pastDay ? "invisible" : ""
          }`}
        >
          {save.isPending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          Lưu mục tiêu
        </button>
      </div>
    </form>
  );
}
