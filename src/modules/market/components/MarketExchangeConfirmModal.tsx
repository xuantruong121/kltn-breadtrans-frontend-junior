"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, AlertTriangle, Loader2, Wheat, X } from "lucide-react";
import { MarketProduct } from "../types";
import { calculateRemainingBalance, formatBanhMi } from "../marketExchangeLogic";

interface MarketExchangeConfirmModalProps {
  isOpen: boolean;
  product: MarketProduct | null;
  currentBalance: number;
  isPending: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const CATEGORY_LABEL_MAP: Record<string, string> = {
  BOOST: "Bảo vệ & Tăng tốc",
  BADGE: "Huy hiệu vinh danh",
  AVATAR_FRAME: "Khung đại diện",
  PHYSICAL: "Quà hiện vật",
};

const RARITY_MAP: Record<string, { label: string; badgeClass: string; stageBg: string }> = {
  COMMON: {
    label: "Phổ biến",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    stageBg: "bg-gradient-to-b from-slate-100 to-slate-50 border-slate-200/80",
  },
  RARE: {
    label: "Hiếm",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200 font-bold",
    stageBg: "bg-gradient-to-b from-sky-50 to-white border-sky-200/80",
  },
  EPIC: {
    label: "Sử thi",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 font-bold",
    stageBg: "bg-gradient-to-b from-purple-50 to-white border-purple-200/80",
  },
  LEGENDARY: {
    label: "Huyền thoại",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-300 font-extrabold shadow-2xs",
    stageBg: "bg-gradient-to-b from-amber-50 to-white border-amber-300/80",
  },
};

export const MarketExchangeConfirmModal: React.FC<MarketExchangeConfirmModalProps> = ({
  isOpen,
  product,
  currentBalance,
  isPending,
  errorMessage,
  onConfirm,
  onCancel,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [hasImageError, setHasImageError] = useState(false);
  const [prevProductId, setPrevProductId] = useState<number | null>(null);

  if (product && product.id !== prevProductId) {
    setPrevProductId(product.id);
    setHasImageError(false);
  }

  const displayImage =
    hasImageError || !product?.imageUrl
      ? "/images/market/streak-freeze.svg"
      : product.imageUrl;

  // Focus trap & Escape listener
  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button by default to avoid accidental confirmations
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements.length) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPending, onCancel]);

  if (!isOpen || !product) return null;

  const remainingBalance = calculateRemainingBalance(currentBalance, product.price);
  const categoryLabel = CATEGORY_LABEL_MAP[product.category?.toUpperCase()] || product.category;
  const rarity = RARITY_MAP[product.rarity?.toUpperCase()] || RARITY_MAP.COMMON;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px] transition-opacity motion-reduce:transition-none"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="market-exchange-modal-title"
        aria-describedby="market-exchange-modal-desc"
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl transition-all motion-reduce:transition-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Wheat size={22} aria-hidden="true" />
            </div>
            <div>
              <h2
                id="market-exchange-modal-title"
                className="text-lg sm:text-xl font-bold text-slate-900 leading-tight"
              >
                Xác nhận đổi vật phẩm
              </h2>
              <p
                id="market-exchange-modal-desc"
                className="mt-1 text-xs sm:text-sm text-slate-500"
              >
                Bạn có chắc chắn muốn đổi vật phẩm này bằng Bánh Mì không?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            aria-label="Đóng hộp thoại"
            className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Product Visual & Info */}
        <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 flex items-center gap-4">
          <div className={`relative flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border p-2 shadow-2xs ${rarity.stageBg}`}>
            <Image
              src={displayImage}
              alt={product.name}
              width={72}
              height={72}
              className="h-16 w-16 object-contain drop-shadow-sm"
              onError={() => setHasImageError(true)}
              loading="lazy"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${rarity.badgeClass}`}>
                {rarity.label}
              </span>
              <span className="inline-block rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {categoryLabel}
              </span>
              {product.stock > 0 && (
                <span className="text-[11px] font-medium text-emerald-700 ml-auto">
                  Còn {product.stock}
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {product.name}
            </h3>
            {product.description && (
              <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                {product.description}
              </p>
            )}
          </div>
        </div>

        {/* Ledger Breakdown Card */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Vật phẩm:</span>
            <span className="font-semibold text-slate-900 text-right truncate max-w-[240px]">
              {product.name}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Giá đổi:</span>
            <span className="font-bold text-amber-900">
              {formatBanhMi(product.price)} Bánh Mì
            </span>
          </div>
          <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
            <span className="text-slate-600">Số dư hiện tại:</span>
            <span className="font-medium text-slate-700">
              {formatBanhMi(currentBalance)} Bánh Mì
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-200">
            <span className="text-slate-700 font-medium">Số dư sau khi đổi:</span>
            <span className="font-extrabold text-amber-900">
              {formatBanhMi(remainingBalance)} Bánh Mì
            </span>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200/90 bg-amber-50/60 p-3 text-xs text-amber-900">
          <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Giao dịch đổi vật phẩm không thể hoàn tác sau khi xác nhận.
          </p>
        </div>

        {/* Error message if exchange failed */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
          >
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <p className="font-semibold">Thao tác đổi vật phẩm chưa thành công:</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 transition-colors"
          >
            Hủy
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-bold text-white shadow-xs hover:bg-amber-700 active:bg-amber-800 disabled:opacity-60 transition-colors"
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            {isPending
              ? "Đang xử lý..."
              : `Đổi với ${formatBanhMi(product.price)} Bánh Mì`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketExchangeConfirmModal;
