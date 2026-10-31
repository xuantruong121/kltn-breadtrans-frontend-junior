"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, SlidersHorizontal } from "lucide-react";

import { learningPathService } from "@/lib/api/services/learningPath.service";
import {
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  MINUTE_OPTIONS,
  ONBOARDING_SKIPPED_KEY,
  ONBOARDING_STEPS,
  TRACK_OPTIONS,
  canContinue,
  hasDiagnosticPlacement,
  profilePayload,
  type OnboardingAnswers,
} from "@/lib/learning-path/onboarding";
import { PRACTICE_LEVEL_LABEL, prioritySkillsText, skillsBelowOverall } from "@/lib/learning-path/practiceLevel";
import { getApiErrorMessage } from "@/lib/utils/apiError";

const STEP_TITLE: Record<(typeof ONBOARDING_STEPS)[number], { title: string; hint: string }> = {
  goal: { title: "Bạn học tiếng Anh để làm gì?", hint: "Mục tiêu giúp chọn dạng bài phù hợp." },
  track: { title: "Bạn làm việc hoặc học trong lĩnh vực nào?", hint: "Bài luyện sẽ ưu tiên chủ đề gần với công việc của bạn." },
  time: { title: "Mỗi ngày bạn dành bao nhiêu phút?", hint: "Nhiệm vụ hằng ngày sẽ vừa với thời gian này." },
  level: { title: "Xác định mức luyện tập", hint: "Làm bài kiểm tra đầu vào hoặc tự chọn mức. Bạn có thể đổi sau." },
};

function OptionTile({
  selected,
  label,
  description,
  onSelect,
}: {
  selected: boolean;
  label: string;
  description?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex min-h-16 w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
        selected
          ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40"
          : "border-slate-200 bg-white hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700"
      }`}
    >
      <span
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 dark:border-slate-600"
        }`}
        aria-hidden="true"
      >
        {selected && <Check size={13} strokeWidth={3} />}
      </span>
      <span>
        <span className="block text-base font-bold text-slate-900 dark:text-slate-100">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400">{description}</span>}
      </span>
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [stepIndex, setStepIndex] = useState(0);
  const [levelPath, setLevelPath] = useState<"TEST" | "SELF">("TEST");
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    goal: null,
    track: null,
    minutesPerDay: null,
    targetDate: "",
    selfLevel: null,
  });
  const step = ONBOARDING_STEPS[stepIndex];
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1;
  const set = (patch: Partial<OnboardingAnswers>) => setAnswers((prev) => ({ ...prev, ...patch }));
  const profileQuery = useQuery({
    queryKey: ["learning-path-profile"],
    queryFn: () => learningPathService.getProfile(),
  });
  // A diagnostic result already set the level; the API refuses a self-chosen one.
  const placed = hasDiagnosticPlacement(profileQuery.data);
  const placedLevel = profileQuery.data?.placementLevel;
  const prioritySkills = skillsBelowOverall(
    Object.fromEntries((profileQuery.data?.skills ?? []).map((s) => [s.skill, s.level])),
    placedLevel,
  );

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => learningPathService.updateProfile(body),
    onSuccess: (profile) => {
      queryClient.setQueryData(["learning-path-profile"], profile);
    },
  });

  const finish = async () => {
    const chooseSelf = !placed && levelPath === "SELF" && answers.selfLevel;
    await save.mutateAsync(profilePayload({ ...answers, selfLevel: chooseSelf ? answers.selfLevel : null }));
    router.push(placed || chooseSelf ? "/dashboard" : "/diagnostic");
  };

  const skip = async () => {
    try {
      sessionStorage.setItem(ONBOARDING_SKIPPED_KEY, "1");
    } catch {
      // storage unavailable: the dashboard may offer onboarding again
    }
    await save.mutateAsync({ onboarded: true }).catch(() => undefined);
    router.push("/dashboard");
  };

  const finishDisabled =
    save.isPending ||
    (isLast && profileQuery.isLoading) ||
    (isLast && !placed && levelPath === "SELF" && !answers.selfLevel);
  const headline = step === "level" && placed
    ? { title: "Mức luyện tập của bạn", hint: "Đã xác định từ bài kiểm tra đầu vào." }
    : STEP_TITLE[step];

  return (
    <div className="mx-auto w-full max-w-3xl py-4 sm:py-8">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
          Bước {stepIndex + 1}/{ONBOARDING_STEPS.length}
        </p>
        <button
          type="button"
          onClick={skip}
          className="min-h-11 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Bỏ qua
        </button>
      </div>
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {ONBOARDING_STEPS.map((s, i) => (
          <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`} />
        ))}
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 sm:text-3xl">{headline.title}</h1>
        <p className="mt-2 text-base text-slate-600 dark:text-slate-400">{headline.hint}</p>

        <div className="mt-6" role="radiogroup" aria-label={STEP_TITLE[step].title}>
          {step === "goal" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {GOAL_OPTIONS.map((o) => (
                <OptionTile key={o.value} selected={answers.goal === o.value} label={o.label} description={o.description} onSelect={() => set({ goal: o.value })} />
              ))}
            </div>
          )}
          {step === "track" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {TRACK_OPTIONS.map((o) => (
                <OptionTile key={o.value} selected={answers.track === o.value} label={o.label} description={o.description} onSelect={() => set({ track: o.value })} />
              ))}
            </div>
          )}
          {step === "time" && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {MINUTE_OPTIONS.map((m) => (
                  <OptionTile key={m} selected={answers.minutesPerDay === m} label={`${m} phút`} onSelect={() => set({ minutesPerDay: m })} />
                ))}
              </div>
              <label className="mt-6 block max-w-xs">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ngày mục tiêu (không bắt buộc)</span>
                <input
                  type="date"
                  value={answers.targetDate}
                  onChange={(e) => set({ targetDate: e.target.value })}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
            </>
          )}
          {step === "level" && placed && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/40">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Mức luyện tập đề xuất</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {placedLevel ? PRACTICE_LEVEL_LABEL[placedLevel] : "Theo kết quả từng kỹ năng"}
              </p>
              {prioritySkills.length > 0 && (
                <p className="mt-2 text-base font-semibold text-slate-800 dark:text-slate-200">
                  Cần ưu tiên: {prioritySkillsText(prioritySkills)}
                </p>
              )}
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Mức cao hơn được mở bằng bài kiểm tra mở khóa hoặc tiến độ luyện tập.
              </p>
            </div>
          )}
          {step === "level" && !placed && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={levelPath === "TEST"}
                  onClick={() => setLevelPath("TEST")}
                  className={`flex items-start gap-3 rounded-2xl border p-5 text-left ${
                    levelPath === "TEST" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40" : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <ClipboardCheck size={24} className="mt-0.5 shrink-0 text-blue-700 dark:text-blue-300" aria-hidden="true" />
                  <span>
                    <span className="block text-base font-bold text-slate-900 dark:text-slate-100">Làm bài kiểm tra đầu vào</span>
                    <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400">
                      Khoảng 30–40 phút, xếp mức riêng cho Nghe, Nói, Đọc, Viết. Nên chọn.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={levelPath === "SELF"}
                  onClick={() => setLevelPath("SELF")}
                  className={`flex items-start gap-3 rounded-2xl border p-5 text-left ${
                    levelPath === "SELF" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40" : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <SlidersHorizontal size={24} className="mt-0.5 shrink-0 text-blue-700 dark:text-blue-300" aria-hidden="true" />
                  <span>
                    <span className="block text-base font-bold text-slate-900 dark:text-slate-100">Tự chọn mức</span>
                    <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400">
                      Bắt đầu ngay; mức cao hơn mở bằng bài kiểm tra ngắn hoặc tiến độ luyện tập.
                    </span>
                  </span>
                </button>
              </div>
              {levelPath === "SELF" && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Chọn mức luyện tập">
                  {LEVEL_OPTIONS.map((o) => (
                    <OptionTile key={o.value} selected={answers.selfLevel === o.value} label={o.label} description={o.description} onSelect={() => set({ selfLevel: o.value })} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {save.isError && (
          <p className="mt-5 text-sm font-semibold text-rose-700 dark:text-rose-400" role="alert">
            {getApiErrorMessage(save.error, "Chưa lưu được lựa chọn. Vui lòng thử lại.")}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-base font-semibold text-slate-700 hover:bg-slate-100 disabled:invisible dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Quay lại
          </button>
          <button
            type="button"
            onClick={() => (isLast ? finish() : setStepIndex((i) => i + 1))}
            disabled={isLast ? finishDisabled : !canContinue(step, answers)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-base font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLast ? (!placed && levelPath === "TEST" ? "Lưu và làm bài kiểm tra" : "Lưu và bắt đầu") : "Tiếp tục"}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
