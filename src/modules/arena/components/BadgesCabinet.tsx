"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Shield, 
  Flame, 
  Crown, 
  Star, 
  Swords, 
  Mic, 
  Heart, 
  CheckCircle2, 
  Lock, 
  BadgeCheck,
  Zap
} from "lucide-react";
import { BadgeDetailModal, BadgeItem } from "./BadgeDetailModal";

interface BadgesCabinetProps {
  myBadges: any[];
  isLoading?: boolean;
  totalExp?: number;
  streakCount?: number;
  petLevel?: number;
}

export const BadgesCabinet: React.FC<BadgesCabinetProps> = ({
  myBadges = [],
  totalExp = 0,
  streakCount = 0,
  petLevel = 0,
}) => {
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "unlocked" | "locked">("all");

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
      shadowColor: "shadow-xs",
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
      shadowColor: "shadow-xs",
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
      shadowColor: "shadow-xs",
      accentGlow: "bg-yellow-400",
      currentValue: 0,
      targetValue: 1,
      unit: "Top 1",
      rewardBreads: 100,
      rewardExp: 300,
    },
    {
      id: 4,
      name: "Thợ Săn",
      category: "Kinh Nghiệm",
      description: "Đạt 1000 điểm kinh nghiệm (XP)",
      icon: Zap,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      borderColor: "border-purple-400",
      shadowColor: "shadow-xs",
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
      shadowColor: "shadow-xs",
      accentGlow: "bg-sky-400",
      currentValue: 0,
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
      shadowColor: "shadow-xs",
      accentGlow: "bg-rose-400",
      currentValue: 0,
      targetValue: 3,
      unit: "trận thắng",
      rewardBreads: 60,
      rewardExp: 200,
    },
    {
      id: 7,
      name: "Giọng Đọc Vàng",
      category: "Luyện phát âm",
      description: "Đạt điểm phát âm 90+ trong 5 câu luyện phát âm",
      icon: Mic,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      borderColor: "border-emerald-400",
      shadowColor: "shadow-xs",
      accentGlow: "bg-emerald-400",
      currentValue: 0,
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
      shadowColor: "shadow-xs",
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
    return myBadges?.some((b: any) => b.badge?.name === badge.name);
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs relative overflow-hidden">
        {/* Header Title */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 flex items-center justify-center border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
              <ShieldCheck size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Tủ Huy Hiệu Của Tôi
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Bảng vàng vinh danh & thành tích học tập
              </p>
            </div>
          </div>
        </div>

        {/* Overall Completion Progress Banner */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60 p-3.5 mb-4">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            <span className="flex items-center gap-1.5">
              <BadgeCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
              <span>Đã mở khóa: <strong className="text-slate-900 dark:text-slate-100 font-bold">{unlockedBadgesCount}/{ALL_BADGES.length}</strong> huy hiệu</span>
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {progressTotalPercent}%
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressTotalPercent}%` }}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-4 text-xs font-semibold">
          <button
            onClick={() => setFilterTab("all")}
            className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer text-center text-xs font-semibold ${
              filterTab === "all"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Tất cả ({ALL_BADGES.length})
          </button>
          <button
            onClick={() => setFilterTab("unlocked")}
            className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer text-center text-xs font-semibold ${
              filterTab === "unlocked"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Đã đạt ({unlockedBadgesCount})
          </button>
          <button
            onClick={() => setFilterTab("locked")}
            className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer text-center text-xs font-semibold ${
              filterTab === "locked"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Đang khóa ({ALL_BADGES.length - unlockedBadgesCount})
          </button>
        </div>

        {/* 2-Column Balanced Badges Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredBadges.map((badge) => {
            const hasUnlocked = isBadgeUnlocked(badge);
            const Icon = badge.icon;
            const progress = Math.min(
              Math.round(((badge.currentValue || 0) / badge.targetValue) * 100),
              100
            );

            return (
              <motion.div
                key={badge.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedBadge(badge)}
                className={`relative flex flex-col justify-between p-3.5 rounded-xl border transition-all cursor-pointer text-center select-none ${
                  hasUnlocked
                    ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                    : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-80 hover:opacity-100"
                }`}
              >
                <div>
                  {/* Badge Icon */}
                  <div className="relative mx-auto mb-2.5 flex justify-center">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                        hasUnlocked
                          ? `${badge.bgColor} ${badge.color} border border-slate-200/80 dark:border-slate-700/80 dark:bg-opacity-20`
                          : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200 dark:border-slate-700 grayscale"
                      }`}
                    >
                      <Icon size={22} strokeWidth={1.8} />
                    </div>

                    {/* Mini lock indicator */}
                    {!hasUnlocked && (
                      <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center text-[9px] border border-white dark:border-slate-900">
                        <Lock size={9} />
                      </div>
                    )}
                  </div>

                  {/* Badge Name */}
                  <h4
                    className={`font-semibold text-xs leading-tight mb-1 truncate ${
                      hasUnlocked ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400"
                    }`}
                    title={badge.name}
                  >
                    {badge.name}
                  </h4>

                  {/* Description */}
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2.5">
                    {badge.description}
                  </p>
                </div>

                {/* Bottom Progress Bar / Status Pill */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  {hasUnlocked ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/60">
                      <CheckCircle2 size={11} /> Đã Mở Khóa
                    </span>
                  ) : (
                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        <span>{badge.currentValue || 0}/{badge.targetValue} {badge.unit}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full"
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
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Nhấp vào huy hiệu để xem chi tiết và kích hoạt lên hồ sơ học tập.
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
