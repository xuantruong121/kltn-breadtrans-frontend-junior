export function createReadingAttemptId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  throw new Error("Trình duyệt không hỗ trợ UUID cho phiên Reading");
}
