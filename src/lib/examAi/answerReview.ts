/**
 * Wording of the AI answer review shown to admins. Pure, so it is unit tested
 * without rendering. Provider and model always come from the recorded step:
 * nothing here names a provider on its own.
 */

export type QuestionVerdict =
  | "AGREE"
  | "DISAGREE"
  | "AMBIGUOUS"
  | "UNANSWERABLE"
  | "EVIDENCE_NOT_FOUND"
  | "EVIDENCE_INSUFFICIENT"
  | "EXPLANATION_MISMATCH"
  | "REVIEW_INVALID";

export type GroupReviewStatus =
  | "REVIEWED_INDEPENDENT"
  | "REVIEWED_DEGRADED"
  | "NEEDS_ADMIN_CONFIRM"
  | "REJECTED"
  | "EDITED_BY_ADMIN"
  | "ADMIN_CONFIRMED"
  | "UNREVIEWED";

export type ConfirmationMethod =
  | "AFTER_VISION"
  | "MANUAL_NO_VISION"
  | "AFTER_DEGRADED_REVIEW"
  | "MANUAL_REVIEW";

export type ReviewStep = {
  provider: string | null;
  model: string | null;
  modelVendor: string | null;
  reviewKind: "INDEPENDENT" | "SAME_PROVIDER";
  status: "OK" | "INVALID" | "UNAVAILABLE";
  at: string;
  tried?: Array<{ provider: string; model: string; reason: string }>;
};

export type QuestionReview = {
  questionNumber: number;
  verdict: QuestionVerdict;
  solve?: { verdict: QuestionVerdict; detail: string };
  explanation?: { verdict: QuestionVerdict; detail: string };
  vision?: { verdict: QuestionVerdict; detail: string };
};

export type GroupReview = {
  status: GroupReviewStatus;
  contentHash: string;
  steps: {
    independentSolve?: ReviewStep;
    explanationCheck?: ReviewStep;
    part1VisionReview?: ReviewStep;
  };
  verdicts: QuestionReview[];
  edits?: Array<{ by: number; at: string; changes: Array<{ field: string }> }>;
  confirmed?: {
    by: number;
    at: string;
    contentHash: string;
    method: ConfirmationMethod;
    fromStatus: GroupReviewStatus;
  };
  history?: Array<{
    contentHash: string;
    status: GroupReviewStatus;
    staleAt: string;
    staleReason: string;
    verdicts: QuestionReview[];
  }>;
};

export type Tone = "positive" | "warning" | "error" | "neutral";

export const STATUS_LABEL: Record<GroupReviewStatus, { label: string; tone: Tone }> = {
  REVIEWED_INDEPENDENT: { label: "Đáp án đã kiểm định độc lập", tone: "positive" },
  REVIEWED_DEGRADED: {
    label: "Kiểm định cùng hãng, cần admin xác nhận",
    tone: "warning",
  },
  NEEDS_ADMIN_CONFIRM: { label: "Cần admin xác nhận", tone: "warning" },
  REJECTED: { label: "Bị bác bỏ", tone: "error" },
  EDITED_BY_ADMIN: { label: "Admin đã sửa", tone: "neutral" },
  ADMIN_CONFIRMED: { label: "Admin đã xác nhận", tone: "positive" },
  UNREVIEWED: { label: "Chưa kiểm định", tone: "warning" },
};

export const VERDICT_LABEL: Record<QuestionVerdict, string> = {
  AGREE: "Khớp đáp án",
  DISAGREE: "Người giải độc lập chọn đáp án khác",
  AMBIGUOUS: "Có hơn một đáp án đúng",
  UNANSWERABLE: "Ngữ liệu không đủ để trả lời",
  EVIDENCE_NOT_FOUND: "Trích dẫn không có trong ngữ liệu",
  EVIDENCE_INSUFFICIENT: "Trích dẫn chưa đủ chứng minh đáp án",
  EXPLANATION_MISMATCH: "Giải thích không khớp đáp án",
  REVIEW_INVALID: "Kết quả kiểm định không hợp lệ",
};

export const CONFIRMATION_LABEL: Record<ConfirmationMethod, string> = {
  AFTER_VISION: "Xác nhận sau kiểm tra Vision",
  MANUAL_NO_VISION: "Xác nhận thủ công, không có kiểm tra Vision",
  AFTER_DEGRADED_REVIEW: "Xác nhận sau kiểm định cùng hãng",
  MANUAL_REVIEW: "Xác nhận thủ công, không có kiểm định AI",
};

const PROVIDER_NAME: Record<string, string> = {
  cloudflare: "Cloudflare",
  gemini: "Gemini",
  "openai-compatible": "OpenAI-compatible",
};

/** "Cloudflare gpt-oss-120b": the provider, then the model without its path. */
export function providerModel(step: Pick<ReviewStep, "provider" | "model">) {
  const provider = step.provider
    ? (PROVIDER_NAME[step.provider] ?? step.provider)
    : "không rõ nhà cung cấp";
  const model = (step.model ?? "").replace(/^@cf\/[^/]+\//, "").trim();
  return model ? `${provider} ${model}` : provider;
}

function stepFailure(step: ReviewStep) {
  return step.status === "UNAVAILABLE"
    ? "nhà cung cấp tạm thời không khả dụng"
    : "kết quả trả về không hợp lệ";
}

/** One line per review step that ran, each with its real provider and model. */
export function provenanceLines(review: GroupReview | null | undefined): string[] {
  if (!review) return [];
  const lines: string[] = [];
  const solve = review.steps.independentSolve;
  if (solve)
    lines.push(
      solve.status !== "OK"
        ? `Đáp án: chưa kiểm định được (${stepFailure(solve)})`
        : solve.reviewKind === "INDEPENDENT"
          ? `Đáp án: kiểm định độc lập bởi ${providerModel(solve)}`
          : `Đáp án: kiểm tra bởi ${providerModel(solve)}, cùng hãng với model sinh đề, cần admin xác nhận`,
    );
  const explanation = review.steps.explanationCheck;
  if (explanation)
    lines.push(
      explanation.status !== "OK"
        ? `Giải thích: chưa kiểm tra được (${stepFailure(explanation)})`
        : explanation.reviewKind === "INDEPENDENT"
          ? `Giải thích: kiểm tra bởi ${providerModel(explanation)}, khác hãng với model sinh đề`
          : `Giải thích: kiểm tra bởi ${providerModel(explanation)}, cùng hãng với model sinh đề`,
    );
  const vision = review.steps.part1VisionReview;
  if (vision)
    lines.push(
      vision.status !== "OK"
        ? `Ảnh Part 1: chưa kiểm tra được bằng Vision (${stepFailure(vision)})`
        : `Ảnh Part 1: ${providerModel(vision)} Vision, cần admin xác nhận`,
    );
  if (review.confirmed)
    lines.push(`${CONFIRMATION_LABEL[review.confirmed.method]}`);
  return lines;
}

/** The detail of the first check that did not agree, for one question. */
export function verdictDetail(row: QuestionReview): string {
  const part = [row.solve, row.explanation, row.vision].find(
    (item) => item && item.verdict !== "AGREE",
  );
  return part?.detail ?? VERDICT_LABEL[row.verdict];
}

/**
 * The confirmation a group allows, or null. Part 1 is confirmed on the Draft;
 * a Part 2-7 group interrupted by an outage is retried, not confirmed.
 */
export function confirmationFor(
  part: number,
  review: GroupReview | null | undefined,
): ConfirmationMethod | null {
  const status = review?.status ?? "UNREVIEWED";
  const steps = review?.steps ?? {};
  if (part === 1) {
    if (status === "NEEDS_ADMIN_CONFIRM") return "AFTER_VISION";
    if (status === "UNREVIEWED" && steps.part1VisionReview?.status !== "OK")
      return "MANUAL_NO_VISION";
    return null;
  }
  if (status === "REVIEWED_DEGRADED") return "AFTER_DEGRADED_REVIEW";
  if (status === "UNREVIEWED" && Object.keys(steps).length === 0)
    return "MANUAL_REVIEW";
  return null;
}

const SKIP_REASON: Record<string, string> = {
  UNREVIEWED: "chưa kiểm định",
  REJECTED: "bị bác bỏ",
  REVIEWED_DEGRADED: "kiểm định cùng hãng, cần xác nhận",
  NEEDS_ADMIN_CONFIRM: "cần admin xác nhận",
  HASH_MISMATCH: "nội dung đã đổi sau lần kiểm định",
  REVIEW_INCOMPLETE: "kiểm định chưa hoàn tất",
  CONFIRMATION_INVALID: "xác nhận không hợp lệ",
};

/** Why Apply held a group back, in words. */
export function skipReasonLabel(reason: string): string {
  if (reason.startsWith("STRUCTURE_INVALID"))
    return `lỗi cấu trúc${reason.includes(":") ? `: ${reason.split(":").slice(1).join(":").trim()}` : ""}`;
  return SKIP_REASON[reason] ?? reason;
}
