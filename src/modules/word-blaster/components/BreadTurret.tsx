"use client";

import React from "react";
import { motion } from "framer-motion";

/** The turret's drawing box: the barrel turns around PIVOT and its mouth is BARREL above it. */
export const TURRET_BOX = 112;
export const TURRET_PIVOT = { x: 56, y: 70 };
export const TURRET_BARREL = 66;

/**
 * The bread cannon at night: a glowing loaf on a stone base, its barrel
 * turning smoothly toward the locked block. Each shot kicks the barrel back
 * and flashes at its mouth (`flash` changes per shot). `angle` in degrees,
 * 0 straight up, negative to the left.
 */
export function BreadTurret({ angle, size, flash, reduce }: { angle: number; size: number; flash: number; reduce: boolean }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${TURRET_BOX} ${TURRET_BOX}`} aria-hidden="true" className="overflow-visible">
      <defs>
        <linearGradient id="wb-loaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FCD34D" />
          <stop offset="0.55" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="wb-barrel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5B2A0A" />
          <stop offset="0.5" stopColor="#92400E" />
          <stop offset="1" stopColor="#5B2A0A" />
        </linearGradient>
        <radialGradient id="wb-glow">
          <stop offset="0" stopColor="rgba(251,191,36,0.55)" />
          <stop offset="1" stopColor="rgba(251,191,36,0)" />
        </radialGradient>
      </defs>
      <ellipse cx="56" cy="96" rx="54" ry="18" fill="url(#wb-glow)" />

      <motion.g
        style={{ originX: `${TURRET_PIVOT.x}px`, originY: `${TURRET_PIVOT.y}px` }}
        animate={{ rotate: angle }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 32 }}
      >
        <motion.g
          key={flash}
          initial={reduce || flash === 0 ? false : { y: 7 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 700, damping: 18 }}
        >
          <rect x="48" y="6" width="16" height="62" rx="6" fill="url(#wb-barrel)" stroke="#3B1A06" strokeWidth="1.5" />
          <rect x="45.5" y="3" width="21" height="9" rx="3.5" fill="#7C2D12" stroke="#3B1A06" strokeWidth="1.5" />
          <rect x="48" y="30" width="16" height="4" fill="#FBBF24" opacity="0.7" />
        </motion.g>
        {flash > 0 && !reduce && (
          <motion.g
            key={`f-${flash}`}
            initial={{ opacity: 1, scale: 0.6 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            style={{ originX: "56px", originY: "-2px" }}
          >
            <path d="M56 -16 L60 -6 L70 -8 L62 -1 L68 8 L56 2 L44 8 L50 -1 L42 -8 L52 -6 Z" fill="#FFFBEB" />
            <circle cx="56" cy="-2" r="5" fill="#FDE68A" />
          </motion.g>
        )}
      </motion.g>

      {/* the loaf */}
      <path d="M16 84c0-22 17-34 40-34s40 12 40 34v4H16z" fill="url(#wb-loaf)" stroke="#92400E" strokeWidth="2.5" />
      <path d="M32 66c4-6 10-8 15-8M60 58c6 0 12 3 16 8M42 76c3-4 7-5 11-5" stroke="#FEF3C7" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.85" />
      {/* stone base */}
      <path d="M10 88h92l-8 16H18z" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
      <path d="M12 89h88" stroke="#FBBF24" strokeWidth="1.5" opacity="0.55" />
      <circle cx="30" cy="97" r="2" fill="#475569" />
      <circle cx="56" cy="97" r="2" fill="#475569" />
      <circle cx="82" cy="97" r="2" fill="#475569" />
    </svg>
  );
}
