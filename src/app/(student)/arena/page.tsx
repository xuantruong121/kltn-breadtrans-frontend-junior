"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Trophy, 
  Star, 
  Medal, 
  Crown, 
  Swords, 
  Loader2, 
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useArenaSocket } from "@/lib/hooks/useArenaSocket";
import ArenaMatchRoom from "@/modules/arena/ArenaMatchRoom";
import { BadgesCabinet } from "@/modules/arena/components/BadgesCabinet";
import { userService } from "@/lib/api/services/user.service";
import { gamificationService, LeaderboardResponse } from "@/lib/api/services/gamification.service";
import { AuthGateModal } from "@/components/auth/AuthGateModal";

const STAKES = [20, 50, 100];

const TIERS = [
  { id: "ALL", label: "Tất cả các hạng" },
  { id: "BRONZE", label: "Đồng" },
  { id: "SILVER", label: "Bạc" },
  { id: "GOLD", label: "Vàng" },
  { id: "PLATINUM", label: "Bạch Kim" },
  { id: "DIAMOND", label: "Kim Cương" },
];

export default function ArenaPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isGuest = !user || user.role !== "STUDENT";

  const [selectedStake, setSelectedStake] = useState<number>(20);
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
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

  // 1. Leaderboard query with real backend JWT authentication
  const { data: leaderboardData, isLoading: isLoadingLeaderboard } = useQuery<LeaderboardResponse>({
    queryKey: ["leaderboard", selectedTier],
    queryFn: () =>
      gamificationService.getLeaderboard(
        selectedTier !== "ALL" ? selectedTier : undefined
      ),
    staleTime: 60_000,
  });

  // 2. User badges
  const { data: myBadges, isLoading: isLoadingBadges } = useQuery({
    queryKey: ["my-badges", user?.id],
    queryFn: gamificationService.getMyBadges,
    enabled: !isGuest,
    staleTime: 60_000,
  });

  // 3. User profile & stats
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: userService.getProfile,
    enabled: !isGuest,
    staleTime: 60_000,
  });

  // 4. Pet
  const { data: pet } = useQuery({
    queryKey: ["myPet", user?.id],
    queryFn: gamificationService.getMyPet,
    enabled: !isGuest,
    staleTime: 60_000,
  });

  const entries = leaderboardData?.entries || [];
  const currentUserRank = leaderboardData?.currentUserRank;
  const currentUserEntry = entries.find((entry) => entry.userId === user?.id);

  // Factual exp and streak (zero fake numbers)
  const userTotalExp =
    currentUserEntry?.weeklyExp ||
    currentUserEntry?.totalPoints ||
    (profile as any)?.stats?.weeklyExp ||
    0;
  const userStreak = (profile as any)?.stats?.streakCount ?? 0;
  const userPetLevel = pet?.level || 1;

  const handleStartMatch = () => {
    if (isGuest) {
      setAuthGateOpen(true);
      return;
    }
    joinQueue(selectedStake);
  };

  // If in an active match room, render battle view
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
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* 1V1 REAL-TIME MATCHMAKING BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-500/15 via-orange-50/50 to-white p-6 sm:p-8 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white/90 px-3.5 py-1 text-xs font-bold text-amber-900 shadow-2xs">
              <Swords size={14} className="text-amber-600" />
              <span>Đấu trường học tập thời gian thực</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Thách đấu từ vựng 1v1
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Thi đấu trực tiếp cùng các học viên khác. Trả lời 5 câu hỏi từ vựng nhanh nhất và chuẩn xác nhất để giành chiến thắng và nhận thưởng Bánh Mì.
            </p>
          </div>

          {/* Controls: Stake selector & Match button */}
          <div className="flex flex-col items-stretch sm:items-end gap-3.5 rounded-2xl border border-amber-200 bg-white p-4 shadow-xs shrink-0">
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full">
              <span className="text-xs font-bold text-slate-600">Mức cược:</span>
              <div className="flex gap-1.5">
                {STAKES.map((stake) => (
                  <button
                    key={stake}
                    type="button"
                    disabled={isSearching}
                    onClick={() => setSelectedStake(stake)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      selectedStake === stake
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {stake} Bánh
                  </button>
                ))}
              </div>
            </div>

            {isSearching ? (
              <div className="flex items-center gap-2.5 w-full">
                <div className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900 animate-pulse border border-amber-200">
                  <Loader2 className="animate-spin" size={15} />
                  <span>Đang tìm đối thủ ({selectedStake} Bánh)…</span>
                </div>
                <button
                  type="button"
                  onClick={cancelQueue}
                  className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                  title="Hủy tìm trận"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartMatch}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-amber-700 transition-colors cursor-pointer active:scale-98"
              >
                <Swords size={16} />
                <span>{isGuest ? "Đăng nhập để thách đấu" : "Tìm đối thủ ngay"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* HEADER TITLE & USER RANK SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <Trophy size={24} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bảng vinh danh & Thành tích</h1>
            <p className="text-xs text-slate-500 font-medium">
              Xếp hạng học viên chăm chỉ và bộ sưu tập huy hiệu tích lũy
            </p>
          </div>
        </div>

        {!isGuest && currentUserRank && typeof currentUserRank.rank === "number" && (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-2 text-xs font-bold text-amber-900 shadow-2xs">
            <span>Thứ hạng của bạn:</span>
            <span className="rounded-lg bg-amber-500 text-white px-2 py-0.5 font-extrabold">
              #{currentUserRank.rank}
            </span>
          </div>
        )}
      </div>

      {/* 2-COLUMN LAYOUT: LEADERBOARD & BADGES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEADERBOARD (LEFT 2/3) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Tier Tabs Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {TIERS.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedTier(tier.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedTier === tier.id
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Crown size={18} className="text-amber-500" />
                <span>Bảng xếp hạng tuần này</span>
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                {entries.length} học viên
              </span>
            </div>

            {isLoadingLeaderboard ? (
              <div className="space-y-3 py-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse flex items-center justify-between rounded-xl border border-slate-100 p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-100" />
                      <div className="h-10 w-10 rounded-full bg-slate-100" />
                      <div className="space-y-1">
                        <div className="h-4 w-28 bg-slate-100 rounded" />
                        <div className="h-3 w-16 bg-slate-100 rounded" />
                      </div>
                    </div>
                    <div className="h-5 w-16 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : entries.length > 0 ? (
              <div className="space-y-2.5">
                {entries.map((item, index) => {
                  const rank = item.rank || index + 1;
                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;
                  const isMe = !isGuest && (item.isCurrentUser || item.userId === user?.id);

                  let rankBorderClass = "border-slate-100 bg-white hover:bg-slate-50/80";
                  if (isTop1) {
                    rankBorderClass = "border-amber-300 bg-amber-50/40 shadow-xs";
                  } else if (isTop2) {
                    rankBorderClass = "border-slate-300 bg-slate-50/70";
                  } else if (isTop3) {
                    rankBorderClass = "border-orange-200 bg-orange-50/30";
                  }

                  if (isMe) {
                    rankBorderClass += " ring-2 ring-amber-500/80";
                  }

                  return (
                    <motion.div
                      key={item.userId}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${rankBorderClass}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Rank Badge */}
                        <div className="w-7 text-center font-black text-sm shrink-0">
                          {isTop1 ? (
                            <Medal size={22} className="text-amber-500 mx-auto" />
                          ) : isTop2 ? (
                            <Medal size={20} className="text-slate-400 mx-auto" />
                          ) : isTop3 ? (
                            <Medal size={20} className="text-orange-500 mx-auto" />
                          ) : (
                            <span className="text-slate-400">#{rank}</span>
                          )}
                        </div>

                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm overflow-hidden shrink-0">
                          {item.avatarUrl ? (
                            <img src={item.avatarUrl} alt={item.displayName} className="w-full h-full object-cover" />
                          ) : (
                            item.displayName?.[0]?.toUpperCase() || "H"
                          )}
                        </div>

                        {/* Name & Tier */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm text-slate-900 truncate">
                              {item.displayName || "Học viên"}
                            </h3>
                            {isMe && (
                              <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded shrink-0">
                                BẠN
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium">
                            Hạng: {item.tier || "Đồng"}
                          </p>
                        </div>
                      </div>

                      {/* Points */}
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 font-extrabold text-sm text-amber-700">
                          <span>{(item.weeklyExp || item.totalPoints || 0).toLocaleString("vi-VN")}</span>
                          <Star size={14} className="fill-amber-500 text-amber-500" />
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
                          EXP
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 space-y-2">
                <Trophy size={32} className="mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-600">Chưa có dữ liệu cho hạng này</p>
                <p className="text-xs text-slate-400">Hãy tham gia luyện tập để ghi tên mình lên bảng vàng nhé!</p>
              </div>
            )}
          </div>
        </div>

        {/* BADGES CABINET (RIGHT 1/3) */}
        <div className="space-y-6">
          <BadgesCabinet
            myBadges={myBadges || []}
            isLoading={isLoadingBadges}
            totalExp={userTotalExp}
            streakCount={userStreak}
            petLevel={userPetLevel}
          />
        </div>
      </div>

      {/* Guest AuthGateModal */}
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
