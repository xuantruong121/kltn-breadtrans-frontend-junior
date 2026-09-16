"use client";

import React from "react";
import Link from "next/link";
import { BrandIcon } from "./BrandIcon";

export interface BrandLogoProps {
  /**
   * Layout presentation:
   * - "compact": Icon + "BreadTrans" wordmark (Standard for desktop & mobile navbar)
   * - "full": Icon + "BreadTrans" + Subtitle (Hero / Auth / Landing)
   * - "admin": Icon + "BreadTrans" + CMS tag (Admin sidebar & headers)
   * - "mark": Icon only (Compact spaces, loading screens, drawer headers)
   */
  variant?: "compact" | "full" | "admin" | "mark";
  /**
   * Size presets:
   * - "sm": Compact nav / mobile (Icon ~24px, text text-lg)
   * - "md": Standard header (Icon ~30px, text text-xl)
   * - "lg": Auth / prominent cards (Icon ~38px, text text-2xl)
   * - "xl": Splash / hero / practice loading (Icon ~52px, text text-3xl)
   */
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * Optional role badge: e.g. "Học viên", "Quản trị", "Khách"
   */
  roleBadge?: "STUDENT" | "ADMIN" | "GUEST" | string;
  /**
   * Custom subtitle under the wordmark
   */
  subtitle?: string;
  /**
   * Link destination (if null or undefined, renders as a div)
   */
  href?: string | null;
  onClick?: () => void;
  /**
   * Whether to wrap the SVG emblem inside the squircle container
   */
  iconContainer?: boolean;
  /**
   * Surface theme: light or dark
   */
  isDark?: boolean;
  className?: string;
  textClassName?: string;
}

const ROLE_LABEL_MAP: Record<string, { label: string; bg: string; text: string; border: string }> = {
  STUDENT: {
    label: "Học viên",
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-200/80",
  },
  ADMIN: {
    label: "Quản trị",
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-200/80",
  },
  GUEST: {
    label: "Khách",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
  },
};

export function BrandLogo({
  variant = "compact",
  size = "md",
  roleBadge,
  subtitle,
  href,
  onClick,
  iconContainer = true,
  isDark = false,
  className = "",
  textClassName = "",
}: BrandLogoProps) {
  // Size-specific typography & spacing
  const sizeStyles = {
    sm: {
      gap: "gap-2",
      wordmark: "text-lg",
      subtitle: "text-[10px]",
      badge: "text-[9px] px-1 py-0.2",
    },
    md: {
      gap: "gap-2.5",
      wordmark: "text-xl",
      subtitle: "text-xs",
      badge: "text-[10px] px-1.5 py-0.5",
    },
    lg: {
      gap: "gap-3",
      wordmark: "text-2xl",
      subtitle: "text-xs",
      badge: "text-xs px-2 py-0.5",
    },
    xl: {
      gap: "gap-4",
      wordmark: "text-3xl",
      subtitle: "text-sm",
      badge: "text-xs px-2.5 py-1",
    },
  }[size];

  // Resolve role badge styling
  const resolvedBadge = roleBadge
    ? ROLE_LABEL_MAP[roleBadge] || {
        label: roleBadge,
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-200",
      }
    : null;

  const content = (
    <div
      className={`inline-flex items-center ${sizeStyles.gap} shrink-0 select-none group transition-opacity duration-150 ${className}`}
    >
      {/* 1. Brand Icon */}
      <BrandIcon
        size={size}
        hasContainer={iconContainer}
        animated={Boolean(href || onClick)}
      />

      {/* 2. Wordmark (Hidden if variant is 'mark') */}
      {variant !== "mark" && (
        <div className="flex flex-col shrink-0 leading-tight">
          <div className="flex items-center gap-1.5">
            {/* Wordmark: "Bread" (Warm Navy/Slate) + "Trans" (Royal Blue) */}
            <span
              className={`font-black tracking-tight whitespace-nowrap ${sizeStyles.wordmark} ${
                isDark ? "text-white" : "text-slate-900"
              } ${textClassName}`}
            >
              Bread
              <span className="text-blue-600 dark:text-blue-400">Trans</span>
            </span>

            {/* Admin CMS Badge */}
            {variant === "admin" && (
              <span className="rounded-md bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 text-[10px] font-black tracking-wide text-blue-700 uppercase shrink-0">
                CMS
              </span>
            )}

            {/* Custom Role Badge */}
            {resolvedBadge && variant !== "admin" && (
              <span
                className={`rounded-md font-black uppercase tracking-wide border whitespace-nowrap shrink-0 ${sizeStyles.badge} ${resolvedBadge.bg} ${resolvedBadge.text} ${resolvedBadge.border}`}
              >
                {resolvedBadge.label}
              </span>
            )}
          </div>

          {/* Subtitle / Tagline */}
          {(subtitle || variant === "full") && (
            <span
              className={`font-medium tracking-normal mt-0.5 truncate ${sizeStyles.subtitle} ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {subtitle || "Nền tảng Tự học Tiếng Anh & Luyện thi TOEIC"}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="inline-flex items-center shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        aria-label="BreadTrans Trang chủ"
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer text-left"
        aria-label="BreadTrans Logo"
      >
        {content}
      </button>
    );
  }

  return content;
}
