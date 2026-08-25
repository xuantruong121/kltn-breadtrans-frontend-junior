"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Lock, Sparkles, Award, Calendar, Zap, Shield, Flame, Crown, Star, Swords, Mic, Heart } from "lucide-react";
import { Button3D } from "@/components/ui";
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
      toast.success(`Đã đeo huy hiệu "${badge.name}" lên Avatar! ✨`);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_25px_50px_rgba(0,0,0,0.25)] max-w-md w-full p-6 sm:p-8 text-center relative overflow-hidden"
        >
          {/* Ambient Glow */}
          <div
            className={`absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none ${badge.accentGlow}`}
          />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer z-10"
          >
            <X size={18} />
          </button>

          {/* 3D Medal Orb */}
          <div className="relative my-4 flex justify-center">
            <motion.div
              animate={hasUnlocked ? { rotate: [0, 5, -5, 0] } : {}}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className={`w-28 h-28 rounded-full border-4 flex items-center justify-center relative shadow-lg ${
                hasUnlocked
                  ? `${badge.bgColor} ${badge.borderColor} ${badge.color}`
                  : "bg-slate-100 border-slate-300 text-slate-400 grayscale"
              }`}
            >
              {/* Shine effect */}
              {hasUnlocked && (
                <div className="absolute top-1 inset-x-0 h-10 bg-white/30 rounded-full blur-xs pointer-events-none" />
              )}

              <Icon size={52} className="drop-shadow-md" />

              {/* Status Badge */}
              <div className="absolute -bottom-2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-xs flex items-center gap-1 bg-slate-800">
                {hasUnlocked ? (
                  <>
                    <CheckCircle2 size={12} className="text-emerald-400" /> ĐÃ MỞ KHÓA
                  </>
                ) : (
                  <>
                    <Lock size={12} className="text-amber-400" /> ĐANG KHÓA
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Title & Category */}
          <div className="mb-4">
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {badge.category}
            </span>
            <h3 className="text-2xl font-black text-slate-800 mt-1 mb-1">
              {badge.name}
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 px-2 leading-relaxed">
              {badge.description}
            </p>
          </div>

          {/* Progress / Status Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-5 text-left">
            <div className="flex justify-between items-center text-xs font-black mb-1.5">
              <span className="text-slate-600">Tiến trình thử thách:</span>
              <span className={hasUnlocked ? "text-emerald-600" : "text-purple-600"}>
                {hasUnlocked
                  ? "Hoàn thành 100%"
                  : `${badge.currentValue || 0} / ${badge.targetValue} ${badge.unit} (${progressPercent}%)`}
              </span>
            </div>

            {/* Bar */}
            <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden border border-slate-300">
              <div
                className={`h-full rounded-full transition-all ${
                  hasUnlocked
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                    : "bg-gradient-to-r from-purple-500 to-indigo-500"
                }`}
                style={{ width: `${hasUnlocked ? 100 : progressPercent}%` }}
              />
            </div>

            {/* Rewards */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200 text-xs font-bold text-slate-600">
              <span>Phần thưởng danh dự:</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-amber-600 font-black">
                  🍞 +{badge.rewardBreads}
                </span>
                <span className="flex items-center gap-1 text-purple-600 font-black">
                  ⭐ +{badge.rewardExp} EXP
                </span>
              </div>
            </div>

            {/* Date if unlocked */}
            {hasUnlocked && unlockedAt && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 mt-2">
                <Calendar size={12} />
                <span>
                  Đạt được ngày {new Date(unlockedAt).toLocaleDateString("vi-VN")}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {hasUnlocked ? (
              <Button3D
                variant={isEquipped ? "yellow" : "green"}
                size="md"
                onClick={handleToggleEquip}
                className="w-full font-black text-sm py-3 flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {isEquipped ? (
                  <>
                    <Sparkles size={16} /> Đang Đeo Trên Avatar (Bấm để gỡ)
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Đeo Huy Hiệu Này Lên Avatar
                  </>
                )}
              </Button3D>
            ) : (
              <Button3D
                variant="white"
                size="md"
                disabled
                className="w-full font-black text-sm py-3 flex items-center justify-center gap-2 opacity-70"
              >
                <Lock size={16} /> Chưa Đủ Điều Kiện Mở Khóa
              </Button3D>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
