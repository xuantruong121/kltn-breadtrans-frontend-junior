"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, Loader2, Target } from "lucide-react";

import { MistakeCard } from "@/components/mistakes/MistakeCard";
import { MistakeReview } from "@/components/mistakes/MistakeReview";
import { BackButton } from "@/components/ui";
import { MISTAKE_SKILLS, mistakesService, type MistakeSkill } from "@/lib/api/services/mistakes.service";
import { MISTAKE_SKILL_LABEL, parseMistakeSkill } from "@/lib/mistakes/mistakeView";

/** "Sổ lỗi": every mistake the learner has not put right yet, by skill, with a review of the ones that can be answered again. */
export function MistakeNotebook() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const skill = parseMistakeSkill(searchParams.get("skill"));
  const status = searchParams.get("status") === "resolved" ? "resolved" : "open";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [reviewing, setReviewing] = useState(false);

  const go = (next: { skill?: MistakeSkill | null; status?: "open" | "resolved"; page?: number }) => {
    const params = new URLSearchParams();
    const nextSkill = next.skill === undefined ? skill : (next.skill ?? undefined);
    const nextStatus = next.status ?? status;
    if (nextSkill) params.set("skill", nextSkill.toLowerCase());
    if (nextStatus === "resolved") params.set("status", "resolved");
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const query = params.toString();
    router.replace(query ? `/mistakes?${query}` : "/mistakes", { scroll: false });
  };

  const summary = useQuery({ queryKey: ["mistakes", "summary"], queryFn: mistakesService.getSummary });
  const list = useQuery({
    queryKey: ["mistakes", "list", skill ?? "ALL", status, page],
    queryFn: () => mistakesService.getList({ skill, status, page }),
  });
  const toggle = useMutation({
    mutationFn: (input: { id: number; resolved: boolean }) => mistakesService.setResolved(input.id, input.resolved),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mistakes"] }),
  });

  const open = summary.data?.open ?? 0;
  const resolveAfter = summary.data?.resolveAfterCorrect ?? 2;
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;
  const tabClass = (active: boolean) =>
    `inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-sm font-bold transition-colors ${
      active
        ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    }`;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <BackButton href="/dashboard" label="Về bảng điều khiển" />
          <h1 className="mt-3 text-2xl font-black text-slate-900 dark:text-slate-100">Sổ lỗi</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            Những chỗ bạn làm sai trong bài luyện, gom về một nơi. Câu trắc nghiệm trả lời đúng {resolveAfter} lần liên
            tiếp thì ra khỏi sổ.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">
              {summary.isLoading ? "…" : open}
            </p>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">lỗi chưa khắc phục</p>
          </div>
          <button
            type="button"
            onClick={() => setReviewing(true)}
            disabled={reviewing || !summary.data || summary.data.answerable === 0}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            <Target size={16} strokeWidth={2} aria-hidden="true" /> Ôn lỗi
          </button>
        </div>
      </div>

      {reviewing && <MistakeReview skill={skill} onClose={() => setReviewing(false)} />}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo kỹ năng">
        <button type="button" aria-pressed={!skill} onClick={() => go({ skill: null })} className={tabClass(!skill)}>
          Tất cả
          <span className="tabular-nums opacity-80">{open}</span>
        </button>
        {MISTAKE_SKILLS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={skill === key}
            onClick={() => go({ skill: key })}
            className={tabClass(skill === key)}
          >
            {MISTAKE_SKILL_LABEL[key]}
            <span className="tabular-nums opacity-80">{summary.data?.bySkill[key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2" role="group" aria-label="Trạng thái">
        <button
          type="button"
          aria-pressed={status === "open"}
          onClick={() => go({ status: "open" })}
          className={tabClass(status === "open")}
        >
          Chưa khắc phục
        </button>
        <button
          type="button"
          aria-pressed={status === "resolved"}
          onClick={() => go({ status: "resolved" })}
          className={tabClass(status === "resolved")}
        >
          Đã khắc phục
          <span className="tabular-nums opacity-80">{summary.data?.resolved ?? 0}</span>
        </button>
      </div>

      {list.isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={30} aria-label="Đang tải sổ lỗi" />
        </div>
      ) : list.isError || !list.data ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          Chưa tải được sổ lỗi. Hãy thử lại sau.
        </p>
      ) : list.data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <BookOpenCheck className="mx-auto text-emerald-600" size={30} strokeWidth={2} aria-hidden="true" />
          <p className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">
            {status === "resolved" ? "Chưa có lỗi nào được khắc phục." : "Không có lỗi nào cần ôn ở đây."}
          </p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            {status === "resolved"
              ? "Lỗi bạn sửa xong sẽ nằm ở đây."
              : "Khi bạn làm sai trong bài luyện, câu đó sẽ được ghi vào sổ."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.data.items.map((item) => (
            <MistakeCard
              key={item.id}
              item={item}
              resolveAfter={resolveAfter}
              busy={toggle.isPending}
              onToggleResolved={(resolved) => toggle.mutate({ id: item.id, resolved })}
            />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Trang" className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => go({ page: page - 1 })}
            className={`${tabClass(false)} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Trang trước
          </button>
          <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">
            {page}/{pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => go({ page: page + 1 })}
            className={`${tabClass(false)} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Trang sau
          </button>
        </nav>
      )}
    </div>
  );
}
