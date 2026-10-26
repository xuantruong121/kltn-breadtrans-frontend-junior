"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import axiosClient from "@/lib/api/axiosClient";
import { toeicService } from "@/lib/api/services/toeic.service";
import { useCanonicalExamPath } from "@/lib/toeic/useCanonicalExamPath";

const componentLabels: Record<string, string> = {
  LISTENING_READING: "Listening + Reading",
  SPEAKING: "Speaking",
  WRITING: "Writing",
};

const componentDetails: Record<string, string> = {
  LISTENING_READING: "200 câu hỏi · khoảng 120 phút",
  SPEAKING: "11 câu hỏi · khoảng 20 phút",
  WRITING: "8 câu hỏi · 60 phút",
};

const statusLabels: Record<string, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang làm",
  COMPLETED: "Hoàn thành",
};

export default function ToeicAssessmentAttemptPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id: rawId, attemptId: rawAttemptId } = use(params);
  const id = Number(rawId);
  const attemptId = Number(rawAttemptId);
  const router = useRouter();
  const client = useQueryClient();
  const [error, setError] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["toeic-assessment-attempt", attemptId],
    queryFn: async () =>
      (await axiosClient.get(
        `/toeic/assessments/attempts/${attemptId}`,
      )) as any,
    enabled: Number.isInteger(attemptId),
    refetchInterval: 5000,
  });
  const startComponent = useMutation({
    mutationFn: async (componentId: number) =>
      (await axiosClient.post(
        `/toeic/assessments/attempts/${attemptId}/components/${componentId}/start`,
      )) as any,
    onSuccess: async (result, componentId) => {
      await client.invalidateQueries({
        queryKey: ["toeic-assessment-attempt", attemptId],
      });
      const component = result.components?.find(
        (item: any) => item.assessmentComponentId === componentId,
      );
      if (component?.childAttemptId) {
        await toeicService.beginAttempt(component.childAttemptId);
        router.push(
          `/toeic/attempts/${component.childAttemptId}?parentAssessmentId=${id}&parentAttemptId=${attemptId}&parentComponentId=${componentId}`,
        );
      } else if (
        component?.kind === "SPEAKING" &&
        component.sourceId &&
        component.speakingExerciseIds?.[0]
      ) {
        router.push(
          `/speaking/${component.speakingExerciseIds[0]}?set=${encodeURIComponent(String(component.sourceId))}&parentAssessmentId=${id}&parentAttemptId=${attemptId}&parentComponentId=${componentId}&examExerciseIds=${component.speakingExerciseIds.join(",")}`,
        );
      } else if (
        component?.kind === "WRITING" &&
        component.writingQuizIds?.[0]
      ) {
        router.push(
          `/writing/${component.writingQuizIds[0]}?parentAssessmentId=${id}&parentAttemptId=${attemptId}&parentComponentId=${componentId}`,
        );
      }
    },
    onError: (err: any) =>
      setError(err?.response?.data?.message ?? "Không thể mở component."),
  });
  // The back-link goes straight to the canonical product URL instead of the
  // legacy aggregate URL, so normal runtime navigation needs no compatibility
  // redirect. The legacy path stays as the fallback until the lookup settles.
  const { path: canonicalDetailPath } = useCanonicalExamPath({
    assessmentId: id,
  });
  useEffect(() => {
    if (data?.status === "COMPLETED")
      void client.invalidateQueries({ queryKey: ["toeic-assessment", id] });
  }, [data?.status, client, id]);
  if (isLoading)
    return (
      <main className="mx-auto max-w-4xl p-8 text-sm text-slate-500">
        Đang khôi phục tiến độ…
      </main>
    );
  if (!data)
    return (
      <main className="mx-auto max-w-4xl p-8 text-sm text-rose-700">
        Không tìm thấy lượt làm bài.
      </main>
      );
  const completedCount = data.components.filter(
    (component: any) => component.status === "COMPLETED",
  ).length;
  const nextComponent = data.components.find(
    (component: any) => component.status !== "COMPLETED",
  );
  const parentStatus = statusLabels[data.status] ?? "Đang làm";
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-5 py-10">
      <Link
        href={canonicalDetailPath ?? `/toeic/assessments/${id}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> Chi tiết bài thi
      </Link>
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
              TIẾN ĐỘ BÀI THI
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {data.assessment.title}
            </h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${data.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
            aria-label={`Trạng thái bài thi: ${parentStatus}`}
          >
            {parentStatus} · {completedCount}/{data.components.length} phần
          </span>
        </div>
        {error && (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}
        <div className="mt-8 space-y-3">
          {data.components.map((component: any) => {
            const done = component.status === "COMPLETED";
            const isNext =
              nextComponent?.assessmentComponentId === component.assessmentComponentId;
            const componentStatus = statusLabels[component.status] ?? "Chưa bắt đầu";
            return (
              <div
                key={component.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">
                    {component.order}. {componentLabels[component.kind] ?? "Phần thi"}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {componentDetails[component.kind] ?? "Theo cấu trúc bài thi"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {done
                      ? "Phần này đã hoàn thành"
                      : component.status === "IN_PROGRESS"
                        ? "Tiến độ đã lưu — có thể tiếp tục"
                        : "Sẵn sàng để bắt đầu"}
                  </p>
                  {component.kind === "WRITING" &&
                    component.writingQuizIds?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {component.writingQuizIds.map((quizId: number, index: number) => (
                          <Link
                            key={quizId}
                            href={`/writing/${quizId}?parentAssessmentId=${id}&parentAttemptId=${attemptId}&parentComponentId=${component.assessmentComponentId}`}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                          >
                            Bài viết {index + 1}
                          </Link>
                        ))}
                      </div>
                    )}
                </div>
                {done ? (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 size={16} /> {componentStatus}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={startComponent.isPending}
                    onClick={() =>
                      startComponent.mutate(component.assessmentComponentId)
                    }
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${isNext ? "bg-slate-900 text-white shadow-sm hover:bg-slate-700" : "border border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"}`}
                    aria-label={`${isNext ? "Tiếp tục" : "Mở"} ${componentLabels[component.kind] ?? "phần thi"}`}
                  >
                    {startComponent.isPending ? (
                      <Loader2 className="animate-spin" size={15} />
                    ) : (
                      <ExternalLink size={15} />
                    )}{" "}
                    {isNext
                      ? component.status === "IN_PROGRESS"
                        ? "Tiếp tục bài thi"
                        : "Bắt đầu phần tiếp theo"
                      : "Mở phần này"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          Tiến độ được lưu theo từng phần. Bạn có thể rời bài và quay lại tiếp tục
          bất cứ lúc nào.
        </p>
      </section>
    </main>
  );
}
