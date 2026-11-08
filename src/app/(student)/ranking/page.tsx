"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { BadgesCabinet } from "@/modules/arena/components/BadgesCabinet";
import { WeeklyLeague } from "@/modules/arena/components/WeeklyLeague";
import { DEFAULT_TIER, isLeagueTier, leagueQuery, type LeagueTier } from "@/modules/arena/league";
import { NO_BADGE_FACTS } from "@/modules/arena/badges";
import { gamificationService, type LeaderboardResponse } from "@/lib/api/services/gamification.service";

/**
 * The weekly XP league and the badges, moved from /arena (owner 2026-11-08):
 * /arena holds the games, /ranking the standings. Guests see the league.
 */
export default function RankingPage() {
  const { user } = useAuthStore();
  const isGuest = !user || user.role !== "STUDENT";
  const [chosenTab, setChosenTab] = useState<LeagueTier | "ALL" | null>(null);

  // "Tất cả" opens first; a tier tab shows that tier's promotion and demotion zones.
  const { data: snippet } = useQuery({
    queryKey: ["arena-snippet", user?.id],
    queryFn: gamificationService.getArenaSnippet,
    enabled: !isGuest,
    staleTime: 60_000,
  });
  const myTier: LeagueTier | null = isLeagueTier(snippet?.tier) ? snippet.tier : isGuest ? null : DEFAULT_TIER;
  const tab: LeagueTier | "ALL" = chosenTab ?? "ALL";

  const { data: league, isLoading: leagueLoading } = useQuery<LeaderboardResponse>({
    queryKey: ["leaderboard", tab],
    queryFn: () => {
      const { tier, scope } = leagueQuery(tab);
      return gamificationService.getLeaderboard(tier, scope);
    },
    staleTime: 60_000,
  });
  const { data: myBadges, isLoading: badgesLoading } = useQuery({
    queryKey: ["my-badges", user?.id],
    queryFn: gamificationService.getMyBadges,
    enabled: !isGuest,
    staleTime: 60_000,
  });
  const { data: badgeProgress } = useQuery({
    queryKey: ["badge-progress", user?.id],
    queryFn: gamificationService.getBadgeProgress,
    enabled: !isGuest,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6 pb-12">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Bảng xếp hạng</h1>
        <p className="mt-1 max-w-2xl text-base text-slate-700 dark:text-slate-300">
          Xếp theo XP kiếm được trong tuần từ luyện tập và Đấu trường. Huy hiệu ghi lại những cột mốc bạn đã đạt.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="lg:col-span-2">
          <WeeklyLeague
            data={league}
            isLoading={leagueLoading}
            tab={tab}
            onTab={setChosenTab}
            myTier={myTier}
            myUserId={user?.id ?? null}
          />
        </div>
        {isGuest ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Huy hiệu</h2>
            <p className="mt-2">Đăng nhập để xem huy hiệu bạn đã đạt và những huy hiệu sắp đạt.</p>
          </section>
        ) : (
          <BadgesCabinet myBadges={myBadges ?? []} facts={badgeProgress?.facts ?? NO_BADGE_FACTS} isLoading={badgesLoading} />
        )}
      </div>
    </div>
  );
}
