/**
 * The result page of a listening, reading or exam submission (owner
 * 2026-11-12: explanations were 12 px, the page left wide empty margins and
 * showed the stored English title). The page renders what these functions
 * return; nothing here touches React or the network.
 */
import { formatReadingValue, resolveReadingCorrectAnswer } from "../../lib/reading/readingQuizUtils.ts";
import { readingSubskillLabel } from "../reading/readingTrackingLogic.ts";
import { parseQuestionExplanation, type ParsedExplanation } from "../listening/listeningExplanationUtils.ts";
import { quizDisplayTitle } from "../../lib/catalog/displayTitles.ts";

export type ResultKind = "listening" | "reading" | "exam";
export type RowFilter = "all" | "wrong" | "right";
/** "blank": the submission holds no answer for the question. */
export type RowStatus = "right" | "wrong" | "blank";

export type ReviewRow = {
  questionId: number;
  /** 1-based position in the submission. */
  number: number;
  prompt: string;
  /** The learner's answer as text; null when the question was left blank. */
  answer: string | null;
  correctAnswer: string | null;
  isCorrect: boolean;
  status: RowStatus;
  translation: string | null;
  skill: string | null;
  explanation: ParsedExplanation | null;
};

type AnalyticsLike = {
  quizId: number;
  quizTitle: string;
  quizType?: string;
  questions?: any[];
  results?: any[];
};

export function resultKind(analytics: AnalyticsLike): ResultKind {
  if (analytics.quizType === "BILINGUAL_READING") return "reading";
  const listening = (analytics.questions ?? []).some(
    (question) =>
      question?.type === "DICTATION" ||
      question?.content?.audioText ||
      Array.isArray(question?.content?.transcriptSegments),
  );
  return listening ? "listening" : "exam";
}

/** The Vietnamese title the catalog and the practice room show. */
export function resultTitle(analytics: AnalyticsLike): string {
  return quizDisplayTitle(analytics.quizId, analytics.quizTitle);
}

const PROMPT_FALLBACK: Record<ResultKind, string> = {
  listening: "Nghe đoạn âm thanh và chọn đáp án",
  reading: "Đọc đoạn văn và chọn đáp án",
  exam: "Chọn đáp án đúng",
};

/**
 * The learner's answer as text. Older submissions store the chosen option as
 * { selectedIndex }; current ones store the option text.
 */
export function answerText(answer: unknown, options: unknown): string | null {
  if (answer && typeof answer === "object" && Array.isArray(options)) {
    const index = (answer as Record<string, unknown>).selectedIndex;
    if (Number.isInteger(index) && (index as number) >= 0 && (index as number) < options.length) {
      const option = options[index as number];
      if (typeof option === "string" && option.trim()) return option.trim();
    }
  }
  const text = formatReadingValue(answer, "");
  return text ? text : null;
}

export function reviewRows(analytics: AnalyticsLike): ReviewRow[] {
  const kind = resultKind(analytics);
  return (analytics.questions ?? []).map((question, index) => {
    const result = (analytics.results ?? []).find(
      (entry) => Number(entry?.questionId) === Number(question?.id),
    );
    const content = question?.content ?? {};
    const correct = resolveReadingCorrectAnswer(content);
    const translation =
      typeof content.translation === "string" && content.translation.trim()
        ? content.translation.trim()
        : null;
    const answer = answerText(result?.answer, content.options);
    const isCorrect = result?.isCorrect === true;
    const skillKey = kind === "reading" ? content.questionType || content.microSkill : null;
    return {
      questionId: Number(question?.id),
      number: index + 1,
      prompt:
        typeof content.text === "string" && content.text.trim()
          ? content.text.trim()
          : PROMPT_FALLBACK[kind],
      answer,
      correctAnswer: correct.available ? correct.answer : null,
      isCorrect,
      status: isCorrect ? "right" : answer === null ? "blank" : "wrong",
      translation,
      skill: skillKey ? readingSubskillLabel(String(skillKey)) : null,
      explanation: parseQuestionExplanation(content.explanation),
    };
  });
}

export function reviewCounts(rows: ReviewRow[]) {
  const count = (status: RowStatus) => rows.filter((row) => row.status === status).length;
  return { all: rows.length, right: count("right"), wrong: count("wrong"), blank: count("blank") };
}

/** "Câu sai" also lists blank questions: both are what the learner reviews next. */
export function filterRows(rows: ReviewRow[], filter: RowFilter): ReviewRow[] {
  if (filter === "wrong") return rows.filter((row) => row.status !== "right");
  if (filter === "right") return rows.filter((row) => row.status === "right");
  return rows;
}

/** The label of the review button: "câu sai", or "câu chưa đúng" when blanks are in it. */
export function reviewButtonLabel(counts: ReturnType<typeof reviewCounts>): string {
  const n = counts.wrong + counts.blank;
  return counts.blank > 0 ? `Ôn lại ${n} câu chưa đúng` : `Ôn lại ${n} câu sai`;
}

export function resultLabels(kind: ResultKind) {
  return {
    listening: {
      skill: "Luyện nghe",
      back: "Danh sách bài nghe",
      other: "Chọn bài nghe khác",
      evidence: "Câu nghe được",
      savedNote: "Chỉ số luyện nghe và kế hoạch hôm nay đã cập nhật theo kết quả này.",
    },
    reading: {
      skill: "Luyện đọc",
      back: "Danh sách bài đọc",
      other: "Chọn bài đọc khác",
      evidence: "Câu trong bài",
      savedNote: null,
    },
    exam: {
      skill: "Đề thi",
      back: "Danh sách đề thi",
      other: "Chọn đề khác",
      evidence: "Căn cứ",
      savedNote: null,
    },
  }[kind];
}

/** The anchor of a question card, used by the question strip. */
export const questionAnchor = (number: number) => `cau-${number}`;
