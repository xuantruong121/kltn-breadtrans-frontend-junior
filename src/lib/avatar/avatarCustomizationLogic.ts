export interface AvatarFrameConfig {
  key: "frame-orange" | "frame-crown" | "frame-cyber";
  name: string;
  svgUrl: string;
  containerRingClass: string;
  fallbackBgClass: string;
}

/** Lucide icons a system badge is drawn with (components/ui/BadgeGlyph.tsx). */
export type BadgeIconName = "shield" | "flame" | "crown" | "zap" | "star" | "swords" | "mic" | "paw" | "heart" | "medal";

export interface UserBadgeConfig {
  key: string;
  name: string;
  type: "svg" | "icon";
  /** SVG asset path, or a BadgeIconName. Never an emoji (anti-slop rule). */
  content: string;
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

  // 3. Arena & System Badges (drawn as lucide icons by BadgeGlyph)
  const arenaMap: Record<string, { name: string; icon: BadgeIconName }> = {
    badge_1: { name: "Tân Binh", icon: "shield" },
    "tân binh": { name: "Tân Binh", icon: "shield" },
    badge_2: { name: "Chăm Chỉ", icon: "flame" },
    "chăm chỉ": { name: "Chăm Chỉ", icon: "flame" },
    badge_3: { name: "Siêu Sao", icon: "crown" },
    "siêu sao": { name: "Siêu Sao", icon: "crown" },
    badge_4: { name: "Thợ Săn", icon: "zap" },
    "thợ săn": { name: "Thợ Săn", icon: "zap" },
    badge_5: { name: "Học Bá", icon: "star" },
    "học bá": { name: "Học Bá", icon: "star" },
    badge_6: { name: "Đấu Sĩ Bất Bại", icon: "swords" },
    "đấu sĩ bất bại": { name: "Đấu Sĩ Bất Bại", icon: "swords" },
    item_badge_champion: { name: "Đấu Sĩ Bất Bại", icon: "swords" },
    badge_7: { name: "Giọng Đọc Vàng", icon: "mic" },
    "giọng đọc vàng": { name: "Giọng Đọc Vàng", icon: "mic" },
    badge_8: { name: "Chuyên Gia Nuôi Thú", icon: "paw" },
    "chuyên gia nuôi thú": { name: "Chuyên Gia Nuôi Thú", icon: "paw" },
  };

  const matched = arenaMap[raw];
  if (matched) {
    return {
      key: raw,
      name: matched.name,
      type: "icon",
      content: matched.icon,
    };
  }

  return {
    key: raw,
    name: String(badgeId),
    type: "icon",
    content: "medal",
  };
}
