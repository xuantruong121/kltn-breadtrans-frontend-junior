"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Lock, BadgeCheck, Calendar } from "lucide-react";
import { useGamificationStore } from "@/stores/gamificationStore";
import toast from "react-hot-toast";

export interface BadgeItem {
  id: number;
  name: string;
  category: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  shadowColor: string;
  accentGlow: string;
  currentValue?: number;
  targetValue: number;
  unit: string;
  rewardBreads: number;
  rewardExp: number;
}

interface BadgeDetailModalProps {
  badge: BadgeItem | null;
  hasUnlocked: boolean;
  unlockedAt?: string | null;
  onClose: () => void;
}

export const BadgeDetailModal: React.FC<BadgeDetailModalProps> = ({
  badge,
  hasUnlocked,
  unlockedAt,
  onClose,
}) => {
  const { equippedBadge, equipBadge } = useGamificationStore();

  if (!badge) return null;

  const Icon = badge.icon;
  const isEquipped = equippedBadge === `badge_${badge.id}` || equippedBadge === badge.name;
  const progressPercent = Math.min(
    Math.round(((badge.currentValue || 0) / badge.targetValue) * 100),
    100
  );

  const handleToggleEquip = () => {
    if (isEquipped) {
      equipBadge(null);
      toast.success(`Đã tháo huy hiệu ${badge.name}`);
    } else {
      equipBadge(`badge_${badge.id}`);
      toast.success(`Đã đeo huy hiệu "${badge.name}" lên Avatar!`);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full max-h-[min(90dvh,calc(100dvh-3rem))] overflow-y-auto p-6 sm:p-8 text-center relative"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer z-10"
          >
            <X size={16} />
          </button>

          {/* Badge Icon Display */}
          <div className="relative my-4 flex justify-center">
            <div
              className={`w-24 h-24 rounded-2xl border-2 flex items-center justify-center relative shadow-xs ${
                hasUnlocked
                  ? `${badge.bgColor} ${badge.borderColor} ${badge.color} dark:bg-opacity-20`
                  : "bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700 text-slate-400 dark:text-slate-500 grayscale"
              }`}
            >
              <Icon size={44} strokeWidth={1.75} />

              {/* Status Badge */}
              <div className="absolute -bottom-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-xs flex items-center gap-1 bg-slate-800 dark:bg-slate-700">
                {hasUnlocked ? (
                  <>
                    <CheckCircle2 size={11} className="text-emerald-400" /> ĐÃ MỞ KHÓA
                  </>
                ) : (
                  <>
                    <Lock size={11} className="text-amber-400" /> ĐANG KHÓA
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Title & Category */}
          <div className="mb-4">
            <span className="text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              {badge.category}
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2 mb-1">
              {badge.name}
            </h3>
            <p className="text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400 px-2 leading-relaxed">
              {badge.description}
            </p>
          </div>

          {/* Progress / Status Card */}
          <div className="bg-slate-50 dark:bg-slate-850/70 rounded-xl p-4 border border-slate-200 dark:border-slate-800 mb-5 text-left">
            <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
              <span className="text-slate-600 dark:text-slate-400">Tiến trình thử thách:</span>
              <span className={hasUnlocked ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"}>
                {hasUnlocked
                  ? "Hoàn thành 100%"
                  : `${badge.currentValue || 0} / ${badge.targetValue} ${badge.unit} (${progressPercent}%)`}
              </span>
            </div>

            {/* Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  hasUnlocked ? "bg-emerald-600 dark:bg-emerald-500" : "bg-indigo-600 dark:bg-indigo-500"
                }`}
                style={{ width: `${hasUnlocked ? 100 : progressPercent}%` }}
              />
            </div>

            {/* Rewards */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
              <span>Phần thưởng danh dự:</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                  🍞 +{badge.rewardBreads}
                </span>
                <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-semibold">
                  +{badge.rewardExp} EXP
                </span>
              </div>
            </div>

            {/* Date if unlocked */}
            {hasUnlocked && unlockedAt && (
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-2">
                <Calendar size={12} />
                <span>
                  Đạt được ngày {new Date(unlockedAt).toLocaleDateString("vi-VN")}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div>
            {hasUnlocked ? (
              <button
                type="button"
                onClick={handleToggleEquip}
                className={`w-full font-semibold text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs ${
                  isEquipped
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                <BadgeCheck size={16} />
                {isEquipped ? "Đang ghim trên Avatar (Bấm để gỡ)" : "Ghim huy hiệu lên Avatar"}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full font-medium text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700"
              >
                <Lock size={15} /> Chưa đủ điều kiện mở khóa
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
