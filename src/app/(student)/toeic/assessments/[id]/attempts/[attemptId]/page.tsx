"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import axiosClient from "@/lib/api/axiosClient";
import { toeicService } from "@/lib/api/services/toeic.service";

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
        router.push(`/toeic/attempts/${component.childAttemptId}`);
      }
    },
    onError: (err: any) =>
      setError(err?.response?.data?.message ?? "Không thể mở component."),
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
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-5 py-10">
      <Link
        href={`/toeic/assessments/${id}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> Chi tiết assessment
      </Link>
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
              Resume
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {data.assessment.title}
            </h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${data.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
          >
            {data.status}
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
            return (
              <div
                key={component.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">
                    {component.order}. {component.kind}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {done
                      ? "Đã hoàn tất theo dữ liệu authoritative"
                      : "Chưa hoàn tất"}
                  </p>
                </div>
                {done ? (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 size={16} /> Hoàn tất
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={startComponent.isPending}
                    onClick={() =>
                      startComponent.mutate(component.assessmentComponentId)
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                  >
                    {startComponent.isPending ? (
                      <Loader2 className="animate-spin" size={15} />
                    ) : (
                      <ExternalLink size={15} />
                    )}{" "}
                    Mở component
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-xs leading-5 text-slate-500">
          L&R mở runtime TOEIC hiện hữu. Speaking/Writing tiếp tục nộp qua
          runtime skill tương ứng; parent chỉ nhận các submission được liên kết
          rõ ràng.
        </p>
      </section>
    </main>
  );
}
