"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, ShoppingBag, Sparkles } from "lucide-react";
import { MarketItem } from "../types";
import { Button3D } from "@/components/ui";

interface MarketItemCardProps {
  item: MarketItem;
  isUnlocked: boolean;
  canAfford: boolean;
  onBuy: () => void;
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
  canAfford,
  onBuy,
}) => {
  const r = RARITY_MAP[item.rarity];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] p-6 flex flex-col justify-between"
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

        {/* Chỉ vật phẩm Trang trí / Huy hiệu mới bị giới hạn sở hữu 1 lần duy nhất */}
        {(item.category === "avatar" || item.category === "badge") && isUnlocked ? (
          <span className="flex items-center gap-1 text-emerald-600 font-black text-xs bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
            <Check size={16} /> Đã sở hữu
          </span>
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
