import { Crown, Flame, Heart, Medal, Mic, PawPrint, Shield, Star, Swords, Zap, type LucideIcon } from "lucide-react";

import type { BadgeIconName, UserBadgeConfig } from "@/lib/avatar/avatarCustomizationLogic";

const BADGE_ICONS: Record<BadgeIconName, LucideIcon> = {
  shield: Shield,
  flame: Flame,
  crown: Crown,
  zap: Zap,
  star: Star,
  swords: Swords,
  mic: Mic,
  paw: PawPrint,
  heart: Heart,
  medal: Medal,
};

/** A badge as a picture (shop badges) or as a lucide icon (system badges); never an emoji. */
export function BadgeGlyph({ badge, className = "size-4", imgClassName = "size-4 object-contain" }: {
  badge: UserBadgeConfig;
  className?: string;
  imgClassName?: string;
}) {
  if (badge.type === "svg") return <img src={badge.content} alt="" className={imgClassName} />;
  const Icon = BADGE_ICONS[badge.content as BadgeIconName] ?? Medal;
  return <Icon className={`${className} text-amber-600 dark:text-amber-400`} strokeWidth={2.25} aria-hidden="true" />;
}

export default BadgeGlyph;
