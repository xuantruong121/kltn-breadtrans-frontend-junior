export interface AvatarFrameConfig {
  key: "frame-orange" | "frame-crown" | "frame-cyber";
  name: string;
  svgUrl: string;
  containerRingClass: string;
  fallbackBgClass: string;
}

export interface UserBadgeConfig {
  key: string;
  name: string;
  type: "svg" | "emoji";
  content: string; // SVG asset path or emoji character
}

/**
 * Normalizes any frame identifier (slug, database numeric ID, legacy item key)
 * to a canonical AvatarFrameConfig.
 */
export function resolveAvatarFrame(frameId?: string | number | null): AvatarFrameConfig | null {
  if (!frameId) return null;
  const raw = String(frameId).trim().toLowerCase();

  // 1. Khung avatar Cam
  if (
    raw === "frame-orange" ||
    raw === "2" ||
    raw === "item_avatar_orange" ||
    raw.includes("orange") ||
    raw.includes("cam")
  ) {
    return {
      key: "frame-orange",
      name: "Khung avatar Cam",
      svgUrl: "/images/market/frame-orange.svg",
      containerRingClass: "border-2 border-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.45)] ring-2 ring-orange-500/40",
      fallbackBgClass: "bg-gradient-to-tr from-amber-500 to-orange-500 text-white",
    };
  }

  // 2. Khung avatar Vương Miện Quán Quân
  if (
    raw === "frame-crown" ||
    raw === "7" ||
    raw === "item_avatar_crown" ||
    raw.includes("crown") ||
    raw.includes("vuong-mien") ||
    raw.includes("quán quân")
  ) {
    return {
      key: "frame-crown",
      name: "Khung avatar Vương Miện Quán Quân",
      svgUrl: "/images/market/frame-crown.svg",
      containerRingClass: "border-2 border-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/40",
      fallbackBgClass: "bg-gradient-to-tr from-amber-600 to-yellow-500 text-white",
    };
  }

  // 3. Khung avatar Cyber Tech
  if (
    raw === "frame-cyber" ||
    raw === "8" ||
    raw === "item_avatar_cyber" ||
    raw.includes("cyber") ||
    raw.includes("tech")
  ) {
    return {
      key: "frame-cyber",
      name: "Khung avatar Cyber Tech",
      svgUrl: "/images/market/frame-cyber.svg",
      containerRingClass: "border-2 border-cyan-400 shadow-[0_0_14px_rgba(6,182,212,0.55)] ring-2 ring-cyan-500/40",
      fallbackBgClass: "bg-gradient-to-tr from-cyan-950 via-slate-900 to-cyan-900 text-cyan-200",
    };
  }

  return null;
}

/**
 * Normalizes any badge identifier (slug, database ID, arena key, Vietnamese name)
 * to a canonical UserBadgeConfig.
 */
export function resolveUserBadge(badgeId?: string | number | null): UserBadgeConfig | null {
  if (!badgeId) return null;
  const raw = String(badgeId).trim().toLowerCase();

  // 1. Huy hiệu Ngôi Sao (Market Product ID 1)
  if (
    raw === "badge-star" ||
    raw === "1" ||
    raw === "item_badge_star" ||
    raw.includes("ngôi sao") ||
    raw.includes("ngoi-sao")
  ) {
    return {
      key: "badge-star",
      name: "Huy hiệu Ngôi Sao",
      type: "svg",
      content: "/images/market/badge-star.svg",
    };
  }

  // 2. Huy hiệu Bậc Thầy Từ Vựng (Market Product ID 6)
  if (
    raw === "badge-master" ||
    raw === "6" ||
    raw === "item_badge_master" ||
    raw.includes("bậc thầy") ||
    raw.includes("bac-thay")
  ) {
    return {
      key: "badge-master",
      name: "Huy hiệu Bậc Thầy Từ Vựng",
      type: "svg",
      content: "/images/market/badge-master.svg",
    };
  }

  // 3. Arena & System Badges (mapped to high-fidelity glyphs)
  const arenaMap: Record<string, { name: string; emoji: string }> = {
    badge_1: { name: "Tân Binh", emoji: "🛡️" },
    "tân binh": { name: "Tân Binh", emoji: "🛡️" },
    badge_2: { name: "Chăm Chỉ", emoji: "🔥" },
    "chăm chỉ": { name: "Chăm Chỉ", emoji: "🔥" },
    badge_3: { name: "Siêu Sao", emoji: "👑" },
    "siêu sao": { name: "Siêu Sao", emoji: "👑" },
    badge_4: { name: "Thợ Săn", emoji: "⚡" },
    "thợ săn": { name: "Thợ Săn", emoji: "⚡" },
    badge_5: { name: "Học Bá", emoji: "⭐" },
    "học bá": { name: "Học Bá", emoji: "⭐" },
    badge_6: { name: "Đấu Sĩ Bất Bại", emoji: "⚔️" },
    "đấu sĩ bất bại": { name: "Đấu Sĩ Bất Bại", emoji: "⚔️" },
    item_badge_champion: { name: "Đấu Sĩ Bất Bại", emoji: "⚔️" },
    badge_7: { name: "Giọng Đọc Vàng", emoji: "🎙️" },
    "giọng đọc vàng": { name: "Giọng Đọc Vàng", emoji: "🎙️" },
    badge_8: { name: "Chuyên Gia Nuôi Thú", emoji: "💖" },
    "chuyên gia nuôi thú": { name: "Chuyên Gia Nuôi Thú", emoji: "💖" },
  };

  const matched = arenaMap[raw];
  if (matched) {
    return {
      key: raw,
      name: matched.name,
      type: "emoji",
      content: matched.emoji,
    };
  }

  return {
    key: raw,
    name: String(badgeId),
    type: "emoji",
    content: "🎖️",
  };
}
