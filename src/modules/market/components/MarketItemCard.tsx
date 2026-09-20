"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Check, Wheat, Truck } from "lucide-react";
import clsx from "clsx";
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

interface RarityVisualConfig {
  label: string;
  badgeClass: string;
  stageGradient: string;
  stageBorder: string;
  auraColor: string;
  glowClass: string;
  cardBorderHover: string;
  rarityDot: string;
}

const RARITY_CONFIG: Record<string, RarityVisualConfig> = {
  COMMON: {
    label: "Phổ biến",
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200/90 font-bold",
    stageGradient: "from-slate-100/70 via-slate-50/40 to-white",
    stageBorder: "border-slate-200/70 group-hover:border-slate-300",
    auraColor: "bg-slate-400/10",
    glowClass: "group-hover:bg-slate-400/20",
    cardBorderHover: "group-hover:border-slate-300 group-hover:shadow-slate-200/40",
    rarityDot: "bg-slate-400",
  },
  RARE: {
    label: "Hiếm",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200/90 font-bold",
    stageGradient: "from-sky-500/10 via-cyan-500/5 to-white",
    stageBorder: "border-sky-200/80 group-hover:border-sky-300",
    auraColor: "bg-sky-400/20",
    glowClass: "group-hover:bg-sky-400/30",
    cardBorderHover: "group-hover:border-sky-300 group-hover:shadow-sky-100/50",
    rarityDot: "bg-sky-500",
  },
  EPIC: {
    label: "Sử thi",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200/90 font-bold",
    stageGradient: "from-purple-500/12 via-violet-500/5 to-white",
    stageBorder: "border-purple-200/80 group-hover:border-purple-300",
    auraColor: "bg-purple-400/20",
    glowClass: "group-hover:bg-purple-400/30",
    cardBorderHover: "group-hover:border-purple-300 group-hover:shadow-purple-100/50",
    rarityDot: "bg-purple-500",
  },
  LEGENDARY: {
    label: "Huyền thoại",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-300/90 font-extrabold shadow-2xs",
    stageGradient: "from-amber-500/15 via-yellow-500/10 to-amber-50/20",
    stageBorder: "border-amber-300/80 group-hover:border-amber-400",
    auraColor: "bg-amber-400/25",
    glowClass: "group-hover:bg-amber-400/40",
    cardBorderHover: "group-hover:border-amber-400 group-hover:shadow-amber-100/60",
    rarityDot: "bg-amber-500",
  },
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
  const rarity = RARITY_CONFIG[product.rarity?.toUpperCase()] || RARITY_CONFIG.COMMON;
  const isOutOfStock = product.stock <= 0;
  const isEquippable = (product.category === "AVATAR_FRAME" || product.category === "BADGE") && isUnlocked;
  const categoryLabel = CATEGORY_LABEL_MAP[product.category] || product.category;

  return (
    <div
      className={clsx(
        "group relative flex flex-col justify-between rounded-2xl border bg-white p-5 transition-all duration-300",
        isEquipped
          ? "border-amber-400 bg-amber-50/20 shadow-md ring-2 ring-amber-400/50"
          : clsx(
              "border-slate-200/90 shadow-xs hover:-translate-y-1.5 hover:shadow-xl",
              rarity.cardBorderHover
            )
      )}
    >
      <div>
        {/* Card Header: Rarity & Category */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] tracking-wide",
              rarity.badgeClass
            )}
          >
            <span className={clsx("h-1.5 w-1.5 rounded-full", rarity.rarityDot)} />
            {rarity.label}
          </span>
          <span className="text-[11px] font-semibold text-slate-400">
            {categoryLabel}
          </span>
        </div>

        {/* Product Visual Showcase Stage */}
        <div
          className={clsx(
            "relative mb-4 flex h-36 sm:h-40 w-full items-center justify-center overflow-hidden rounded-xl border bg-gradient-to-b p-4 transition-all duration-300",
            rarity.stageGradient,
            rarity.stageBorder
          )}
        >
          {/* Ambient Lighting Aura */}
          <div
            className={clsx(
              "pointer-events-none absolute h-28 w-28 rounded-full blur-xl transition-all duration-300 group-hover:scale-125",
              rarity.auraColor,
              rarity.glowClass
            )}
          />

          {/* Upgraded SVG Artwork */}
          <Image
            src={imgSrc}
            alt={product.name}
            width={112}
            height={112}
            className="relative z-10 h-24 w-24 sm:h-28 sm:w-28 object-contain transition-all duration-300 ease-out group-hover:scale-110 group-hover:-translate-y-1.5 drop-shadow-md"
            onError={() => setImgSrc("/images/market/streak-freeze.svg")}
            loading="lazy"
          />

          {/* Physical Delivery Pill */}
          {product.category === "PHYSICAL" && (
            <span className="absolute bottom-2.5 right-2.5 z-20 inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-white/95 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 shadow-2xs backdrop-blur-xs">
              <Truck size={12} className="text-amber-600" />
              <span>Giao tận nhà</span>
            </span>
          )}

          {/* Limited Stock Urgency Badge */}
          {!isOutOfStock && product.stock <= 10 && (
            <span className="absolute bottom-2.5 left-2.5 z-20 inline-flex items-center rounded-full border border-rose-200/80 bg-rose-50/95 px-2 py-0.5 text-[10px] font-bold text-rose-700 shadow-2xs backdrop-blur-xs">
              Còn {product.stock}
            </span>
          )}

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px]">
              <span className="rounded-xl border border-slate-300/40 bg-slate-900/90 px-3.5 py-1 text-xs font-bold text-white shadow-lg">
                Hết hàng
              </span>
            </div>
          )}
        </div>

        {/* Name & Description */}
        <h3 className="text-base font-bold text-slate-900 line-clamp-1 mb-1.5 group-hover:text-amber-900 transition-colors tracking-tight">
          {product.name}
        </h3>
        <p className="text-xs leading-relaxed text-slate-500 line-clamp-2 min-h-[34px] mb-4">
          {product.description || "Vật phẩm phần thưởng được quản lý bởi hệ thống học tập BreadTrans."}
        </p>
      </div>

      {/* Card Footer: Price & Action */}
      <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
        {/* Token Balance Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 via-amber-200/80 to-amber-300/50 text-amber-900 shadow-2xs border border-amber-300/60">
            <Wheat size={16} aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold text-amber-950 leading-none tracking-tight">
              {product.price.toLocaleString("vi-VN")}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
              Bánh Mì
            </span>
          </div>
        </div>

        {/* Action Button */}
        {isEquippable ? (
          <button
            type="button"
            onClick={() => onEquipToggle?.(product)}
            className={clsx(
              "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold transition-all cursor-pointer",
              isEquipped
                ? "bg-amber-600 text-white shadow-xs hover:bg-amber-700 active:scale-98"
                : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 active:scale-98"
            )}
          >
            {isEquipped ? (
              <>
                <Check size={15} /> Đang dùng
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
            className={clsx(
              "inline-flex min-h-11 items-center justify-center rounded-xl px-4.5 text-xs font-bold transition-all shadow-xs",
              isGuest
                ? "bg-amber-600 text-white hover:bg-amber-700 cursor-pointer active:scale-98 shadow-amber-600/20"
                : isOutOfStock
                ? "bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed shadow-none"
                : !canAfford
                ? "bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed shadow-none"
                : "bg-amber-600 text-white hover:bg-amber-700 active:scale-98 cursor-pointer shadow-amber-600/20"
            )}
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
