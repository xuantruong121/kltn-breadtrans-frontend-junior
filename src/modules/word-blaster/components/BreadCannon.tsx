"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * The bread cannon: a loaf on wheels with a barrel that turns toward the
 * target. `angle` is in degrees, 0 straight up, negative to the left.
 * `recoil` bumps the barrel back after a shot.
 */
export function BreadCannon({ angle = 0, size = 96, recoil = 0 }: { angle?: number; size?: number; recoil?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
      {/* barrel, turning around the loaf's centre */}
      <motion.g
        style={{ originX: "48px", originY: "58px" }}
        animate={{ rotate: angle, y: recoil }}
        transition={{ type: "spring", stiffness: 380, damping: 22 }}
      >
        <rect x="41" y="14" width="14" height="40" rx="5" fill="#92400E" />
        <rect x="39" y="12" width="18" height="8" rx="3" fill="#78350F" />
      </motion.g>
      {/* loaf body */}
      <path d="M18 70c0-18 13-28 30-28s30 10 30 28v6H18z" fill="#F59E0B" stroke="#B45309" strokeWidth="3" />
      <path d="M30 56c3-5 8-7 12-7M50 49c5 0 10 2 13 6" stroke="#FDE68A" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* wheels */}
      <circle cx="30" cy="80" r="9" fill="#78350F" />
      <circle cx="66" cy="80" r="9" fill="#78350F" />
      <circle cx="30" cy="80" r="3.5" fill="#FDE68A" />
      <circle cx="66" cy="80" r="3.5" fill="#FDE68A" />
    </svg>
  );
}
