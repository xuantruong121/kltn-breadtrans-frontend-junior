/**
 * Display logic for FOUR_SKILL_OBSERVED_V3 results. Pure: no React, no API.
 *
 * Three ideas stay separate on the page: how hard a question was designed to
 * be (difficulty tier 1-4, an authoring hypothesis), what the learner did on
 * this test (observed score), and what to practise next (advice). None of
 * them is a CEFR level or an official exam score.
 */

type Skill = { correct: number; total: number; score: number | null; weight: number };
type Task = { order: number; status: string; score: number | null; weight: number };
type Productive = { tasks: Task[]; graded: number; total: number };
export type ObservedLike = {
  listening: Skill;
  reading: Skill;
  speaking: Productive;
  writing: Productive;
  objectiveCore: number | null;
  observed: {
    score: number | null;
    denominator: number;
    withheldReason: null | string;
  };
};

/** One decimal, Vietnamese decimal comma. */
export function formatNumber(value: number): string {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

export function formatPercentWeight(weight: number): string {
  return `${formatNumber(weight * 100)}%`;
}

export type CoverageView = {
  label: string;
  tone: "done" | "pending" | "missing";
  /** Shown under the skill when the evidence is limited or absent. */
  notice: string | null;
};

/** 0/2 "Chưa đánh giá"; 1/2 limited evidence; 2/2 full. */
export function describeCoverage(skillName: string, graded: number, total: number): CoverageView {
  if (total === 0 || graded === 0)
    return {
      label: "Chưa đánh giá",
      tone: "missing",
      notice: `Không có bài ${skillName} nào được chấm, nên kỹ năng này chưa có điểm và không được tính vào điểm tổng. Đây không phải điểm 0.`,
    };
  if (graded < total)
    return {
      label: `Đánh giá ${graded}/${total} bài`,
      tone: "pending",
      notice: `Điểm ${skillName} chỉ dựa trên ${graded}/${total} bài nên bằng chứng còn hạn chế; hãy xem đây là tín hiệu ban đầu.`,
    };
  return { label: `Đủ ${graded}/${total} bài`, tone: "done", notice: null };
}

/** Why the observed score is not shown yet; null when it is shown. */
export function withheldMessage(reason: string | null): string | null {
  switch (reason) {
    case null:
      return null;
    case "PRODUCTIVE_PENDING":
      return "Một bài Nói hoặc Viết đang được chấm. Điểm tổng sẽ hiển thị khi chấm xong; trang tự cập nhật.";
    case "PRODUCTIVE_FAILED":
      return "Một bài Nói hoặc Viết chưa chấm được. Bài làm vẫn được lưu; hãy bấm Chấm lại ở bài đó. Điểm tổng chưa hiển thị để không bị sai lệch.";
    default:
      return "Phần Nghe hoặc Đọc chưa đủ câu trả lời để tính điểm tổng.";
  }
}

/** Authored difficulty tiers D1-D4: a design hypothesis, never a level. */
export function formatDifficulty(key: string): string {
  const match = /^D([1-4])$/.exec(key);
  return match ? `Độ khó ${match[1]}/4` : "Chưa phân loại độ khó";
}

const SUBSKILL_LABELS: Record<string, string> = {
  gist: "Nắm ý chung",
  "main idea": "Ý chính",
  inference: "Suy luận",
  purpose: "Mục đích",
  "speaker intention": "Ý định người nói",
  "specific detail": "Chi tiết cụ thể",
  "meaning in context": "Nghĩa theo ngữ cảnh",
  reference: "Từ thay thế (quy chiếu)",
  grammar: "Ngữ pháp",
  vocabulary: "Từ vựng",
  UNSPECIFIED: "Chưa phân loại",
};

export function formatSubskill(key: string): string {
  return SUBSKILL_LABELS[key] ?? key;
}

export type ExplanationLine = { label: string; value: string; counted: boolean };

/**
 * The "Điểm được tính như thế nào?" breakdown from the result itself: every
 * term of the numerator, the denominator and why a task is left out.
 */
export function explainObservedScore(result: ObservedLike): {
  lines: ExplanationLine[];
  denominator: string;
  outcome: string;
} {
  const lines: ExplanationLine[] = [];
  for (const [label, skill] of [
    ["Nghe", result.listening],
    ["Đọc", result.reading],
  ] as const) {
    lines.push({
      label: `${label} (${skill.correct}/${skill.total} câu đúng)`,
      value:
        skill.score === null
          ? "chưa đủ câu để tính"
          : `${formatNumber(skill.score)} × ${formatPercentWeight(skill.weight)}`,
      counted: skill.score !== null,
    });
  }
  for (const [label, skill] of [
    ["Nói", result.speaking],
    ["Viết", result.writing],
  ] as const) {
    for (const task of skill.tasks) {
      const name = `${label} – bài ${task.order}`;
      const value =
        task.status === "GRADED" && task.score !== null
          ? `${formatNumber(task.score)} × ${formatPercentWeight(task.weight)}`
          : task.status === "SKIPPED" || task.status === "NOT_ATTEMPTED"
            ? "bỏ qua – không tính điểm, không tính trọng số"
            : task.status === "GRADING_FAILED"
              ? "chấm chưa thành công – chưa tính"
              : "đang chấm – chưa tính";
      lines.push({ label: name, value, counted: task.status === "GRADED" && task.score !== null });
    }
  }
  const graded = result.speaking.graded + result.writing.graded;
  const denominator = `35% + 35% + 7,5% × ${graded} bài đã chấm = ${formatPercentWeight(result.observed.denominator)}`;
  const outcome =
    result.observed.score !== null
      ? `Điểm quan sát = tổng các dòng được tính ÷ ${formatPercentWeight(result.observed.denominator)} = ${formatNumber(result.observed.score)}/100`
      : (withheldMessage(result.observed.withheldReason) ?? "");
  return { lines, denominator, outcome };
}
