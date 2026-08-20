"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Star, Sparkles, Award } from "lucide-react";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQuery } from "@tanstack/react-query";
import { userService } from "@/lib/api/services/user.service";
import Link from "next/link";

export const GamificationBar: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const { breads, streak, level, exp, setStats } = useGamificationStore();

  const { data: profile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: userService.getProfile,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Đồng bộ số liệu từ backend Database vào store
  useEffect(() => {
    if (profile?.stats) {
      setStats({
        breads: profile.stats.totalBanhRan ?? 0,
        streak: profile.stats.streak ?? 1,
        exp: profile.stats.exp ?? 0,
        level: profile.stats.level ?? 1,
      });
    }
  }, [profile, setStats]);

  if (!mounted) {
    return <div className="h-12 w-64 bg-slate-100/50 rounded-2xl animate-pulse" />;
  }

  const currentLevelExp = exp % 200;
  const progressPercent = Math.min(100, Math.round((currentLevelExp / 200) * 100));

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Level & EXP */}
      <div className="flex items-center gap-2 bg-purple-100/80 border-2 border-purple-300 px-3 py-1.5 rounded-2xl shadow-sm">
        <div className="w-7 h-7 rounded-xl bg-purple-500 text-white flex items-center justify-center font-black text-xs shadow-inner">
          {level}
        </div>
        <div className="flex flex-col">
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
        className="flex items-center gap-1.5 bg-orange-100/90 border-2 border-orange-300 px-3 py-1.5 rounded-2xl shadow-sm cursor-default"
      >
        <Flame size={20} className="text-orange-500 fill-orange-500 animate-bounce" />
        <span className="font-black text-orange-700 text-sm">{streak}</span>
        <span className="text-[11px] font-bold text-orange-600">ngày</span>
      </motion.div>

      {/* Breads (Tiền tệ Bánh Mì) */}
      <Link href="/market">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-amber-100/90 border-2 border-amber-300 hover:border-amber-400 px-3.5 py-1.5 rounded-2xl shadow-sm cursor-pointer transition-all"
        >
          <span className="text-lg leading-none">🍞</span>
          <span className="font-black text-amber-800 text-sm">{breads}</span>
          <span className="text-[10px] font-extrabold text-amber-600 uppercase bg-amber-200/80 px-1.5 py-0.5 rounded-md">Shop</span>
        </motion.div>
      </Link>
    </div>
  );
};
