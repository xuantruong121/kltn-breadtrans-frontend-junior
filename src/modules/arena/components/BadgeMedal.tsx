import React from "react";
import { Crown, Flame, Heart, Mic, Shield, Star, Swords, Target, type LucideIcon } from "lucide-react";
import type { BadgeGroup } from "../badges";

/** One flat medal per badge: ribbon tails and a disc in the badge group's colour. */
export const BADGE_ICON: Record<string, LucideIcon> = {
  "Tân Binh": Shield,
  "Thợ Săn": Target,
  "Học Bá": Star,
  "Giọng Đọc Vàng": Mic,
  "Chăm Chỉ": Flame,
  "Siêu Sao": Crown,
  "Đấu Sĩ Bất Bại": Swords,
  "Chuyên Gia Nuôi Thú": Heart,
};

const GROUP_FILL: Record<BadgeGroup, { disc: string; rim: string; ribbon: string }> = {
  learning: { disc: "#2563eb", rim: "#1e40af", ribbon: "#60a5fa" },
  streak: { disc: "#d97706", rim: "#92400e", ribbon: "#fbbf24" },
  arena: { disc: "#e11d48", rim: "#9f1239", ribbon: "#fb7185" },
  pet: { disc: "#059669", rim: "#065f46", ribbon: "#34d399" },
};
const LOCKED = { disc: "#e2e8f0", rim: "#cbd5e1", ribbon: "#e2e8f0" };

export function BadgeMedal({
  name,
  group,
  earned,
  size = 64,
}: {
  name: string;
  group: BadgeGroup;
  earned: boolean;
  size?: number;
}) {
  const fill = earned ? GROUP_FILL[group] : LOCKED;
  const Icon = BADGE_ICON[name] ?? Star;
  return (
    <span className="relative inline-block" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <path d="M20 36l-6 24 10-5 6 7 4-24z" fill={fill.ribbon} />
        <path d="M44 36l6 24-10-5-6 7-4-24z" fill={fill.ribbon} />
        <circle cx="32" cy="27" r="22" fill={fill.rim} />
        <circle cx="32" cy="27" r="18" fill={fill.disc} />
      </svg>
      <Icon
        size={Math.round(size * 0.34)}
        strokeWidth={2.25}
        className={`absolute left-1/2 -translate-x-1/2 ${earned ? "text-white" : "text-slate-400"}`}
        style={{ top: size * 0.25 }}
      />
    </span>
  );
}
