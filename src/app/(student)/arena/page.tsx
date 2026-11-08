"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useCompanionPetStore } from "@/stores/companionPetStore";
import { useArenaSocket } from "@/lib/hooks/useArenaSocket";
import ArenaMatchRoom from "@/modules/arena/ArenaMatchRoom";
import { ArenaHero } from "@/modules/arena/components/ArenaHero";
import { ArenaRecord } from "@/modules/arena/components/ArenaRecord";
import { BadgesCabinet } from "@/modules/arena/components/BadgesCabinet";
import { WeeklyLeague } from "@/modules/arena/components/WeeklyLeague";
import { arenaSound } from "@/modules/arena/sound/arenaSound";
import { useArenaMusic } from "@/modules/arena/sound/useArenaSound";
import { DEFAULT_TIER, isLeagueTier, leagueQuery, type LeagueTier } from "@/modules/arena/league";
import { NO_BADGE_FACTS } from "@/modules/arena/badges";
import { userService } from "@/lib/api/services/user.service";
import { gamificationService, type LeaderboardResponse } from "@/lib/api/services/gamification.service";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { RotateCcw, X } from "lucide-react";

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
    abortedNotice,
    dismissAbortedNotice,
    joinQueue,
    cancelQueue,
    submitAnswer,
    leaveMatch,
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
  const { data: badgeProgress } = useQuery({
    queryKey: ["badge-progress", user?.id],
    queryFn: gamificationService.getBadgeProgress,
    enabled: !isGuest,
    staleTime: 60_000,
  });

  const balance = isGuest ? null : (stats?.totalBanhRan ?? null);
  const badgeFacts = badgeProgress?.facts ?? NO_BADGE_FACTS;

  // Lobby loop on the arena page, the faster loop during a match. Browsers only
  // allow sound after a user gesture, so the first click or key anywhere on the
  // page starts it.
  useArenaMusic(matchData ? "battle" : "lobby");
  useEffect(() => {
    const start = () => arenaSound.unlock();
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, []);
  // The floating pet and its bubbles stay away while two learners play.
  const setPetSuppressed = useCompanionPetStore((s) => s.setSuppressed);
  useEffect(() => {
    setPetSuppressed(Boolean(matchData));
    return () => setPetSuppressed(false);
  }, [matchData, setPetSuppressed]);
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
        onLeave={leaveMatch}
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
    <div className="space-y-6 pb-12">
      {abortedNotice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          <p className="flex-1">
            {abortedNotice.reason === "server_restart"
              ? "Trận vừa rồi bị huỷ vì máy chủ khởi động lại."
              : "Trận vừa rồi bị huỷ vì không thể kết thúc."}{" "}
            Đã hoàn {abortedNotice.refunded.toLocaleString("vi-VN")} Bánh Mì cho cả hai người chơi.
          </p>
          <button
            type="button"
            onClick={dismissAbortedNotice}
            className="-m-1 rounded-md p-1 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-amber-500 dark:hover:bg-amber-900/40"
            aria-label="Đóng thông báo"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
      )}
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
