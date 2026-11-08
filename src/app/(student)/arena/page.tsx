"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useCompanionPetStore } from "@/stores/companionPetStore";
import { useArenaSocket } from "@/lib/hooks/useArenaSocket";
import ArenaMatchRoom from "@/modules/arena/ArenaMatchRoom";
import { ArenaHero } from "@/modules/arena/components/ArenaHero";
import { ArenaRecord } from "@/modules/arena/components/ArenaRecord";
import { arenaSound } from "@/modules/arena/sound/arenaSound";
import { useArenaMusic } from "@/modules/arena/sound/useArenaSound";
import { ArenaGameNav } from "@/modules/arena/components/ArenaGameNav";
import { arenaGameFrom, type ArenaGame } from "@/modules/arena/games";
import { BlasterLobby } from "@/modules/word-blaster/components/BlasterLobby";
import { userService } from "@/lib/api/services/user.service";
import { gamificationService } from "@/lib/api/services/gamification.service";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { RotateCcw, X } from "lucide-react";

// useSearchParams needs a Suspense boundary for the static build.
export default function ArenaPage() {
  return (
    <Suspense fallback={null}>
      <ArenaLobby />
    </Suspense>
  );
}

function ArenaLobby() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const game = arenaGameFrom(searchParams.get("game"));
  const pick = (next: ArenaGame) => router.replace(next === "duel" ? pathname : `${pathname}?game=${next}`, { scroll: false });
  const { user } = useAuthStore();
  const isGuest = !user || user.role !== "STUDENT";

  const [stake, setStake] = useState<number>(20);
  const [authGateOpen, setAuthGateOpen] = useState<null | "duel" | "blaster">(null);

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

  // The weekly league and the badges live on /ranking (owner 2026-11-08).
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
  const balance = isGuest ? null : (stats?.totalBanhRan ?? null);

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
      setAuthGateOpen("duel");
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
    <div className="grid items-start gap-6 pb-12 lg:grid-cols-[260px_1fr] [&>*]:min-w-0">
      <ArenaGameNav game={game} onPick={pick} />
      <div className="space-y-6">
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
      {game === "duel" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px] [&>*]:min-w-0">
          <ArenaHero
            stake={stake}
            onStake={setStake}
            balance={balance}
            isGuest={isGuest}
            isSearching={isSearching}
            onFind={find}
            onCancel={cancelQueue}
          />
          <ArenaRecord stats={arenaStats} isGuest={isGuest} isLoading={arenaStatsLoading} />
        </div>
      ) : (
        <BlasterLobby balance={balance} isGuest={isGuest} onGuest={() => setAuthGateOpen("blaster")} />
      )}

      <AuthGateModal
        isOpen={authGateOpen !== null}
        onClose={() => setAuthGateOpen(null)}
        targetLabel={authGateOpen === "blaster" ? "chơi Pháo Bánh Mì" : "tham gia Song Đấu Từ Vựng"}
        targetRoute={authGateOpen === "blaster" ? "/arena?game=blaster" : "/arena"}
        onOpenLogin={() => router.push(`/login?redirect=${encodeURIComponent(authGateOpen === "blaster" ? "/arena?game=blaster" : "/arena")}`)}
        onOpenRegister={() => router.push(`/register?redirect=${encodeURIComponent(authGateOpen === "blaster" ? "/arena?game=blaster" : "/arena")}`)}
      />
      </div>
    </div>
  );
}
