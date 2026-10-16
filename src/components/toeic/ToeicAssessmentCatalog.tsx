"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, Layers3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";

const labels: Record<string, string> = {
  TOEIC_LR: "Listening + Reading",
  TOEIC_SW: "Speaking + Writing",
  TOEIC_4_SKILLS: "Listening + Reading + Speaking + Writing",
};

export default function ToeicAssessmentCatalog() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["toeic-assessments"],
    queryFn: async () => (await axiosClient.get("/toeic/assessments")) as any[],
  });
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
          TOEIC assessments
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Bài đánh giá theo cấu trúc TOEIC
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Mỗi bài đánh giá điều phối các nguồn luyện tập chính thức theo từng kỹ
          năng. Kết quả được hiển thị độc lập, không cộng thành điểm ETS giả.
        </p>
      </header>
      {isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Đang tải assessment…
        </div>
      )}
      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
          Không tải được danh sách assessment.
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {(data ?? []).map((assessment) => (
          <Link
            key={assessment.id}
            href={`/toeic/assessments/${assessment.id}`}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-xl bg-orange-50 p-3 text-orange-700">
                <ClipboardCheck size={22} />
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {assessment.productFamily}
              </span>
            </div>
            <h2 className="mt-5 text-xl font-bold text-slate-900">
              {assessment.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {assessment.description || labels[assessment.productFamily]}
            </p>
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
              <span className="inline-flex items-center gap-2 text-slate-500">
                <Layers3 size={16} /> {assessment.components?.length ?? 0}{" "}
                component
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-orange-700 transition group-hover:gap-2">
                Xem chi tiết <ArrowRight size={16} />
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!isLoading && !isError && !(data ?? []).length && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Chưa có assessment đã xuất bản.
        </div>
      )}
    </main>
  );
}
