"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";

import { MistakeCard } from "@/components/mistakes/MistakeCard";
import { MistakeReview } from "@/components/mistakes/MistakeReview";
import { MISTAKE_SKILLS, mistakesService, type MistakeItem, type MistakeSkill } from "@/lib/api/services/mistakes.service";
import { MISTAKE_SKILL_LABEL, groupMistakes, mistakeRowLabel, parseMistakeSkill } from "@/lib/mistakes/mistakeView";

/**
 * "Sổ lỗi": every mistake the learner has not put right yet. A compact list
 * grouped by exercise on the left and the chosen mistake in a sticky pane on
 * the right (owner 2026-11-12: one large card per mistake meant scrolling for
 * ever, inside a narrow centred column). On a phone the chosen mistake opens
 * under its row.
 */
export function MistakeNotebook() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const skill = parseMistakeSkill(searchParams.get("skill"));
  const status = searchParams.get("status") === "resolved" ? "resolved" : "open";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [reviewing, setReviewing] = useState(false);
  // null: nothing chosen yet, the first mistake of the page is shown on wide screens.
  const [chosenId, setChosenId] = useState<number | null>(null);
  const [phoneOpenId, setPhoneOpenId] = useState<number | null>(null);

  const go = (next: { skill?: MistakeSkill | null; status?: "open" | "resolved"; page?: number }) => {
    const params = new URLSearchParams();
    const nextSkill = next.skill === undefined ? skill : (next.skill ?? undefined);
    const nextStatus = next.status ?? status;
    if (nextSkill) params.set("skill", nextSkill.toLowerCase());
    if (nextStatus === "resolved") params.set("status", "resolved");
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const query = params.toString();
    setChosenId(null);
    setPhoneOpenId(null);
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
  const items = list.data?.items ?? [];
  const groups = groupMistakes(items);
  // A mistake that left the page (resolved, filtered) falls back to the first one.
  const chosen = items.find((item) => item.id === chosenId) ?? items[0] ?? null;

  const segment = (active: boolean) =>
    `inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
      active
        ? "bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"
        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
    }`;

  const detail = (item: MistakeItem) => (
    <MistakeCard
      item={item}
      resolveAfter={resolveAfter}
      busy={toggle.isPending}
      onToggleResolved={(resolved) => toggle.mutate({ id: item.id, resolved })}
    />
  );

  return (
    <div className="w-full pb-20">
      {/* Title row */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Bảng điều khiển
          </Link>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 dark:text-slate-100">Sổ lỗi</h1>
          <p className="mt-1 max-w-[72ch] text-[15px] text-slate-600 dark:text-slate-400">
            Những câu bạn làm sai trong bài luyện. Câu trắc nghiệm trả lời đúng {resolveAfter} lần liên tiếp thì ra khỏi sổ.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <p className="text-[15px] text-slate-600 dark:text-slate-400">
            <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {summary.isLoading ? "…" : open}
            </span>{" "}
            lỗi chưa khắc phục
          </p>
          {/* A review only of what can be answered again here; listening is redone in its exercise.
              No greyed-out button when there is nothing to review (owner 2026-11-12). */}
          {summary.data && summary.data.answerable > 0 && (
            <button
              type="button"
              onClick={() => setReviewing(true)}
              disabled={reviewing}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-amber-500 px-4 text-sm font-bold text-white transition-colors hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ôn {summary.data.answerable} câu
            </button>
          )}
        </div>
      </div>

      {reviewing && (
        <div className="mb-6">
          <MistakeReview skill={skill} onClose={() => setReviewing(false)} />
        </div>
      )}

      {/* Filters: skill on the left, status on the right */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Lọc theo kỹ năng" className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button type="button" aria-pressed={!skill} onClick={() => go({ skill: null })} className={segment(!skill)}>
            Tất cả <span className="tabular-nums text-slate-500 dark:text-slate-400">{open}</span>
          </button>
          {MISTAKE_SKILLS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={skill === key}
              onClick={() => go({ skill: key })}
              className={segment(skill === key)}
            >
              {MISTAKE_SKILL_LABEL[key]}{" "}
              <span className="tabular-nums text-slate-500 dark:text-slate-400">{summary.data?.bySkill[key] ?? 0}</span>
            </button>
          ))}
        </div>
        <div role="group" aria-label="Trạng thái" className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button type="button" aria-pressed={status === "open"} onClick={() => go({ status: "open" })} className={segment(status === "open")}>
            Chưa khắc phục
          </button>
          <button
            type="button"
            aria-pressed={status === "resolved"}
            onClick={() => go({ status: "resolved" })}
            className={segment(status === "resolved")}
          >
            Đã khắc phục <span className="tabular-nums text-slate-500 dark:text-slate-400">{summary.data?.resolved ?? 0}</span>
          </button>
        </div>
      </div>

      {list.isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="animate-spin text-slate-500" size={28} aria-label="Đang tải sổ lỗi" />
        </div>
      ) : list.isError || !list.data ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-base text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          Chưa tải được sổ lỗi. Hãy thử lại sau.
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {status === "resolved" ? "Chưa có lỗi nào được khắc phục." : "Không có lỗi nào cần ôn ở đây."}
          </p>
          <p className="mt-1 text-[15px] text-slate-600 dark:text-slate-400">
            {status === "resolved"
              ? "Lỗi bạn sửa xong sẽ nằm ở đây."
              : "Khi bạn làm sai trong bài luyện, câu đó sẽ được ghi vào sổ."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* The list */}
          <div className="min-w-0">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              {groups.map((group) => (
                <section key={group.key} aria-label={group.title} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                  <h2 className="flex items-baseline justify-between gap-3 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:bg-slate-800/60 dark:text-slate-100">
                    <span className="min-w-0 truncate">
                      {group.title}
                      <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">{MISTAKE_SKILL_LABEL[group.skill]}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">{group.items.length}</span>
                  </h2>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.items.map((item) => {
                      const selected = chosen?.id === item.id;
                      const phoneOpen = phoneOpenId === item.id;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            aria-current={selected ? "true" : undefined}
                            aria-expanded={phoneOpen}
                            onClick={() => {
                              setChosenId(item.id);
                              setPhoneOpenId((current) => (current === item.id ? null : item.id));
                            }}
                            className={`flex w-full min-h-12 items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 ${
                              selected
                                ? "lg:bg-slate-100 lg:dark:bg-slate-800"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            }`}
                          >
                            <span className="min-w-0 flex-1 truncate text-[15px] text-slate-900 dark:text-slate-100">
                              {mistakeRowLabel(item)}
                            </span>
                            {item.wrongCount > 1 && (
                              <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                                Sai {item.wrongCount} lần
                              </span>
                            )}
                            <ChevronRight
                              size={16}
                              aria-hidden="true"
                              className={`shrink-0 text-slate-400 transition-transform lg:rotate-0 ${phoneOpen ? "rotate-90" : ""}`}
                            />
                          </button>
                          {/* Phone: the mistake opens under its row. */}
                          {phoneOpen && <div className="border-t border-slate-100 p-3 dark:border-slate-800 lg:hidden">{detail(item)}</div>}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>

            {pages > 1 && (
              <nav aria-label="Trang" className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => go({ page: page - 1 })}
                  className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  Trang trước
                </button>
                <span className="text-sm tabular-nums text-slate-600 dark:text-slate-400">
                  Trang {page}/{pages}
                </span>
                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() => go({ page: page + 1 })}
                  className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  Trang sau
                </button>
              </nav>
            )}
          </div>

          {/* Desktop: the chosen mistake stays in view while the list scrolls. */}
          <div className="hidden min-w-0 lg:block">
            <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto">{chosen && detail(chosen)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
