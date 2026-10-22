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
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    stageClass: "bg-slate-50 dark:bg-slate-800/60",
    rarityDot: "bg-slate-400",
  },
  RARE: {
    label: "Hiếm",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60",
    stageClass: "bg-sky-50 dark:bg-sky-950/30",
    rarityDot: "bg-sky-500",
  },
  EPIC: {
    label: "Sử thi",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60",
    stageClass: "bg-purple-50 dark:bg-purple-950/30",
    rarityDot: "bg-purple-500",
  },
  LEGENDARY: {
    label: "Huyền thoại",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
    stageClass: "bg-amber-50 dark:bg-amber-950/30",
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
        "flex flex-col justify-between rounded-xl border bg-white dark:bg-slate-900 p-5 transition-colors",
        isEquipped
          ? "border-amber-300 dark:border-amber-700"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      )}
    >
      <div>
        {/* Card Header: Rarity & Category */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
              rarity.badgeClass
            )}
          >
            <span className={clsx("h-1.5 w-1.5 rounded-full", rarity.rarityDot)} />
            {rarity.label}
          </span>
          <span className="text-[11px] text-slate-400">
            {categoryLabel}
          </span>
        </div>

        {/* Product Visual Stage — flat tint, no gradient, no glow */}
        <div
          className={clsx(
            "relative mb-4 flex h-32 w-full items-center justify-center overflow-hidden rounded-lg",
            rarity.stageClass
          )}
        >
          <Image
            src={imgSrc}
            alt={`${product.name} — ${visual.alt}`}
            width={144}
            height={144}
            className="h-24 w-24 object-contain"
            onError={() => setImgSrc((current) => current === visual.src ? visual.fallbackSrc : "/images/market/badge-star.svg")}
            loading="lazy"
          />

          {/* Physical Delivery Pill */}
          {(product.fulfillmentType === "PHYSICAL" ||
            product.requiresShippingAddress ||
            product.category === "PHYSICAL") && (
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white dark:border-amber-800/60 dark:bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
              <Truck size={12} className="text-amber-600 dark:text-amber-400" />
              <span>Quà vật lý</span>
            </span>
          )}

          {/* Limited Stock Notice */}
          {!isOutOfStock && product.stock <= 10 && (
            <span className="absolute bottom-2 left-2 inline-flex items-center rounded-md border border-rose-200 bg-white dark:border-rose-800/60 dark:bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300">
              Còn {product.stock}
            </span>
          )}

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
              <span className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                Hết hàng
              </span>
            </div>
          )}
        </div>

        {/* Name & Description */}
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 mb-1.5">
          {product.name}
        </h3>
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[34px] mb-4">
          {product.description || "Vật phẩm phần thưởng được quản lý bởi hệ thống học tập BreadTrans."}
        </p>
      </div>

      {/* Card Footer: Price & Action */}
      <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        {/* Price */}
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-400">Giá</span>
          <span className="flex items-center gap-1 text-base font-semibold text-slate-900 dark:text-slate-100 leading-none">
            {product.price.toLocaleString("vi-VN")}
            <Wheat size={14} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </span>
        </div>

        {/* Action Button */}
        {isEquippable ? (
          <button
            type="button"
            onClick={() => onEquipToggle?.(product)}
            className={clsx(
              "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-semibold transition-colors cursor-pointer",
              isEquipped
                ? "bg-amber-700 text-white hover:bg-amber-800"
                : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 dark:hover:border-slate-600"
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
              "inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-xs font-semibold transition-colors",
              isGuest
                ? "bg-amber-700 text-white hover:bg-amber-800 cursor-pointer"
                : isOutOfStock
                ? "bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-800 cursor-not-allowed"
                : !canAfford
                ? "bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-800 cursor-not-allowed"
                : "bg-amber-700 text-white hover:bg-amber-800 cursor-pointer"
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
