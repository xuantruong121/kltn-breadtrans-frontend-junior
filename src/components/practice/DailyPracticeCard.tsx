"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Headphones,
  LockKeyhole,
  Mic,
  PenTool,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type {
  DailyPracticeItem,
  DailyPracticeResponse,
  DailyPracticeSkill,
} from "@/lib/api/services/user.service";
import { dailyPracticeProgress } from "./dailyPracticeLogic";

const SKILL_META: Record<
  DailyPracticeSkill,
  { label: string; Icon: typeof Headphones; tone: string }
> = {
  LISTENING: { label: "Nghe", Icon: Headphones, tone: "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800" },
  READING: { label: "Đọc", Icon: BookOpen, tone: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800" },
  SPEAKING: { label: "Nói", Icon: Mic, tone: "text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800" },
  WRITING: { label: "Viết", Icon: PenTool, tone: "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800" },
};

function itemAction(item: DailyPracticeItem): string {
  if (item.isLocked) return "Xem quyền truy cập";
  if (item.isCompleted) return "Ôn lại bài";
  return "Bắt đầu";
}

export function DailyPracticeCard({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data?: DailyPracticeResponse;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <section aria-label="Đang tải luyện tập hôm nay" className="animate-pulse rounded-3xl border border-amber-200/80 dark:border-amber-900/50 bg-white/90 dark:bg-slate-900/90 p-5 shadow-xs">
        <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-3 h-6 w-72 max-w-full rounded bg-slate-100 dark:bg-slate-800" />
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800" /><div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800" /><div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800" /></div>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section aria-label="Lỗi tải luyện tập hôm nay" className="rounded-3xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">Luyện tập hôm nay</p><p className="mt-1 text-sm font-semibold text-rose-900 dark:text-rose-200">Không thể tải kế hoạch luyện tập.</p></div>
          <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700"><RefreshCw size={14} /> Thử lại</button>
        </div>
      </section>
    );
  }

  const { completed, target } = dailyPracticeProgress(data);
  return (
    <section aria-labelledby="daily-practice-heading" className="rounded-3xl border border-amber-200/80 dark:border-amber-900/50 bg-white/90 dark:bg-slate-900/90 p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-300"><Sparkles size={15} aria-hidden="true" /> Luyện tập hôm nay</div>
          <h2 id="daily-practice-heading" className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">Hôm nay bạn nên luyện gì?</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">{data.reasonSummary} · khoảng {data.estimatedMinutes} phút</p>
        </div>
        <div className="shrink-0 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 text-xs font-black text-amber-800 dark:text-amber-300" aria-label={`Đã hoàn thành ${completed} trên ${target} hoạt động`}>
          {completed}/{target} hoạt động
        </div>
      </div>
      {target === 0 ? (
        <p className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Hiện chưa có bài luyện phù hợp trong danh mục.</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {data.items.map((item) => {
            const meta = SKILL_META[item.skill];
            const Icon = meta.Icon;
            return (
              <div key={`${item.skill}-${item.exerciseId}`} className={`flex min-h-36 flex-col justify-between rounded-2xl border p-4 ${item.isCompleted ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30" : "border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40"}`}>
                <div>
                  <div className="flex items-center justify-between gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-black ${meta.tone}`}><Icon size={13} aria-hidden="true" /> {meta.label}</span>{item.isCompleted ? <CheckCircle2 size={17} className="text-emerald-600 dark:text-emerald-400" aria-label="Hoàn thành" /> : item.isLocked ? <LockKeyhole size={16} className="text-amber-600 dark:text-amber-400" aria-label="Đang khóa" /> : null}</div>
                  <h3 className="mt-3 line-clamp-2 text-sm font-black text-slate-900 dark:text-slate-100">{item.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{item.reasonLabel}</p>
                </div>
                <Link href={item.route} className="mt-3 inline-flex min-h-10 items-center justify-between gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"><span>{itemAction(item)}</span><ArrowRight size={14} aria-hidden="true" /></Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
