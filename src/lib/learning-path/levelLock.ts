/**
 * Level locks and level gates (F7): what stops a learner and what opens it.
 * BreadTrans practice levels only, never CEFR; a gate is not an exam. No React,
 * no I/O.
 */
import type { PracticeLevel, PracticeSkill } from "./practiceLevel.ts";

export type PaidPlan = "PLUS" | "PRO";
export type LevelLock = { skill: PracticeSkill; level: PracticeLevel | null; requiredPlan: PaidPlan | null };

export type LevelProgress = { done: number; needed: number; neededAverage: number; average: number | null };

export type GateSkill = "LISTENING" | "READING";
export type GateClosedReason = "PROGRESS_ONLY" | "TOP_LEVEL" | "NO_QUESTIONS";

export type GateStatus = {
  skill: PracticeSkill;
  targetLevel: PracticeLevel | null;
  targetLabel: string | null;
  passPercent: number;
  cooldownHours: number;
  available: boolean;
  reason: GateClosedReason | null;
  questionCount: number;
  retryAt: string | null;
  openAttemptId: number | null;
};

export type GateQuestion = {
  id: number;
  quizId: number;
  text: string;
  options: string[];
  passage?: string;
  hasAudio: boolean;
};

export type GateAttempt = {
  attemptId: number;
  skill: GateSkill;
  level: PracticeLevel;
  levelLabel: string;
  passPercent: number;
  questions: GateQuestion[];
};

export type GateResult = {
  skill: GateSkill;
  level: PracticeLevel;
  levelLabel: string;
  correct: number;
  total: number;
  score: number;
  passed: boolean;
  passPercent: number;
  retryAt: string | null;
};

/** The lock of a list row. A plan counts only when the row is plan-locked too. */
export function levelLockOf(
  skill: PracticeSkill,
  item: { practiceLevel?: PracticeLevel | null; isLocked?: boolean; requiredPlan?: string },
): LevelLock {
  const plan = item.requiredPlan;
  return {
    skill,
    level: item.practiceLevel ?? null,
    requiredPlan: item.isLocked && (plan === "PLUS" || plan === "PRO") ? plan : null,
  };
}

const unitOf = (skill: PracticeSkill) => (skill === "SPEAKING" ? "câu luyện" : "bài");

/** "2/3 bài, trung bình 64%". */
export function progressLine(skill: PracticeSkill, progress: LevelProgress): string {
  const count = `${Math.min(progress.done, progress.needed)}/${progress.needed} ${unitOf(skill)}`;
  return progress.average === null ? count : `${count}, trung bình ${progress.average}%`;
}

/** "3 bài khác nhau, trung bình từ 70%". */
export function progressRule(skill: PracticeSkill, progress: LevelProgress): string {
  return `${progress.needed} ${unitOf(skill)} khác nhau, trung bình từ ${progress.neededAverage}%`;
}

export const parseGateSkill = (value: string | undefined): GateSkill | null => {
  const skill = value?.toUpperCase();
  return skill === "LISTENING" || skill === "READING" ? skill : null;
};

export const gateHref = (skill: PracticeSkill) => `/gate/${skill.toLowerCase()}`;
export const catalogHref = (skill: PracticeSkill) => `/${skill.toLowerCase()}`;

/** "14:30, 01/11", in the learner's own time zone. */
export function formatRetryAt(iso: string): string {
  const at = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(at.getHours())}:${pad(at.getMinutes())}, ${pad(at.getDate())}/${pad(at.getMonth() + 1)}`;
}

export function gateClosedMessage(reason: GateClosedReason | null): string {
  if (reason === "TOP_LEVEL") return "Bạn đã mở mức cao nhất của kỹ năng này.";
  if (reason === "PROGRESS_ONLY") return "Kỹ năng này mở mức bằng tiến độ luyện tập, không có bài mở khoá.";
  return "Mức này chưa đủ câu hỏi cho bài mở khoá. Bạn vẫn mở được bằng tiến độ luyện tập.";
}

export const unansweredCount = (questions: GateQuestion[], answers: Record<string, string>) =>
  questions.filter((q) => !answers[String(q.id)]).length;

const LEVEL_LISTS = new Set([
  "listeningPractices",
  "listening-practices",
  "reading-exercises",
  "speaking-exercises",
  "writing-topics",
]);

/** A finished attempt can open a level, which changes these cached answers. */
export function dependsOnLevel(queryKey: readonly unknown[]): boolean {
  const key = queryKey[0];
  return typeof key === "string" && (key.startsWith("learning-path") || LEVEL_LISTS.has(key));
}
