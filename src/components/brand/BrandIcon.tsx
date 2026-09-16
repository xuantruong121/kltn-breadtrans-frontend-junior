"use client";

import React from "react";

export interface BrandIconProps {
  /**
   * Predefined size presets or custom pixel size number
   * - xs: 20px
   * - sm: 28px
   * - md: 36px (default)
   * - lg: 44px
   * - xl: 64px
   */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  /**
   * Whether to wrap inside the signature BreadTrans warm squircle container
   */
  hasContainer?: boolean;
  className?: string;
  containerClassName?: string;
  animated?: boolean;
}

const SIZE_MAP: Record<string, { iconSize: number; containerSize: string; rounded: string }> = {
  xs: { iconSize: 18, containerSize: "w-6 h-6", rounded: "rounded-lg" },
  sm: { iconSize: 24, containerSize: "w-8 h-8", rounded: "rounded-xl" },
  md: { iconSize: 30, containerSize: "w-10 h-10", rounded: "rounded-xl" },
  lg: { iconSize: 38, containerSize: "w-12 h-12", rounded: "rounded-2xl" },
  xl: { iconSize: 52, containerSize: "w-16 h-16", rounded: "rounded-3xl" },
};

/**
 * High-definition, vector-crisp SVG emblem for BreadTrans.
 * Combines the golden wheat ear (knowledge/warm bread), the stylized 'B' loaf arc,
 * and the soaring royal blue translation arrow with intelligent AI data nodes.
 */
export function BrandIcon({
  size = "md",
  hasContainer = false,
  className = "",
  containerClassName = "",
  animated = false,
}: BrandIconProps) {
  const isNamedSize = typeof size === "string" && size in SIZE_MAP;
  const config = isNamedSize ? SIZE_MAP[size] : null;
  const pixelSize = typeof size === "number" ? size : config ? config.iconSize : 30;

  const svgContent = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={pixelSize}
      height={pixelSize}
      fill="none"
      className={`shrink-0 transition-transform duration-200 ${animated ? "group-hover:scale-105" : ""} ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Golden Wheat Gradient */}
        <linearGradient id="bt-wheat-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="bt-wheat-stem" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        {/* Warm Bread 'B' Gradient */}
        <linearGradient id="bt-bread-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="35%" stopColor="#F97316" />
          <stop offset="85%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>

        {/* Tech Blue Translation Arc Gradient */}
        <linearGradient id="bt-tech-blue" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1E40AF" />
          <stop offset="40%" stopColor="#2563EB" />
          <stop offset="80%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>

        {/* Inner Bread Crust Glow */}
        <linearGradient id="bt-bread-glow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        <filter id="bt-soft-depth" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#78350F" floodOpacity="0.12" />
        </filter>
      </defs>

      <g filter="url(#bt-soft-depth)">
        {/* 1. LEFT: Golden Wheat Stalk */}
        <path d="M17 56V11" stroke="url(#bt-wheat-stem)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M9 51C12 47 15.5 48.5 17 51" stroke="url(#bt-wheat-stem)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M25 51C22 47 18.5 48.5 17 51" stroke="url(#bt-wheat-stem)" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* 4 Graceful Wheat Grain Tiers */}
        <path d="M17 47C12.5 47 10 42 12.5 37.5C15 33 17 37 17 47Z" fill="url(#bt-wheat-gold)" />
        <path d="M17 47C21.5 47 24 42 21.5 37.5C19 33 17 37 17 47Z" fill="url(#bt-wheat-gold)" />
        <path d="M17 37.5C12.5 37.5 10.2 32.5 12.5 28C14.8 23.5 17 27.5 17 37.5Z" fill="url(#bt-wheat-gold)" />
        <path d="M17 37.5C21.5 37.5 23.8 32.5 21.5 28C19.2 23.5 17 27.5 17 37.5Z" fill="url(#bt-wheat-gold)" />
        <path d="M17 28C13 28 11.2 23.5 13 19.5C14.8 15.5 17 19 17 28Z" fill="url(#bt-wheat-gold)" />
        <path d="M17 28C21 28 22.8 23.5 21 19.5C19.2 15.5 17 19 17 28Z" fill="url(#bt-wheat-gold)" />
        <path d="M17 18.5C15 14.5 15.8 9.5 17 6.5C18.2 9.5 19 14.5 17 18.5Z" fill="url(#bt-wheat-gold)" />

        {/* 2. CENTER: Stylized Warm Bread 'B' */}
        <path
          d="M18 14H31C37 14 41.5 18 41.5 23.5C41.5 29 37 32.5 31 32.5H18"
          stroke="url(#bt-bread-body)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M18 32.5H33C40 32.5 45 37 45 43C45 49 39.5 53 32 53H18"
          stroke="url(#bt-bread-body)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Inner Highlights */}
        <path d="M22 16.5H30.5C34.5 16.5 37.5 19 37.5 22.5" stroke="url(#bt-bread-glow)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M22 35H32C36.5 35 40 38 40 42" stroke="url(#bt-bread-glow)" strokeWidth="1.8" strokeLinecap="round" fill="none" />

        {/* 3. RIGHT: Dynamic Translation Arc & Arrow */}
        <path
          d="M35 53C46 51 53 43 53 31C53 24 49 18 44 14.5"
          stroke="url(#bt-tech-blue)"
          strokeWidth="4.8"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M55.5 18L44 13.5L46 25.5L49 21.2L55.5 18Z" fill="url(#bt-tech-blue)" />

        {/* 4. Smart AI Signal Nodes */}
        <circle cx="36" cy="23.5" r="2.2" fill="#F59E0B" />
        <circle cx="37" cy="42.5" r="2.2" fill="#2563EB" />
        <circle cx="43" cy="32.5" r="2.4" fill="#0284C7" />
        <path d="M36 23.5L43 32.5L37 42.5" stroke="#38BDF8" strokeWidth="1.6" strokeDasharray="2.5 2" strokeLinecap="round" />
      </g>
    </svg>
  );

  if (!hasContainer) {
    return svgContent;
  }

  const containerSizeClass = config ? config.containerSize : "w-10 h-10";
  const roundedClass = config ? config.rounded : "rounded-xl";

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center bg-gradient-to-br from-amber-50/90 via-white to-amber-100/60 border border-amber-200/80 shadow-xs shadow-amber-900/5 ${containerSizeClass} ${roundedClass} ${containerClassName}`}
    >
      {svgContent}
    </div>
  );
}
