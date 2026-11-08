"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Award, Trophy } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { gamificationService } from "@/lib/api/services/gamification.service";
import { NO_BADGE_FACTS } from "@/modules/arena/badges";
import { RankingBoard } from "@/modules/ranking/components/RankingBoard";
import { RankingSidebar } from "@/modules/ranking/components/RankingSidebar";
import type { RankingMetric, RankingPeriod } from "@/modules/ranking/rankingLogic";

/**
 * Bảng xếp hạng (owner 2026-11-08, after two leaderboard pictures he sent):
 * XP by day, week, month or all time, the current streak and referrals; a
 * podium, the table, the learner's own place with the weekly league; the hall
 * of fame, recent activity and badges on the right. Guests see the boards.
 */
export default function RankingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isGuest = !user || user.role !== "STUDENT";
  const [metric, setMetric] = useState<RankingMetric>("xp");
  const [period, setPeriod] = useState<RankingPeriod>("week");
  const boardPeriod: RankingPeriod = metric === "streak" ? "all" : period;

  const { data: board, isLoading } = useQuery({
    queryKey: ["ranking", metric, boardPeriod, user?.id],
    queryFn: () => gamificationService.getRanking(metric, boardPeriod),
    staleTime: 60_000,
  });
  const { data: hall } = useQuery({ queryKey: ["ranking-hall"], queryFn: gamificationService.getHallOfFame, staleTime: 120_000 });
  const { data: activity } = useQuery({ queryKey: ["ranking-activity"], queryFn: gamificationService.getRankingActivity, staleTime: 30_000 });
  const { data: myBadges } = useQuery({ queryKey: ["my-badges", user?.id], queryFn: gamificationService.getMyBadges, enabled: !isGuest, staleTime: 60_000 });
  const { data: badgeProgress } = useQuery({
    queryKey: ["badge-progress", user?.id],
    queryFn: gamificationService.getBadgeProgress,
    enabled: !isGuest,
    staleTime: 60_000,
  });

  const myName: string = user?.profile?.fullName || user?.email?.split("@")[0] || "Bạn";
  const myAvatar: string | null = user?.profile?.avatar ?? null;

  return (
    <div className="space-y-8 pb-12">
      <header className="relative overflow-hidden rounded-2xl border border-sky-100 bg-sky-50/70 px-6 py-8 dark:border-slate-800 dark:bg-slate-900 sm:px-10">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-900 dark:bg-slate-900 dark:text-sky-300">
          <Award size={14} strokeWidth={2.25} aria-hidden="true" />
          Vinh danh
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">Bảng xếp hạng</h1>
        <p className="mt-2 max-w-xl text-base text-slate-700 dark:text-slate-300">
          Vinh danh học viên chăm chỉ: XP từ luyện tập và Đấu trường, chuỗi ngày học liên tiếp và những người rủ bạn bè cùng học.
        </p>
        <span className="absolute right-8 top-1/2 hidden h-24 w-24 -translate-y-1/2 items-center justify-center rounded-3xl bg-sky-600 text-white shadow-lg sm:flex" aria-hidden="true">
          <Trophy size={48} strokeWidth={2} />
        </span>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <RankingBoard
          data={board}
          isLoading={isLoading}
          metric={metric}
          period={period}
          onMetric={setMetric}
          onPeriod={setPeriod}
          isGuest={isGuest}
          myName={myName}
          myAvatar={myAvatar}
          onLogin={() => router.push("/login?redirect=/ranking")}
        />
        <RankingSidebar hall={hall} activity={activity} isGuest={isGuest} myBadges={myBadges ?? []} facts={badgeProgress?.facts ?? NO_BADGE_FACTS} />
      </div>
    </div>
  );
}
