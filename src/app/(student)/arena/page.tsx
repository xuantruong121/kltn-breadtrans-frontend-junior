"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useArenaSocket } from "@/lib/hooks/useArenaSocket";
import ArenaMatchRoom from "@/modules/arena/ArenaMatchRoom";
import { ArenaHero } from "@/modules/arena/components/ArenaHero";
import { ArenaRecord } from "@/modules/arena/components/ArenaRecord";
import { BadgesCabinet } from "@/modules/arena/components/BadgesCabinet";
import { WeeklyLeague } from "@/modules/arena/components/WeeklyLeague";
import { arenaSound } from "@/modules/arena/sound/arenaSound";
import { useArenaMusic } from "@/modules/arena/sound/useArenaSound";
import { DEFAULT_TIER, isLeagueTier, leagueQuery, type LeagueTier } from "@/modules/arena/league";
import { userService } from "@/lib/api/services/user.service";
import { gamificationService, type LeaderboardResponse } from "@/lib/api/services/gamification.service";
import { AuthGateModal } from "@/components/auth/AuthGateModal";

export default function ArenaPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isGuest = !user || user.role !== "STUDENT";

  const [stake, setStake] = useState<number>(20);
  const [chosenTab, setChosenTab] = useState<LeagueTier | "ALL" | null>(null);
  const [authGateOpen, setAuthGateOpen] = useState(false);

  const {
    isSearching,
    matchData,
    currentRoundData,
    roundResult,
    liveProgress,
    matchResult,
    opponentDisconnected,
    joinQueue,
    cancelQueue,
    submitAnswer,
    resetMatch,
  } = useArenaSocket();

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

  const { data: stats } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: userService.getStats,
    enabled: !isGuest,
    staleTime: 60_000,
  });
  const { data: arenaStats, isLoading: arenaStatsLoading } = useQuery({
    queryKey: ["arena-stats", user?.id],
    queryFn: gamificationService.getArenaStats,
    enabled: !isGuest,
    staleTime: 60_000,
  });
  const { data: myBadges, isLoading: badgesLoading } = useQuery({
    queryKey: ["my-badges", user?.id],
    queryFn: gamificationService.getMyBadges,
    enabled: !isGuest,
    staleTime: 60_000,
  });
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: userService.getProfile,
    enabled: !isGuest,
    staleTime: 60_000,
  });
  const { data: pet } = useQuery({
    queryKey: ["myPet", user?.id],
    queryFn: gamificationService.getMyPet,
    enabled: !isGuest,
    staleTime: 60_000,
  });

  const balance = isGuest ? null : (stats?.totalBanhRan ?? null);
  const badgeFacts = {
    totalXp: league?.currentUserRank?.totalPoints ?? 0,
    streak: (profile as { stats?: { streakCount?: number } } | undefined)?.stats?.streakCount ?? 0,
    petLevel: pet?.level ?? 1,
    arenaWins: arenaStats?.wins ?? 0,
  };

  // Lobby loop while searching, the faster loop during a match.
  useArenaMusic(matchData ? "battle" : isSearching ? "lobby" : null);
  const announced = useRef<string | null>(null);
  useEffect(() => {
    if (matchData && announced.current !== matchData.matchId) {
      announced.current = matchData.matchId;
      arenaSound.play("matchFound");
    }
  }, [matchData]);

  const find = () => {
    if (isGuest) {
      setAuthGateOpen(true);
      return;
    }
    arenaSound.unlock();
    joinQueue(stake);
  };

  if (matchData) {
    return (
      <ArenaMatchRoom
        matchData={matchData}
        currentRoundData={currentRoundData}
        roundResult={roundResult}
        liveProgress={liveProgress}
        matchResult={matchResult}
        opponentDisconnected={opponentDisconnected}
        onSubmitAnswer={submitAnswer}
        onExit={resetMatch}
        onRematch={(again) => {
          resetMatch();
          setStake(again);
          arenaSound.unlock();
          joinQueue(again);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="lg:col-span-2">
          <ArenaHero
            stake={stake}
            onStake={setStake}
            balance={balance}
            isGuest={isGuest}
            isSearching={isSearching}
            onFind={find}
            onCancel={cancelQueue}
          />
        </div>
        <ArenaRecord stats={arenaStats} isGuest={isGuest} isLoading={arenaStatsLoading} />
      </div>

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
          <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Huy hiệu</h2>
            <p className="mt-2">Đăng nhập để xem huy hiệu bạn đã đạt và những huy hiệu sắp đạt.</p>
          </section>
        ) : (
          <BadgesCabinet myBadges={myBadges ?? []} facts={badgeFacts} isLoading={badgesLoading} />
        )}
      </div>

      <AuthGateModal
        isOpen={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        targetLabel="tham gia đấu trường 1v1"
        targetRoute="/arena"
        onOpenLogin={() => router.push("/login?redirect=/arena")}
        onOpenRegister={() => router.push("/register?redirect=/arena")}
      />
    </div>
  );
}
