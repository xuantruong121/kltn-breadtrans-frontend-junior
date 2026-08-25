"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { userService } from "@/lib/api/services/user.service";
import Link from "next/link";

const emptySubscribe = () => () => {};

export const GamificationBar: React.FC = () => {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const { user } = useAuthStore();
  const { breads, streak, level, exp, setStats } = useGamificationStore();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: userService.getProfile,
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Đồng bộ số liệu từ backend Database vào store (Cấp độ Tài Khoản Học Viên)
  useEffect(() => {
    if (profile) {
      const stats = (profile as any).stats;
      const leaderboard = (profile as any).leaderboard;
      const totalPoints = leaderboard?.totalPoints ?? 0;
      const playerLevel = Math.floor(totalPoints / 500) + 1;
      const streakVal = stats?.streakCount ?? stats?.streak ?? 0;

      setStats({
        breads: stats?.totalBanhRan ?? 0,
        streak: streakVal,
        exp: totalPoints,
        level: playerLevel,
      });
    }
  }, [profile, setStats]);

  if (!isMounted) {
    return <div className="h-12 w-64 bg-slate-100/50 rounded-2xl animate-pulse" />;
  }

  const currentLevelExp = exp % 500;
  const progressPercent = Math.min(100, Math.round((currentLevelExp / 500) * 100));

  return (
    <div className="flex items-center gap-1.5 sm:gap-3">
      {/* Player Account Level & EXP */}
      <div 
        className="flex items-center gap-1.5 sm:gap-2 bg-purple-100/80 border-2 border-purple-300 px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl shadow-sm cursor-default"
        title={`Cấp Độ Học Viên: Cấp ${level} (${currentLevelExp}/500 XP tích lũy)`}
      >
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-purple-500 text-white flex items-center justify-center font-black text-[11px] sm:text-xs shadow-inner">
          {level}
        </div>
        <div className="hidden sm:flex flex-col">
          <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider">Cấp Độ</span>
          <div className="w-16 h-2 bg-purple-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Streak */}
      <motion.div 
        whileHover={{ scale: 1.05 }}
        className="flex items-center gap-1 sm:gap-1.5 bg-orange-100/90 border-2 border-orange-300 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl shadow-sm cursor-default"
      >
        <Flame size={18} className="text-orange-500 fill-orange-500 animate-bounce" />
        <span className="font-black text-orange-700 text-xs sm:text-sm">{streak}</span>
        <span className="hidden sm:inline text-[11px] font-bold text-orange-600">ngày</span>
      </motion.div>

      {/* Breads (Tiền tệ Bánh Mì) */}
      <Link href="/market">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 sm:gap-2 bg-amber-100/90 border-2 border-amber-300 hover:border-amber-400 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-2xl shadow-sm cursor-pointer transition-all"
        >
          <span className="text-base sm:text-lg leading-none">🍞</span>
          <span className="font-black text-amber-800 text-xs sm:text-sm">{breads}</span>
          <span className="hidden sm:inline text-[10px] font-extrabold text-amber-600 uppercase bg-amber-200/80 px-1.5 py-0.5 rounded-md">Shop</span>
        </motion.div>
      </Link>
    </div>
  );
};
