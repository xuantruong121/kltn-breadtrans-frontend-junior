"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock3, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toeicService } from "@/lib/api/services/toeic.service";

export default function ToeicHistoryPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["toeic-history"],
    queryFn: toeicService.getHistory,
  });
  if (isLoading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-amber-600" />
      </div>
    );
  if (isError)
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center text-rose-700">
        Không tải được lịch sử TOEIC.
      </main>
    );
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
        Lịch sử luyện đề TOEIC
      </h1>
      <div className="mt-6 space-y-3">
        {(data ?? []).map((item) => (
          <article
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100">
                {item.exam.title}
              </h2>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Clock3 size={13} />{" "}
                {new Date(item.createdAt).toLocaleString("vi-VN")} ·{" "}
                {item.mode === "FULL_TEST" ? "Full Test" : "Luyện tập"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {item.status === "SUBMITTED" ? (
                <button
                  type="button"
                  onClick={() => router.push(`/toeic/results/${item.id}`)}
                  className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Xem kết quả <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push(`/toeic/attempts/${item.id}`)}
                  className="min-h-10 rounded-xl bg-amber-500 px-3 text-sm font-bold text-white"
                >
                  Tiếp tục
                </button>
              )}
            </div>
          </article>
        ))}
        {!data?.length && (
          <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Chưa có lượt luyện đề nào.
          </p>
        )}
      </div>
    </main>
  );
}
