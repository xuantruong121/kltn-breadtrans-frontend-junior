/**
 * One name and one icon for each thing BreadTrans shows (owner 2026-11-12).
 * uiConsistency.test.ts fails when the source writes one of these another
 * way. Change a name or an icon here, and the test with it.
 */
import {
  Activity,
  Bell,
  BookOpen,
  BookOpenCheck,
  Croissant,
  Crown,
  Flame,
  Headphones,
  Keyboard,
  Layers,
  ListChecks,
  Medal,
  Mic,
  NotebookPen,
  PawPrint,
  PenTool,
  ShieldCheck,
  ShoppingBag,
  Swords,
  Target,
  Trophy,
  Wheat,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { Concept } from "./terms";

export { TERMS, planName } from "./terms";
export type { Concept } from "./terms";

/** The icon of each concept. Concepts without an icon of their own are left out. */
export const CONCEPT_ICONS: Partial<Record<Concept, LucideIcon>> = {
  currency: Wheat,
  streak: Flame,
  streakShield: ShieldCheck,
  learnerPoints: Zap,
  petPoints: Zap,
  assistant: Croissant,
  listening: Headphones,
  speaking: Mic,
  reading: BookOpen,
  writing: PenTool,
  dictation: Keyboard,
  flashcard: Layers,
  grammar: BookOpenCheck,
  exams: Target,
  quests: ListChecks,
  pet: PawPrint,
  arena: Swords,
  shop: ShoppingBag,
  ranking: Trophy,
  badge: Medal,
  mistakes: NotebookPen,
  notifications: Bell,
  progress: Activity,
  planPlus: Crown,
  planPro: Crown,
};
