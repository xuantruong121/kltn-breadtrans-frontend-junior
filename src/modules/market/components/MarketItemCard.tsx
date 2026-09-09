"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Check, Wheat } from "lucide-react";
import { MarketProduct } from "../types";

interface MarketItemCardProps {
  product: MarketProduct;
  isUnlocked: boolean;
  isEquipped?: boolean;
  canAfford: boolean;
  isGuest: boolean;
  onRedeem: (product: MarketProduct) => void;
  onEquipToggle?: (product: MarketProduct) => void;
}

const RARITY_MAP: Record<string, { label: string; badgeClass: string }> = {
  COMMON: { label: "Phổ biến", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  RARE: { label: "Hiếm", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  EPIC: { label: "Sử thi", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
  LEGENDARY: { label: "Huyền thoại", badgeClass: "bg-amber-50 text-amber-800 border-amber-300" },
};

const CATEGORY_LABEL_MAP: Record<string, string> = {
  BOOST: "Bảo vệ & Tăng tốc",
  BADGE: "Huy hiệu vinh danh",
  AVATAR_FRAME: "Khung đại diện",
  PHYSICAL: "Quà hiện vật",
};

export const MarketItemCard: React.FC<MarketItemCardProps> = ({
  product,
  isUnlocked,
  isEquipped = false,
  canAfford,
  isGuest,
  onRedeem,
  onEquipToggle,
}) => {
  const [imgSrc, setImgSrc] = useState(product.imageUrl || "/images/market/streak-freeze.svg");
  const rarity = RARITY_MAP[product.rarity?.toUpperCase()] || RARITY_MAP.COMMON;
  const isOutOfStock = product.stock <= 0;
  const isEquippable = (product.category === "AVATAR_FRAME" || product.category === "BADGE") && isUnlocked;

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-5 transition-all duration-200 ${
        isEquipped
          ? "border-amber-400 bg-amber-50/20 shadow-md ring-1 ring-amber-400/50"
          : "border-slate-200/90 hover:border-amber-300 hover:shadow-md"
      }`}
    >
      <div>
        {/* Card Header: Rarity & Category */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wide ${rarity.badgeClass}`}
          >
            {rarity.label}
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            {CATEGORY_LABEL_MAP[product.category] || product.category}
          </span>
        </div>

        {/* Product Visual */}
        <div className="relative mb-4 flex h-28 w-full items-center justify-center rounded-xl bg-slate-50 p-3 group-hover:bg-amber-50/50 transition-colors">
          <Image
            src={imgSrc}
            alt={product.name}
            width={72}
            height={72}
            className="h-16 w-16 object-contain transition-transform duration-200 group-hover:scale-105"
            onError={() => setImgSrc("/images/market/streak-freeze.svg")}
            loading="lazy"
          />
          {product.category === "PHYSICAL" && (
            <span className="absolute bottom-2 right-2 rounded bg-amber-100/90 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
              Giao tận nhà
            </span>
          )}
        </div>

        {/* Name & Description */}
        <h3 className="text-base font-bold text-slate-900 line-clamp-1 mb-1 group-hover:text-amber-900 transition-colors">
          {product.name}
        </h3>
        <p className="text-xs leading-relaxed text-slate-500 line-clamp-2 min-h-[32px] mb-4">
          {product.description || "Vật phẩm phần thưởng được quản lý bởi hệ thống học tập BreadTrans."}
        </p>
      </div>

      {/* Card Footer: Price & Action */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800">
            <Wheat size={14} aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-amber-900 leading-none">
              {product.price.toLocaleString("vi-VN")}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Bánh Mì</span>
          </div>
        </div>

        {/* Action Button */}
        {isEquippable ? (
          <button
            type="button"
            onClick={() => onEquipToggle?.(product)}
            className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
              isEquipped
                ? "bg-amber-600 text-white shadow-xs hover:bg-amber-700"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {isEquipped ? (
              <>
                <Check size={14} /> Đang dùng
              </>
            ) : (
              "Trang bị"
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRedeem(product)}
            disabled={!isGuest && (isOutOfStock || !canAfford)}
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
              isGuest
                ? "bg-amber-600 text-white hover:bg-amber-700 shadow-xs"
                : isOutOfStock
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : !canAfford
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-amber-600 text-white hover:bg-amber-700 shadow-xs active:scale-98"
            }`}
          >
            {isGuest
              ? "Đổi quà"
              : isOutOfStock
              ? "Hết hàng"
              : !canAfford
              ? "Chưa đủ bánh"
              : product.category === "PHYSICAL"
              ? "Đổi quà"
              : "Mua ngay"}
          </button>
        )}
      </div>
    </div>
  );
};
export default MarketItemCard;
