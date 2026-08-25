"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Trophy, 
  Star, 
  Medal, 
  Award, 
  Flame, 
  Zap, 
  Shield, 
  Crown, 
  Swords, 
  Loader2, 
  X,
  Sparkles
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import { Button3D } from "@/components/ui";
import { useArenaSocket } from "@/lib/hooks/useArenaSocket";
import ArenaMatchRoom from "@/modules/arena/ArenaMatchRoom";
import { BadgesCabinet } from "@/modules/arena/components/BadgesCabinet";
import { userService } from "@/lib/api/services/user.service";
import { gamificationService } from "@/lib/api/services/gamification.service";

const STAKES = [20, 50, 100];

export default function ArenaPage() {
  const { user } = useAuthStore();
  const [selectedStake, setSelectedStake] = useState<number>(20);

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

  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await axiosClient.get("/gamification/leaderboard");
      return Array.isArray(res) ? res : [];
    },
  });

  const { data: myBadges, isLoading: isLoadingBadges } = useQuery({
    queryKey: ["my-badges", user?.id],
    queryFn: async () => {
      const res = await axiosClient.get("/gamification/badges/me");
      return Array.isArray(res) ? res : [];
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: userService.getProfile,
    enabled: !!user?.id,
  });

  const { data: pet } = useQuery({
    queryKey: ["myPet", user?.id],
    queryFn: gamificationService.getMyPet,
    enabled: !!user?.id,
  });

  const currentUserLeaderboard = leaderboard?.find((entry: any) => entry.userId === user?.id);
  const userTotalExp = currentUserLeaderboard?.totalPoints || 487;
  const userStreak = (profile as any)?.stats?.streakCount ?? 1;
  const userPetLevel = pet?.level || 1;

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
      <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-[2.5rem] border-4 border-amber-600 shadow-[0_10px_0_0_#b45309] p-8 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 text-9xl pointer-events-none select-none">
          ⚔️
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xs px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-wider">
              <Swords size={14} /> Đấu Trường Thời Gian Thực (WebSocket)
            </div>
            <h2 className="text-3xl md:text-4xl font-black leading-tight">
              Thách Đấu Từ Vựng 1v1
            </h2>
            <p className="font-bold text-amber-100 text-sm max-w-lg">
              Thi đấu trực tiếp cùng bạn bè! Trả lời 5 câu hỏi nhanh nhất và chuẩn xác nhất để giành trọn số Bánh Mì cược.
            </p>
          </div>

          {/* Controls: Stake selector & Match button */}
          <div className="bg-white/15 backdrop-blur-md p-5 rounded-3xl border-2 border-white/30 flex flex-col items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-100 uppercase">Mức cược:</span>
              <div className="flex gap-2">
                {STAKES.map((stake) => (
                  <button
                    key={stake}
                    disabled={isSearching}
                    onClick={() => setSelectedStake(stake)}
                    className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                      selectedStake === stake
                        ? "bg-white text-orange-600 shadow-md scale-105"
                        : "bg-white/20 text-white hover:bg-white/30"
                    }`}
                  >
                    {stake} 🍞
                  </button>
                ))}
              </div>
            </div>

            {isSearching ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/90 text-orange-600 font-extrabold px-5 py-3 rounded-2xl animate-pulse text-sm shadow-md">
                  <Loader2 className="animate-spin" size={18} /> Đang tìm đối thủ ({selectedStake} 🍞)...
                </div>
                <button
                  onClick={cancelQueue}
                  className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl transition-colors shadow-md"
                  title="Hủy tìm trận"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <Button3D
                variant="white"
                size="lg"
                className="w-full text-orange-600"
                onClick={() => joinQueue(selectedStake)}
              >
                <Swords size={20} className="text-orange-600" /> Tìm Đối Thủ Ngay
              </Button3D>
            )}
          </div>
        </div>
      </div>

      {/* HEADER TITLE */}
      <div className="flex items-center gap-3">
        <div className="bg-yellow-400 p-3 rounded-2xl text-white shadow-sm border-2 border-yellow-500">
          <Trophy size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800">Bảng Vàng & Huy Hiệu</h1>
          <p className="text-slate-400 font-bold text-sm">
            Bảng xếp hạng toàn trường & Tủ trưng bày huy hiệu học tập
          </p>
        </div>
      </div>

      {/* 2-COLUMN LAYOUT: LEADERBOARD & BADGES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEADERBOARD (LEFT 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border-4 border-slate-200 p-6 md:p-8 shadow-[0_8px_0_0_#e2e8f0]">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <Crown className="text-yellow-500" /> Bảng Xếp Hạng Tuần Này
            </h2>

            {isLoadingLeaderboard ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-amber-500" size={40} />
              </div>
            ) : leaderboard && leaderboard.length > 0 ? (
              <div className="space-y-3.5">
                {leaderboard.map((item: any, index: number) => {
                  const isTop1 = index === 0;
                  const isTop2 = index === 1;
                  const isTop3 = index === 2;
                  const isMe = item.userId === user?.id;

                  let rankStyle = "bg-white border-2 border-slate-100";
                  let textStyle = "text-slate-700";
                  let icon = null;

                  if (isTop1) {
                    rankStyle = "bg-gradient-to-r from-yellow-100 to-amber-50 border-2 border-yellow-300 transform scale-[1.01] shadow-md shadow-yellow-100";
                    textStyle = "text-yellow-800";
                    icon = <Medal size={28} className="text-yellow-500 drop-shadow-xs" />;
                  } else if (isTop2) {
                    rankStyle = "bg-slate-50 border-2 border-slate-300";
                    textStyle = "text-slate-700";
                    icon = <Medal size={24} className="text-slate-400 drop-shadow-xs" />;
                  } else if (isTop3) {
                    rankStyle = "bg-orange-50 border-2 border-orange-200";
                    textStyle = "text-orange-800";
                    icon = <Medal size={24} className="text-orange-500 drop-shadow-xs" />;
                  }

                  if (isMe) {
                    rankStyle += " ring-4 ring-sky-400/40";
                  }

                  return (
                    <motion.div
                      key={item.userId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center justify-between p-4 rounded-2xl transition-all ${rankStyle}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`font-black text-2xl w-8 text-center ${isTop1 || isTop2 || isTop3 ? "" : "text-slate-400"}`}>
                          {isTop1 || isTop2 || isTop3 ? icon : `#${index + 1}`}
                        </div>
                        <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-xl font-bold shadow-xs">
                          {item.user?.profile?.fullName?.[0] || "👤"}
                        </div>
                        <div>
                          <h3 className={`font-extrabold text-base ${textStyle}`}>
                            {item.user?.profile?.fullName || item.user?.email || "Học viên"}
                            {isMe && <span className="ml-2 text-xs bg-sky-500 text-white font-black px-2 py-0.5 rounded-md">BẠN</span>}
                          </h3>
                          <p className="text-xs font-bold text-slate-400">Hạng: {item.tier || "Đồng"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 font-black text-xl text-amber-500">
                          {item.weeklyExp || item.totalPoints || 0} <Star size={18} className="fill-amber-500" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">EXP TUẦN</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 font-bold">
                Chưa có dữ liệu bảng xếp hạng tuần này. Hãy là người đầu tiên ghi điểm!
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
    </div>
  );
}
