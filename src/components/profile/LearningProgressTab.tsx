"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Headphones,
  Mic,
  PenTool,
  TriangleAlert,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import {
  userService,
  type SkillProgressSummary,
} from "@/lib/api/services/user.service";
import { readingService } from "@/lib/api/services/reading.service";

const SKILL_META: Record<
  SkillProgressSummary["skill"],
  { icon: typeof Headphones; iconClass: string; iconBgClass: string; href: string; label: string }
> = {
  LISTENING: {
    icon: Headphones,
    iconClass: "text-sky-600 dark:text-sky-300",
    iconBgClass: "bg-sky-50 dark:bg-sky-950/40",
    href: "/listening",
    label: "Listening",
  },
  SPEAKING: {
    icon: Mic,
    iconClass: "text-violet-600 dark:text-violet-300",
    iconBgClass: "bg-violet-50 dark:bg-violet-950/40",
    href: "/speaking",
    label: "Speaking",
  },
  READING: {
    icon: BookOpen,
    iconClass: "text-emerald-600 dark:text-emerald-300",
    iconBgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    href: "/reading",
    label: "Reading",
  },
  WRITING: {
    icon: PenTool,
    iconClass: "text-rose-600 dark:text-rose-300",
    iconBgClass: "bg-rose-50 dark:bg-rose-950/40",
    href: "/writing",
    label: "Writing",
  },
};

function scoreLabel(skill: SkillProgressSummary) {
  if (skill.hasEnoughData === false || skill.normalizedScore == null) {
    return "Đang thu thập dữ liệu";
  }
  return `${Math.round(skill.normalizedScore)}% điểm gần đây`;
}

export function LearningProgressTab() {
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["account-learning-progress", user?.id],
    queryFn: userService.getSkillProgress,
    enabled: Boolean(user),
    staleTime: 30_000,
  });
  const { data: history } = useQuery({
    queryKey: ["account-learning-history", user?.id],
    queryFn: () => userService.getLearningHistory(),
    enabled: Boolean(user),
    staleTime: 30_000,
  });
  const { data: readingTracking } = useQuery({
    queryKey: ["account-reading-tracking", user?.id],
    queryFn: readingService.getTracking,
    enabled: Boolean(user),
    staleTime: 30_000,
  });
  const skills = useMemo(() => data?.skills ?? [], [data?.skills]);

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
        Không thể tải tiến độ học tập. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400">
          Tiến độ học tập
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Theo dõi hành trình bốn kỹ năng
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Số liệu được tổng hợp từ các bài đã hoàn thành. Khi chưa đủ mẫu, hệ thống sẽ hiển thị rõ trạng thái đang thu thập dữ liệu.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Tiến độ bốn kỹ năng">
        {skills.map((skill) => {
          const meta = SKILL_META[skill.skill];
          const Icon = meta.icon;
          const total = Math.max(
            0,
            skill.totalItems,
          );
          const completed = Math.min(
            Math.max(
              0,
              skill.completedItems,
            ),
            total || skill.completedItems,
          );
          const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
          return (
            <article key={skill.skill} className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`flex size-10 items-center justify-center rounded-xl ${meta.iconBgClass} ${meta.iconClass}`}>
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">{meta.label}</h2>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{skill.categoryLabel}</p>
                  </div>
                </div>
                <Link href={meta.href} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100">
                  Luyện <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-black text-slate-950 dark:text-white">{total > 0 ? `${completed}/${total}` : "—"}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{skill.unitLabel} hoàn thành</p>
                </div>
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{total > 0 ? `${percent}%` : "—"}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-amber-500 transition-[width]" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {scoreLabel(skill)}{skill.skill === "SPEAKING" && skill.totalExercises != null ? ` · ${skill.completedExercises ?? 0}/${skill.totalExercises} phần luyện` : ""}
              </p>
            </article>
          );
        })}
      </section>

      {readingTracking && (
        <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/30 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20" aria-labelledby="reading-progress-detail">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Reading</p>
              <h2 id="reading-progress-detail" className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">Theo dõi kỹ năng con</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Mỗi kỹ năng cần tối thiểu {readingTracking.sampleSize} lượt trước khi gắn nhãn ổn định.</p>
            </div>
            <Link href="/reading/mistakes" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-black text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              <TriangleAlert size={14} aria-hidden="true" /> Lỗi cần xem lại ({readingTracking.mistakes?.total ?? 0})
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(readingTracking.subskills ?? []).map((skill: any) => (
              <div key={skill.key} className="rounded-xl border border-emerald-200/70 bg-white/80 p-3 dark:border-emerald-900/50 dark:bg-slate-900/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">{skill.key}</span>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{skill.attempted >= (readingTracking.sampleSize ?? 3) ? `${skill.accuracy}%` : "—"}</span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{skill.statusLabel} · {skill.attempted} lượt</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900" aria-labelledby="learning-activity-heading">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <h2 id="learning-activity-heading" className="text-lg font-black text-slate-900 dark:text-slate-100">Hoạt động gần đây</h2>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{history?.activities?.length ?? 0} hoạt động</span>
        </div>
        {history?.activities?.length ? (
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {history.activities.slice(0, 8).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{activity.title}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{activity.detail || "Đã ghi nhận hoạt động học tập"}</p>
                </div>
                <time className="shrink-0 text-[11px] font-semibold text-slate-400" dateTime={activity.occurredAt}>{new Date(activity.occurredAt).toLocaleDateString("vi-VN")}</time>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-slate-200 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <Brain size={18} aria-hidden="true" /> Chưa có hoạt động gần đây. Hãy hoàn thành một bài để bắt đầu theo dõi.
          </div>
        )}
      </section>
    </div>
  );
}
