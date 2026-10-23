"use client";

import { use, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { ToeicQuestionCard, ToeicGroupContext } from "@/components/toeic/ToeicQuestionCard";

type PreviewGroup = {
  part: number;
  groupOrder: number;
  imageUrl: string | null;
  passageText: string | null;
  hasAudio: boolean;
  questions: Array<{
    id: number;
    questionNumber: number;
    text: string | null;
    options: string[];
  }>;
};

type PreviewTask = {
  id: number;
  order: number;
  title?: string | null;
  prompt?: string | null;
  taskKind?: string;
};

type LearnerPreviewDto = {
  examId: number;
  title: string;
  preview: true;
  lr: { groups: PreviewGroup[] } | null;
  speaking: PreviewTask[] | null;
  writing: PreviewTask[] | null;
};

export default function ExamLearnerPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const examId = Number(rawId);
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [groupIndex, setGroupIndex] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-exam-learner-preview", examId],
    queryFn: async () =>
      (await axiosClient.get(
        `/admin/exams/${examId}/learner-preview`,
      )) as unknown as LearnerPreviewDto,
    enabled: Number.isInteger(examId),
  });

  const groups = data?.lr?.groups ?? [];
  const current = groups[groupIndex];
  const isListening = current ? current.part <= 4 : false;

  const taskPreview = useMemo(
    () => [
      ...(data?.speaking ?? []).map((t) => ({ ...t, skill: "Speaking" as const })),
      ...(data?.writing ?? []).map((t) => ({ ...t, skill: "Writing" as const })),
    ],
    [data],
  );

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
        <span>Chế độ xem trước — chưa xuất bản, không tạo lượt làm bài</span>
        <button
          type="button"
          onClick={() => router.push(`/admin/exams/${examId}`)}
          className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-900"
        >
          <ArrowLeft size={13} /> Kết thúc xem trước
        </button>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {data.title}
        </h1>

        {groups.length > 0 && (
          <>
            <nav className="mt-4 flex flex-wrap gap-2" aria-label="Điều hướng Part">
              {groups.map((g, index) => (
                <button
                  key={`${g.part}-${g.groupOrder}`}
                  type="button"
                  onClick={() => setGroupIndex(index)}
                  className={`rounded-lg border px-3 py-1 text-xs font-bold ${index === groupIndex ? "border-amber-500 bg-amber-500 text-white" : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
                >
                  Part {g.part} · Nhóm {g.groupOrder}
                </button>
              ))}
            </nav>

            {current && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <ToeicGroupContext
                  group={{
                    part: current.part,
                    imageUrl: current.imageUrl,
                    passageText: current.passageText,
                  }}
                  isListening={isListening}
                />
                <div className="space-y-4">
                  {current.questions.map((q) => (
                    <ToeicQuestionCard
                      key={q.id}
                      question={q}
                      selectedIndex={answers[q.id]}
                      onSelect={(optionIndex) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: optionIndex }))
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {taskPreview.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Speaking / Writing
            </h2>
            {taskPreview.map((task) => (
              <div
                key={`${task.skill}-${task.id}`}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {task.skill} · Task {task.order}: {task.title ?? ""}
                </p>
                {task.prompt && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {task.prompt}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
