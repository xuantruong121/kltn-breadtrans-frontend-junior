"use client";

import React from "react";
import { motion } from "framer-motion";
import type { MonsterKind } from "@/lib/api/services/dungeon.service";

/** Angry eyes and brows, shared by every monster. */
function Face({ x, y, gap = 26, size = 7, fang = true, mouthW = 24 }: { x: number; y: number; gap?: number; size?: number; fang?: boolean; mouthW?: number }) {
  return (
    <g>
      <path d={`M${x - gap / 2 - size - 3} ${y - size - 6} l${size + 6} ${size * 0.7}`} stroke="#2B1608" strokeWidth="4" strokeLinecap="round" />
      <path d={`M${x + gap / 2 + size + 3} ${y - size - 6} l${-size - 6} ${size * 0.7}`} stroke="#2B1608" strokeWidth="4" strokeLinecap="round" />
      <circle cx={x - gap / 2} cy={y} r={size} fill="#FFF7E6" />
      <circle cx={x + gap / 2} cy={y} r={size} fill="#FFF7E6" />
      <circle cx={x - gap / 2 + 1.5} cy={y + 1} r={size * 0.5} fill="#2B1608" />
      <circle cx={x + gap / 2 - 1.5} cy={y + 1} r={size * 0.5} fill="#2B1608" />
      <path d={`M${x - mouthW / 2} ${y + 18} q${mouthW / 2} -8 ${mouthW} 0`} stroke="#2B1608" strokeWidth="4" fill="none" strokeLinecap="round" />
      {fang && <path d={`M${x - 6} ${y + 15} l3 6 l3 -6 M${x + 1} ${y + 15} l3 6 l3 -6`} fill="#FFF7E6" stroke="#2B1608" strokeWidth="1.2" />}
    </g>
  );
}

const ART: Record<MonsterKind, React.ReactNode> = {
  moldy: (
    <g>
      <ellipse cx="80" cy="140" rx="52" ry="8" fill="#000" opacity="0.35" />
      <path d="M28 132 V86 C28 52 52 36 80 36 C108 36 132 52 132 86 V132 Z" fill="#C98B4B" stroke="#7A4A1E" strokeWidth="4" />
      <path d="M44 60 q10 -10 22 -12 M92 50 q14 2 24 12" stroke="#E8B97A" strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="48" cy="104" r="9" fill="#6E9A5B" />
      <circle cx="58" cy="114" r="5" fill="#86B06E" />
      <circle cx="112" cy="70" r="7" fill="#6E9A5B" />
      <circle cx="104" cy="118" r="6" fill="#86B06E" />
      <Face x={80} y={84} />
    </g>
  ),
  mouse: (
    <g>
      <ellipse cx="80" cy="140" rx="48" ry="8" fill="#000" opacity="0.35" />
      <path d="M126 116 q26 -6 22 -34" stroke="#C9A9A0" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="44" cy="52" r="20" fill="#D9D2CC" stroke="#8E8580" strokeWidth="4" />
      <circle cx="116" cy="52" r="20" fill="#D9D2CC" stroke="#8E8580" strokeWidth="4" />
      <circle cx="44" cy="52" r="10" fill="#F2B8B0" />
      <circle cx="116" cy="52" r="10" fill="#F2B8B0" />
      <ellipse cx="80" cy="96" rx="48" ry="44" fill="#ECE6E0" stroke="#8E8580" strokeWidth="4" />
      <circle cx="80" cy="108" r="6" fill="#E58C8C" />
      <path d="M58 108 h-22 M58 114 h-20 M102 108 h22 M102 114 h20" stroke="#8E8580" strokeWidth="2" strokeLinecap="round" />
      <Face x={80} y={84} fang={false} mouthW={16} />
    </g>
  ),
  ant: (
    <g>
      <ellipse cx="80" cy="142" rx="56" ry="7" fill="#000" opacity="0.35" />
      <path d="M58 46 q-12 -22 -26 -24 M102 46 q12 -22 26 -24" stroke="#3E2416" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="122" cy="110" rx="26" ry="22" fill="#5A3624" stroke="#2E190E" strokeWidth="4" />
      <ellipse cx="80" cy="76" rx="32" ry="28" fill="#6B4130" stroke="#2E190E" strokeWidth="4" />
      <path d="M60 100 l-14 30 M80 104 l0 32 M100 100 l14 30" stroke="#2E190E" strokeWidth="5" strokeLinecap="round" />
      <rect x="24" y="96" width="30" height="30" rx="4" fill="#FFFDF7" stroke="#C9B48F" strokeWidth="3" transform="rotate(-10 39 111)" />
      <Face x={80} y={74} gap={22} size={6} mouthW={18} />
    </g>
  ),
  snail: (
    <g>
      <ellipse cx="80" cy="142" rx="56" ry="7" fill="#000" opacity="0.35" />
      <path d="M22 136 H130 q14 0 14 -12 q0 -10 -14 -12 H44 q-22 2 -22 24 Z" fill="#D7C27A" stroke="#8C7A3A" strokeWidth="4" />
      <path d="M126 112 l6 -40 M140 114 l12 -36" stroke="#8C7A3A" strokeWidth="4" strokeLinecap="round" />
      <circle cx="132" cy="70" r="6" fill="#FFF7E6" stroke="#2B1608" strokeWidth="2" />
      <circle cx="152" cy="76" r="6" fill="#FFF7E6" stroke="#2B1608" strokeWidth="2" />
      <circle cx="80" cy="84" r="46" fill="#F7D774" stroke="#B88A1C" strokeWidth="4" />
      <path d="M80 84 m0 -30 a30 30 0 1 1 -28 20 a20 20 0 1 1 20 -14 a10 10 0 1 1 -4 10" stroke="#C99A2E" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M118 96 q-10 18 -30 14" stroke="#2B1608" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  sourdough_king: (
    <g>
      <ellipse cx="80" cy="146" rx="70" ry="9" fill="#000" opacity="0.4" />
      <circle cx="80" cy="92" r="58" fill="#B5763C" stroke="#6E3F17" strokeWidth="5" />
      <path d="M38 76 q42 -22 84 0 M44 100 q36 -16 72 0" stroke="#E2B06D" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M44 34 l12 20 l12 -24 l12 24 l12 -24 l12 24 l12 -20 v26 h-72 z" fill="#F5C542" stroke="#9C7413" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="80" cy="44" r="5" fill="#E05A47" />
      <Face x={80} y={92} gap={34} size={9} mouthW={34} />
    </g>
  ),
  flour_dragon: (
    <g>
      <ellipse cx="80" cy="146" rx="70" ry="9" fill="#000" opacity="0.4" />
      <path d="M20 86 q-14 -40 22 -50 q-6 22 10 34 Z M140 86 q14 -40 -22 -50 q6 22 -10 34 Z" fill="#D9CBB4" stroke="#8A7656" strokeWidth="4" />
      <path d="M52 40 l-10 -26 l22 18 Z M108 40 l10 -26 l-22 18 Z" fill="#B59A6A" stroke="#6E5A36" strokeWidth="3" />
      <path d="M30 110 C30 60 52 38 80 38 C108 38 130 60 130 110 C130 134 108 144 80 144 C52 144 30 134 30 110 Z" fill="#F2EADB" stroke="#8A7656" strokeWidth="5" />
      <ellipse cx="80" cy="120" rx="30" ry="16" fill="#E3D5BC" />
      <circle cx="70" cy="118" r="4" fill="#6E5A36" />
      <circle cx="90" cy="118" r="4" fill="#6E5A36" />
      <Face x={80} y={86} gap={36} size={9} mouthW={0} fang={false} />
      <circle cx="40" cy="140" r="8" fill="#FFFFFF" opacity="0.6" />
      <circle cx="124" cy="138" r="10" fill="#FFFFFF" opacity="0.5" />
    </g>
  ),
};

/**
 * One monster of Hầm Bánh Mì, drawn in code: it sways while it waits, flashes
 * and jolts when hit (`hitKey` changes), and crumbles away when beaten.
 * Deeper floors shift its colours a little.
 */
export function Monster({
  kind,
  floor,
  hitKey,
  dead,
  reduce,
  size,
}: {
  kind: MonsterKind;
  floor: number;
  hitKey: number;
  dead: boolean;
  reduce: boolean;
  size: number;
}) {
  const shift = floor > 10 ? ((floor - 10) * 18) % 120 : 0;
  return (
    <motion.div
      key={`${kind}-${floor}`}
      initial={reduce ? false : { y: -40, opacity: 0, scale: 0.8 }}
      animate={dead ? { opacity: 0, scale: 0.6, rotate: -14, y: 30 } : { y: 0, opacity: 1, scale: 1, rotate: 0 }}
      transition={dead ? { duration: 0.45, ease: "easeIn" } : { type: "spring", stiffness: 260, damping: 18 }}
      style={{ width: size, height: size }}
    >
      <motion.div
        animate={reduce || dead ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className="h-full w-full"
      >
        <motion.svg
          key={hitKey}
          viewBox="0 0 160 160"
          width={size}
          height={size}
          aria-hidden="true"
          initial={reduce || hitKey === 0 ? false : { x: 0 }}
          animate={reduce || hitKey === 0 ? undefined : { x: [0, 10, -8, 4, 0] }}
          transition={{ duration: 0.28 }}
          style={{ filter: shift ? `hue-rotate(${shift}deg) saturate(1.15)` : undefined, overflow: "visible" }}
        >
          {ART[kind]}
          {hitKey > 0 && !reduce && (
            <motion.rect
              key={`flash-${hitKey}`}
              x="0"
              y="0"
              width="160"
              height="160"
              fill="#FFFFFF"
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ mixBlendMode: "screen" }}
            />
          )}
        </motion.svg>
      </motion.div>
    </motion.div>
  );
}
