"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Play,
  LockKeyhole,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import axiosClient from "@/lib/api/axiosClient";

const kindLabels: Record<string, string> = {
  LISTENING_READING: "Listening + Reading",
  SPEAKING: "Speaking",
  WRITING: "Writing",
};

const componentMeta: Record<string, { detail: string; duration: string }> = {
  LISTENING_READING: { detail: "200 câu hỏi", duration: "Khoảng 120 phút" },
  SPEAKING: { detail: "11 câu hỏi", duration: "Khoảng 20 phút" },
  WRITING: { detail: "8 câu hỏi", duration: "60 phút" },
};

export default function ToeicAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const id = Number(rawId);
  const router = useRouter();
  const [error, setError] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["toeic-assessment", id],
    queryFn: async () =>
      (await axiosClient.get(`/toeic/assessments/${id}`)) as any,
    enabled: Number.isInteger(id),
  });
  const start = useMutation({
    mutationFn: async () =>
      (await axiosClient.post(`/toeic/assessments/${id}/attempts`, {
        idempotencyKey: `learner-${id}`,
      })) as any,
    onSuccess: (attempt) =>
      router.push(`/toeic/assessments/${id}/attempts/${attempt.id}`),
    onError: (err: any) =>
      setError(err?.response?.data?.message ?? "Không thể bắt đầu bài thi."),
  });
  if (isLoading)
    return (
      <main className="mx-auto max-w-4xl p-8 text-sm text-slate-500">
        Đang tải assessment…
      </main>
    );
  if (!data)
    return (
      <main className="mx-auto max-w-4xl p-8 text-sm text-rose-700">
        Không tìm thấy assessment.
      </main>
    );
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-5 py-10">
      <Link
        href="/toeic/assessments"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> Tất cả bài thi
      </Link>
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
              BÀI THI TOEIC
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {data.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              {data.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => start.mutate()}
            disabled={start.isPending || data.attempt?.status === "COMPLETED"}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-700 disabled:opacity-50"
          >
            {start.isPending ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Play size={16} />
            )}{" "}
            {data.attempt?.status === "COMPLETED"
              ? "Đã hoàn thành"
              : data.attempt
                ? "Tiếp tục"
                : "Bắt đầu"}
          </button>
        </div>
        {error && (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          Đây là bài luyện mô phỏng TOEIC để tự học và theo dõi tiến độ; kết quả
          không phải điểm thi chính thức của ETS.
        </p>
        <div className="mt-8 space-y-3">
          {data.components.map((component: any) => (
              <div
                key={component.id}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 p-4"
              >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                {component.order}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">
                  {kindLabels[component.kind]}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {componentMeta[component.kind]?.detail ?? "Nội dung theo cấu trúc TOEIC"}
                  <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                  {componentMeta[component.kind]?.duration ?? "Theo tiến độ bài thi"}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 size={15} /> Sẵn sàng
              </span>
            </div>
          ))}
        </div>
        <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
          <LockKeyhole size={14} /> Quyền truy cập các phần thi được kiểm tra
          trước khi bắt đầu.
        </p>
      </section>
    </main>
  );
}
