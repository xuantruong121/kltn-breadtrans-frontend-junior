export type ReadinessIssueForUi = {
  humanMessage?: string;
  message?: string;
  groupId?: number;
  questionId?: number;
};

export function getPublishReadinessUi(
  learnerReady: boolean | undefined,
  issueCount: number,
) {
  const canPublish = learnerReady === true;
  const outstandingLabel =
    issueCount === 1
      ? "Còn 1 mục cần hoàn thiện"
      : `Còn ${issueCount} mục cần hoàn thiện`;

  return {
    canPublish,
    label: canPublish ? "Xuất bản đề thi" : outstandingLabel,
    helpText: canPublish
      ? undefined
      : 'Hoàn tất các mục trong "Kiểm tra tiền xuất bản" trước khi xuất bản.',
  };
}

/** Only the server-provided human message is appropriate for product UI. */
export function getReadinessIssueLabel(issue: ReadinessIssueForUi): string {
  void issue.message;
  return issue.humanMessage?.trim() || "Mục này cần được hoàn thiện.";
}
