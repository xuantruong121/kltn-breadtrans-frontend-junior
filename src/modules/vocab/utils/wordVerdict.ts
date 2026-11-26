import type {
  ReviewEvidence,
  SpeakingResult,
  SrsGrade,
} from "@/lib/api/services/vocab.service";
import { formatReviewInterval } from "./reviewInterval.ts";

/**
 * What the flashcard room remembers about one word while the learner goes
 * through its steps (thesis supervisor 2026-11-26: the system grades the
 * word, the learner no longer rates themselves). The server decides the grade
 * from it (review-grade.logic in the backend); this file only records the
 * steps and says the result.
 */
export interface StepEvidence {
  /** The first answer counts: going back through the tabs cannot change it. */
  quiz: "CORRECT" | "WRONG" | null;
  typing: "CORRECT" | "WRONG" | null;
  typingHints: number;
  speaking: SpeakingResult | null;
  /** "Kiểm tra nhanh": the learner said they know the word; no speaking step. */
  quickCheck: boolean;
}

export const NO_EVIDENCE: StepEvidence = {
  quiz: null,
  typing: null,
  typingHints: 0,
  speaking: null,
  quickCheck: false,
};

export function withQuiz(e: StepEvidence, correct: boolean): StepEvidence {
  return e.quiz !== null ? e : { ...e, quiz: correct ? "CORRECT" : "WRONG" };
}

export function withTyping(e: StepEvidence, correct: boolean, hints: number): StepEvidence {
  return e.typing !== null
    ? e
    : { ...e, typing: correct ? "CORRECT" : "WRONG", typingHints: Math.max(0, Math.floor(hints)) };
}

/** A real pass stays: saying it wrong after saying it right changes nothing. */
export function withSpeaking(e: StepEvidence, result: SpeakingResult): StepEvidence {
  return e.speaking === "PASSED" ? e : { ...e, speaking: result };
}

export function withQuickCheck(e: StepEvidence): StepEvidence {
  return { ...e, quickCheck: true };
}

/** What the server is told: a step never reached was skipped. */
export function toReviewEvidence(e: StepEvidence): ReviewEvidence {
  return {
    quiz: e.quiz ?? "SKIPPED",
    typing: e.typing ?? "SKIPPED",
    typingHints: e.typingHints,
    speaking: e.quickCheck ? "SKIPPED" : (e.speaking ?? "SKIPPED"),
    quickCheck: e.quickCheck,
  };
}

export const GRADE_LABEL: Record<SrsGrade, string> = {
  AGAIN: "Học lại",
  HARD: "Khó",
  GOOD: "Tốt",
  EASY: "Dễ",
};

/** "Khó · ôn lại sau 1 ngày"; a word to relearn comes back in this session. */
export function verdictHeadline(grade: SrsGrade, intervalDays: number | undefined): string {
  if (grade === "AGAIN") return "Học lại · từ này quay lại cuối phiên";
  return `${GRADE_LABEL[grade]} · ôn lại sau ${formatReviewInterval(intervalDays ?? 0)}`;
}

export type StepTone = "ok" | "warn" | "miss" | "none";
export interface StepLine {
  label: string;
  text: string;
  tone: StepTone;
}

/** One line per step, in the order the learner went through them. */
export function stepLines(e: ReviewEvidence): StepLine[] {
  const quiz: StepLine =
    e.quiz === "CORRECT"
      ? { label: "Trắc nghiệm", text: "đúng", tone: "ok" }
      : e.quiz === "WRONG"
        ? { label: "Trắc nghiệm", text: "chọn sai", tone: "miss" }
        : { label: "Trắc nghiệm", text: "bỏ qua", tone: "miss" };
  const typing: StepLine =
    e.typing === "CORRECT"
      ? e.typingHints > 0
        ? { label: "Gõ từ", text: `đúng, dùng ${e.typingHints} gợi ý`, tone: "warn" }
        : { label: "Gõ từ", text: "đúng", tone: "ok" }
      : e.typing === "WRONG"
        ? { label: "Gõ từ", text: "gõ sai", tone: "miss" }
        : { label: "Gõ từ", text: "bỏ qua", tone: "miss" };
  const speaking: StepLine = e.quickCheck
    ? { label: "Phát âm", text: "không cần (kiểm tra nhanh)", tone: "none" }
    : e.speaking === "PASSED"
      ? { label: "Phát âm", text: "chính xác", tone: "ok" }
      : e.speaking === "FAILED"
        ? { label: "Phát âm", text: "chưa chính xác", tone: "warn" }
        : e.speaking === "UNAVAILABLE"
          ? { label: "Phát âm", text: "không dùng được micro", tone: "none" }
          : { label: "Phát âm", text: "bỏ qua", tone: "none" };
  return [quiz, typing, speaking];
}
