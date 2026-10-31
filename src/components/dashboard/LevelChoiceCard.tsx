"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ClipboardCheck, Compass } from "lucide-react";

import { learningPathService } from "@/lib/api/services/learningPath.service";
import { LEVEL_OPTIONS, needsLevelChoice, type LearnerProfile } from "@/lib/learning-path/onboarding";
import {
  practiceLevelLabel,
  prioritySkillsText,
  skillsBelowOverall,
  type PracticeLevel,
} from "@/lib/learning-path/practiceLevel";

/**
 * Dashboard level card (F5.3): without any placement the learner takes the
 * Entry Diagnostic or picks a level (Mất gốc included); afterwards it shows
 * the current practice level. Internal levels, not CEFR.
 */
export function LevelChoiceCard({ profile }: { profile: LearnerProfile | undefined }) {
  const queryClient = useQueryClient();
  const choose = useMutation({
    mutationFn: (selfLevel: PracticeLevel) => learningPathService.updateProfile({ selfLevel }),
    onSuccess: (next) => queryClient.setQueryData(["learning-path-profile"], next),
  });
  if (!profile) return null;

  if (!needsLevelChoice(profile)) {
    const level = profile.placementSource === "DIAGNOSTIC" ? profile.placementLevel : profile.selfLevel;
    const priority =
      profile.placementSource === "DIAGNOSTIC"
        ? skillsBelowOverall(Object.fromEntries(profile.skills.map((s) => [s.skill, s.level])), level)
        : [];
    return (
      <section
        aria-label="Mức luyện tập"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 px-5 py-4 dark:border-blue-900/60 dark:bg-blue-950/30"
      >
        <p className="flex items-center gap-2 text-base text-slate-700 dark:text-slate-300">
          <Compass size={20} className="text-blue-700 dark:text-blue-300" aria-hidden="true" />
          Mức luyện tập {profile.placementSource === "DIAGNOSTIC" ? "đề xuất" : "bạn chọn"}:
          <strong className="text-blue-800 dark:text-blue-200">{practiceLevelLabel(level)}</strong>
        </p>
        {priority.length > 0 && (
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            Cần ưu tiên: {prioritySkillsText(priority)}
          </p>
        )}
        {profile.placementSource === "SELF" && (
          <Link
            href="/diagnostic"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-900 dark:text-blue-300"
          >
            Làm bài kiểm tra để xếp mức từng kỹ năng
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="level-choice-heading"
      className="rounded-3xl border border-blue-200 bg-white p-6 shadow-xs dark:border-blue-900/60 dark:bg-slate-900 sm:p-7"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <h2 id="level-choice-heading" className="text-xl font-black text-slate-900 dark:text-slate-100">
            Chọn mức luyện tập để nhận bài phù hợp
          </h2>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
            Làm bài kiểm tra đầu vào để xếp mức riêng cho từng kỹ năng, hoặc tự chọn mức để bắt đầu ngay. Mức cao hơn
            mở bằng bài kiểm tra ngắn hoặc tiến độ luyện tập.
          </p>
          <Link
            href="/diagnostic"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-base font-bold text-white hover:bg-blue-700"
          >
            <ClipboardCheck size={18} aria-hidden="true" />
            Làm bài kiểm tra đầu vào
          </Link>
        </div>
        <div className="w-full lg:max-w-md">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Hoặc tự chọn mức</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {LEVEL_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                disabled={choose.isPending}
                onClick={() => choose.mutate(o.value)}
                title={o.description}
                className="min-h-14 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:border-blue-400 hover:bg-blue-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-blue-950/40"
              >
                <span className="block text-base font-bold text-slate-900 dark:text-slate-100">{o.label}</span>
                <span className="block text-xs text-slate-600 dark:text-slate-400">{o.description}</span>
              </button>
            ))}
          </div>
          {choose.isError && (
            <p className="mt-2 text-sm font-semibold text-rose-700 dark:text-rose-400" role="alert">
              Chưa lưu được mức. Vui lòng thử lại.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
