import {
  Activity,
  Bell,
  Croissant,
  Crown,
  Flag,
  Flame,
  Gift,
  Layers,
  Lightbulb,
  ShieldCheck,
  ShoppingBag,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

import { notificationIconKey, type NotificationIconKey } from "@/lib/notifications/notificationLogic";

const ICONS: Record<NotificationIconKey, LucideIcon> = {
  flashcard: Layers,
  streak: Flame,
  shield: ShieldCheck,
  report: Activity,
  plan: Crown,
  gift: Gift,
  shop: ShoppingBag,
  message: Croissant,
  suggestion: Lightbulb,
  issue: Flag,
  other: Bell,
};

/** The icon of a notification, by its type (glossary.ts). */
export function NotificationIcon({ type, ...props }: { type: string } & LucideProps) {
  const Icon = ICONS[notificationIconKey(type)];
  return <Icon aria-hidden="true" {...props} />;
}

export default NotificationIcon;
