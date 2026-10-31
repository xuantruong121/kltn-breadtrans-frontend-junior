"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Check, Wheat, Truck } from "lucide-react";
import clsx from "clsx";
import { MarketProduct } from "../types";
import { getMarketItemVisual } from "../marketVisuals";

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
  stageClass: string;
  rarityDot: string;
}

// Flat surfaces, no gradients, no glow — rarity is communicated by a small
// pale pill and dot only, same as any other status mark in the app.
const RARITY_CONFIG: Record<string, RarityVisualConfig> = {
  COMMON: {
    label: "Phổ biến",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    stageClass: "bg-slate-50/90 dark:bg-slate-800/40",
    rarityDot: "bg-slate-400",
  },
  RARE: {
    label: "Hiếm",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60",
    stageClass: "bg-slate-50/90 dark:bg-slate-800/40",
    rarityDot: "bg-sky-500",
  },
  EPIC: {
    label: "Sử thi",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
    stageClass: "bg-slate-50/90 dark:bg-slate-800/40",
    rarityDot: "bg-purple-500",
  },
  LEGENDARY: {
    label: "Huyền thoại",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    stageClass: "bg-slate-50/90 dark:bg-slate-800/40",
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
  const visual = getMarketItemVisual(product.slug, product.category);
  const [imgSrc, setImgSrc] = useState(visual.src);
  const rarity = RARITY_CONFIG[product.rarity?.toUpperCase()] || RARITY_CONFIG.COMMON;
  const isOutOfStock = product.stock <= 0;
  const isEquippable = (product.category === "AVATAR_FRAME" || product.category === "BADGE") && isUnlocked;
  const categoryLabel = CATEGORY_LABEL_MAP[product.category] || product.category;

  return (
    <div
      className={clsx(
        "group relative flex flex-col justify-between rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        isEquipped
          ? "border-emerald-300/80 dark:border-emerald-700/80 ring-1 ring-emerald-500/20"
          : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      )}
    >
      <div>
        {/* Card Header: Rarity & Category */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              rarity.badgeClass
            )}
          >
            <span className={clsx("h-1.5 w-1.5 rounded-full", rarity.rarityDot)} />
            {rarity.label}
          </span>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            {categoryLabel}
          </span>
        </div>

        {/* Product Visual Stage — DO NOT TOUCH IMAGE (Rule: không động vào hình item trong cửa hàng) */}
        <div
          className={clsx(
            "relative mb-3.5 flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-100/90 dark:border-slate-800/80 transition-colors",
            rarity.stageClass
          )}
        >
          <Image
            src={imgSrc}
            alt={`${product.name} — ${visual.alt}`}
            width={144}
            height={144}
            className="h-24 w-24 object-contain transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgSrc((current) => current === visual.src ? visual.fallbackSrc : "/images/market/badge-star.svg")}
            loading="lazy"
          />

          {/* Delivery pill: the header already says "Quà hiện vật" for that category. */}
          {product.category !== "PHYSICAL" &&
            (product.fulfillmentType === "PHYSICAL" || product.requiresShippingAddress) && (
            <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-white/95 dark:border-slate-700 dark:bg-slate-900/95 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs backdrop-blur-xs">
              <Truck size={12} className="text-slate-600 dark:text-slate-400" />
              <span>Giao tận nhà</span>
            </span>
          )}

          {/* Limited Stock Notice */}
          {!isOutOfStock && product.stock <= 10 && (
            <span className="absolute top-2.5 left-2.5 inline-flex items-center rounded-md border border-rose-200 bg-rose-50/95 dark:border-rose-900/60 dark:bg-rose-950/80 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300 shadow-2xs">
              Còn {product.stock}
            </span>
          )}

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-[1px]">
              <span className="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                Hết hàng
              </span>
            </div>
          )}
        </div>

        {/* Name & Description */}
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {product.name}
        </h3>
        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[34px] mb-3">
          {product.description || "Vật phẩm phần thưởng được quản lý bởi hệ thống học tập BreadTrans."}
        </p>
      </div>

      {/* Card Footer: Price & Action */}
      <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
        {/* Price */}
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider font-medium text-slate-400 dark:text-slate-500">Giá</span>
          <span className="flex items-center gap-1 text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">
            {product.price.toLocaleString("vi-VN")}
            <Wheat size={15} className="text-amber-500 dark:text-amber-400" aria-hidden="true" />
          </span>
        </div>

        {/* Action Button — Strictly NO ORANGE, NO BLACK */}
        {isEquippable ? (
          <button
            type="button"
            onClick={() => onEquipToggle?.(product)}
            className={clsx(
              "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-semibold transition active:scale-[0.98] cursor-pointer shadow-2xs",
              isEquipped
                ? "border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            )}
          >
            {isEquipped ? (
              <>
                <Check size={14} className="stroke-[2.5]" />
                <span>Đang dùng</span>
              </>
            ) : (
              <span>Trang bị</span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRedeem(product)}
            disabled={!isGuest && (isOutOfStock || !canAfford)}
            className={clsx(
              "inline-flex h-10 items-center justify-center rounded-xl px-4 text-xs font-semibold transition",
              isGuest
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
                : isOutOfStock || !canAfford
                ? "bg-slate-100 text-slate-400 border border-slate-200/70 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-800 cursor-not-allowed shadow-none"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
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
