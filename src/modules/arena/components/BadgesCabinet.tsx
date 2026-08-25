"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Award, 
  Shield, 
  Flame, 
  Crown, 
  Star, 
  Swords, 
  Mic, 
  Heart, 
  CheckCircle2, 
  Lock, 
  Sparkles,
  Zap
} from "lucide-react";
import { BadgeDetailModal, BadgeItem } from "./BadgeDetailModal";
import { useGamificationStore } from "@/stores/gamificationStore";

interface BadgesCabinetProps {
  myBadges: any[];
  isLoading?: boolean;
  totalExp?: number;
  streakCount?: number;
  petLevel?: number;
}

export const BadgesCabinet: React.FC<BadgesCabinetProps> = ({
  myBadges = [],
  isLoading = false,
  totalExp = 487,
  streakCount = 1,
  petLevel = 1,
}) => {
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "unlocked" | "locked">("all");
  const { equippedBadge } = useGamificationStore();

  // 8 Standardized Gamified Badges
  const ALL_BADGES: BadgeItem[] = [
    {
      id: 1,
      name: "Tân Binh",
      category: "Kinh Nghiệm",
      description: "Đạt 100 điểm kinh nghiệm tích lũy đầu tiên",
      icon: Shield,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      borderColor: "border-amber-400",
      shadowColor: "shadow-[0_6px_0_0_#f59e0b]",
      accentGlow: "bg-amber-400",
      currentValue: Math.min(totalExp, 100),
      targetValue: 100,
      unit: "EXP",
      rewardBreads: 20,
      rewardExp: 50,
    },
    {
      id: 2,
      name: "Chăm Chỉ",
      category: "Kiên Trì",
      description: "Duy trì chuỗi ngày học liên tục không gián đoạn",
      icon: Flame,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      borderColor: "border-orange-400",
      shadowColor: "shadow-[0_6px_0_0_#ea580c]",
      accentGlow: "bg-orange-400",
      currentValue: Math.min(streakCount, 3),
      targetValue: 3,
      unit: "ngày",
      rewardBreads: 30,
      rewardExp: 100,
    },
    {
      id: 3,
      name: "Siêu Sao",
      category: "Bảng Xếp Hạng",
      description: "Đạt Top 1 trên Bảng Vàng vinh danh toàn trường tuần này",
      icon: Crown,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      borderColor: "border-yellow-400",
      shadowColor: "shadow-[0_6px_0_0_#eab308]",
      accentGlow: "bg-yellow-400",
      currentValue: 1,
      targetValue: 1,
      unit: "Top 1",
      rewardBreads: 100,
      rewardExp: 300,
    },
    {
      id: 4,
      name: "Thợ Săn",
      category: "Kinh Nghiệm",
      description: "Thu thập đủ 1000 điểm kinh nghiệm học tập toàn diện",
      icon: Zap,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      borderColor: "border-purple-400",
      shadowColor: "shadow-[0_6px_0_0_#9333ea]",
      accentGlow: "bg-purple-400",
      currentValue: totalExp,
      targetValue: 1000,
      unit: "EXP",
      rewardBreads: 80,
      rewardExp: 250,
    },
    {
      id: 5,
      name: "Học Bá",
      category: "Kiểm Tra",
      description: "Đạt điểm 10 tối đa trong 3 bài kiểm tra trắc nghiệm",
      icon: Star,
      color: "text-sky-600",
      bgColor: "bg-sky-100",
      borderColor: "border-sky-400",
      shadowColor: "shadow-[0_6px_0_0_#0284c7]",
      accentGlow: "bg-sky-400",
      currentValue: 1,
      targetValue: 3,
      unit: "bài 10đ",
      rewardBreads: 50,
      rewardExp: 150,
    },
    {
      id: 6,
      name: "Đấu Sĩ Bất Bại",
      category: "Đấu Trường",
      description: "Giành chiến thắng 3 trận so tài 1v1 trong Đấu Trường",
      icon: Swords,
      color: "text-rose-600",
      bgColor: "bg-rose-100",
      borderColor: "border-rose-400",
      shadowColor: "shadow-[0_6px_0_0_#e11d48]",
      accentGlow: "bg-rose-400",
      currentValue: 1,
      targetValue: 3,
      unit: "trận thắng",
      rewardBreads: 60,
      rewardExp: 200,
    },
    {
      id: 7,
      name: "Giọng Đọc Vàng",
      category: "Luyện Nói AI",
      description: "Đạt điểm phát âm 90+ trong 5 câu luyện nói AI",
      icon: Mic,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      borderColor: "border-emerald-400",
      shadowColor: "shadow-[0_6px_0_0_#059669]",
      accentGlow: "bg-emerald-400",
      currentValue: 2,
      targetValue: 5,
      unit: "câu 90+",
      rewardBreads: 50,
      rewardExp: 150,
    },
    {
      id: 8,
      name: "Chuyên Gia Nuôi Thú",
      category: "Thú Cưng",
      description: "Chăm sóc và nuôi Thú Cưng đồng hành đạt Cấp độ 2 trở lên",
      icon: Heart,
      color: "text-pink-600",
      bgColor: "bg-pink-100",
      borderColor: "border-pink-400",
      shadowColor: "shadow-[0_6px_0_0_#db2777]",
      accentGlow: "bg-pink-400",
      currentValue: petLevel,
      targetValue: 2,
      unit: "Level",
      rewardBreads: 40,
      rewardExp: 100,
    },
  ];

  // Helper check if badge is unlocked
  const isBadgeUnlocked = (badge: BadgeItem) => {
    return myBadges?.some(
      (b: any) =>
        b.badge?.name === badge.name ||
        (badge.id === 1 && totalExp >= 100) ||
        (badge.id === 2 && streakCount >= 1) ||
        (badge.id === 3 && totalExp >= 100) ||
        (badge.id === 4 && totalExp >= 1000) ||
        (badge.id === 8 && petLevel >= 2)
    );
  };

  const unlockedBadgesCount = ALL_BADGES.filter(isBadgeUnlocked).length;
  const progressTotalPercent = Math.round((unlockedBadgesCount / ALL_BADGES.length) * 100);

  // Filtered badges
  const filteredBadges = ALL_BADGES.filter((badge) => {
    const unlocked = isBadgeUnlocked(badge);
    if (filterTab === "unlocked") return unlocked;
    if (filterTab === "locked") return !unlocked;
    return true;
  });

  return (
    <>
      <div className="bg-white rounded-[2.5rem] border-4 border-slate-200 p-6 md:p-7 shadow-[0_10px_0_0_#e2e8f0] relative overflow-hidden">
        {/* Header Title */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center border-2 border-amber-300 shadow-xs">
              <Award size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 leading-tight">
                Tủ Huy Hiệu Của Tôi
              </h2>
              <p className="text-[11px] font-bold text-slate-400">
                Bảng vàng vinh danh & thành tích học tập
              </p>
            </div>
          </div>
        </div>

        {/* Overall Completion Progress Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-3.5 text-white shadow-xs mb-4">
          <div className="flex justify-between items-center text-xs font-black mb-1.5">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} /> Đã Mở Khóa: {unlockedBadgesCount}/{ALL_BADGES.length} Huy Hiệu
            </span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
              {progressTotalPercent}%
            </span>
          </div>
          <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-amber-200 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressTotalPercent}%` }}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-extrabold">
          <button
            onClick={() => setFilterTab("all")}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
              filterTab === "all"
                ? "bg-white text-slate-800 shadow-xs font-black"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Tất cả ({ALL_BADGES.length})
          </button>
          <button
            onClick={() => setFilterTab("unlocked")}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
              filterTab === "unlocked"
                ? "bg-white text-amber-600 shadow-xs font-black"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Đã đạt ({unlockedBadgesCount})
          </button>
          <button
            onClick={() => setFilterTab("locked")}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
              filterTab === "locked"
                ? "bg-white text-purple-600 shadow-xs font-black"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Đang khóa ({ALL_BADGES.length - unlockedBadgesCount})
          </button>
        </div>

        {/* 2-Column Balanced Badges Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredBadges.map((badge) => {
            const hasUnlocked = isBadgeUnlocked(badge);
            const isEquipped =
              equippedBadge === `badge_${badge.id}` || equippedBadge === badge.name;
            const Icon = badge.icon;
            const progress = Math.min(
              Math.round(((badge.currentValue || 0) / badge.targetValue) * 100),
              100
            );

            return (
              <motion.div
                key={badge.id}
                whileHover={{ scale: 1.03, y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedBadge(badge)}
                className={`relative flex flex-col justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-center select-none group ${
                  hasUnlocked
                    ? `bg-white ${badge.borderColor} ${badge.shadowColor}`
                    : "bg-slate-50/80 border-slate-200 opacity-75 hover:opacity-100"
                }`}
              >
                {/* Equipped Ribbon or Status Tag */}
                {hasUnlocked && isEquipped && (
                  <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                    <Sparkles size={10} /> Đang đeo
                  </span>
                )}

                <div>
                  {/* Badge Medal Orb */}
                  <div className="relative mx-auto mb-2 flex justify-center">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-6 ${
                        hasUnlocked
                          ? `${badge.bgColor} ${badge.color} border-2 ${badge.borderColor} shadow-xs`
                          : "bg-slate-200 text-slate-400 border border-slate-300 grayscale"
                      }`}
                    >
                      <Icon size={24} />
                    </div>

                    {/* Mini lock indicator */}
                    {!hasUnlocked && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] border border-white">
                        <Lock size={10} />
                      </div>
                    )}
                  </div>

                  {/* Badge Name */}
                  <h4
                    className={`font-black text-xs leading-tight mb-1 truncate ${
                      hasUnlocked ? "text-slate-800" : "text-slate-600"
                    }`}
                    title={badge.name}
                  >
                    {badge.name}
                  </h4>

                  {/* Description */}
                  <p className="text-[10px] font-medium text-slate-400 line-clamp-2 leading-snug mb-2">
                    {badge.description}
                  </p>
                </div>

                {/* Bottom Progress Bar / Status Pill */}
                <div className="pt-2 border-t border-slate-100">
                  {hasUnlocked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CheckCircle2 size={11} /> Đã Mở Khóa
                    </span>
                  ) : (
                    <div>
                      <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-0.5">
                        <span>{badge.currentValue || 0}/{badge.targetValue}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-4 pt-3 border-t-2 border-slate-100 text-center">
          <p className="text-[11px] font-bold text-slate-400">
            👉 Nhấp vào huy hiệu để soi chi tiết 3D & đeo lên Avatar!
          </p>
        </div>
      </div>

      {/* Badge Inspection Modal */}
      {selectedBadge && (
        <BadgeDetailModal
          badge={selectedBadge}
          hasUnlocked={isBadgeUnlocked(selectedBadge)}
          unlockedAt={
            myBadges?.find((b: any) => b.badge?.name === selectedBadge.name)?.earnedAt ||
            "2026-08-25"
          }
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </>
  );
};
