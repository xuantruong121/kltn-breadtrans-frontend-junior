"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { MarketItem } from "../types";
import { Button3D } from "@/components/ui";

interface MarketItemCardProps {
  item: MarketItem;
  isUnlocked: boolean;
  isEquipped?: boolean;
  canAfford: boolean;
  onBuy: () => void;
  onEquipToggle?: () => void;
}

const RARITY_MAP = {
  common: { label: "Phổ biến", bg: "bg-slate-100 text-slate-700 border-slate-300" },
  rare: { label: "Hiếm", bg: "bg-sky-100 text-sky-800 border-sky-300" },
  epic: { label: "Sử thi", bg: "bg-purple-100 text-purple-800 border-purple-300" },
  legendary: { label: "Huyền thoại", bg: "bg-amber-100 text-amber-900 border-amber-400" },
};

export const MarketItemCard: React.FC<MarketItemCardProps> = ({
  item,
  isUnlocked,
  isEquipped = false,
  canAfford,
  onBuy,
  onEquipToggle,
}) => {
  const r = RARITY_MAP[item.rarity];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`bg-white rounded-[2rem] border-4 p-6 flex flex-col justify-between transition-all ${
        isEquipped
          ? "border-amber-400 shadow-[0_8px_0_0_#f59e0b] ring-2 ring-amber-300"
          : "border-slate-200 shadow-[0_8px_0_0_#e2e8f0]"
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border-2 ${r.bg}`}>
            {r.label}
          </span>
          <span className="text-3xl">{item.icon}</span>
        </div>

        <h3 className="text-xl font-black text-slate-800 mb-1">{item.name}</h3>
        <p className="text-xs font-medium text-slate-400 leading-relaxed mb-6">
          {item.description}
        </p>
      </div>

      <div className="pt-4 border-t-2 border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 font-black text-amber-800 text-lg">
          <span>{item.price}</span>
          <span className="text-base">🍞</span>
        </div>

        {/* Vật phẩm Trang trí / Huy hiệu đã sở hữu cho phép Trang bị / Đang đeo */}
        {(item.category === "avatar" || item.category === "badge") && isUnlocked ? (
          <button
            onClick={onEquipToggle}
            className={`flex items-center gap-1.5 font-black text-xs px-3.5 py-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
              isEquipped
                ? "bg-amber-500 text-white border-amber-600 shadow-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
            }`}
          >
            {isEquipped ? (
              <><Check size={16} /> Đang đeo ✓</>
            ) : (
              <><Zap size={16} /> Trang bị ngay</>
            )}
          </button>
        ) : (
          <Button3D
            variant={canAfford ? (item.category === "gift" ? "green" : "orange") : "white"}
            size="sm"
            onClick={onBuy}
            disabled={!canAfford}
          >
            {canAfford 
              ? item.category === "gift" 
                ? "Đổi quà 🎁" 
                : "Mua ngay ⚡"
              : "Thiếu Bánh Mì"}
          </Button3D>
        )}
      </div>
    </motion.div>
  );
};
