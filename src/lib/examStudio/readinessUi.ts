export type ReadinessIssueForUi = {
  humanMessage?: string;
  message?: string;
  code?: string;
  groupId?: number;
  questionId?: number;
};

const IMAGE_ISSUE_CODES = ["MISSING_IMAGE", "STALE_IMAGE", "STALE_IMAGE_QUESTION"];

/**
 * The missing-picture banner. It says the questions are complete only when
 * pictures are all that is left (QA 2026-11-22: an exam with no question at
 * all read "Câu hỏi và đáp án vẫn đầy đủ").
 */
export function missingImageNote(
  missingCount: number,
  issues: Array<Pick<ReadinessIssueForUi, "code">>,
): string {
  const onlyImages =
    issues.length > 0 && issues.every((issue) => IMAGE_ISSUE_CODES.includes(issue.code ?? ""));
  return onlyImages
    ? `Còn thiếu ${missingCount} ảnh. Câu hỏi và đáp án đã đủ; đề xuất bản được khi đủ ảnh.`
    : `Còn thiếu ${missingCount} ảnh.`;
}

/**
 * The Part the editor opens on, from ?part= ("Mở trình soạn Part 5" on the
 * outline used to land on Part 1). Anything else opens Part 1, as before.
 */
export function partFromUrl(value: string | null): number {
  const part = Number(value);
  return Number.isInteger(part) && part >= 1 && part <= 7 ? part : 1;
}

export function getPublishReadinessUi(
  learnerReady: boolean | undefined,
  issueCount: number,
) {
  const canPublish = learnerReady === true;
  // No content issue was reported: what still blocks is a missing task.
  if (!canPublish && issueCount === 0)
    return {
      canPublish,
      label: "Chưa thể xuất bản",
      helpText: "Hãy soạn đủ các câu Speaking và Writing trước.",
    };
  const outstandingLabel =
    issueCount === 1
      ? "Còn 1 mục cần hoàn thiện"
      : `Còn ${issueCount} mục cần hoàn thiện`;

  return {
    canPublish,
    label: canPublish ? "Xuất bản đề thi" : outstandingLabel,
    helpText: canPublish
      ? undefined
      : 'Hoàn tất các mục trong "Kiểm tra trước xuất bản" trước khi xuất bản.',
  };
}

/** Only the server-provided human message is appropriate for product UI. */
export function getReadinessIssueLabel(issue: ReadinessIssueForUi): string {
  void issue.message;
  return issue.humanMessage?.trim() || "Mục này cần được hoàn thiện.";
}
