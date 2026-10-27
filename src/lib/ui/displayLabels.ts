/**
 * Vietnamese display labels for enum values the API returns as stored
 * (BEGINNER, PUBLISHED, PENDING...). Only presentation: the values themselves
 * are never changed. Unknown values pass through unchanged, so a new value is
 * visible rather than silently hidden.
 */

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Cơ bản",
  ELEMENTARY: "Cơ bản",
  BASIC: "Cơ bản",
  EASY: "Dễ",
  INTERMEDIATE: "Trung cấp",
  MEDIUM: "Trung bình",
  ADVANCED: "Nâng cao",
  HARD: "Khó",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bản nháp",
  READY: "Sẵn sàng",
  PUBLISHED: "Đã xuất bản",
  ARCHIVED: "Đã lưu trữ",
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngừng hoạt động",
  PENDING: "Đang chờ",
  PROCESSING: "Đang xử lý",
  RUNNING: "Đang xử lý",
  QUEUED: "Đang chờ",
  COMPLETED: "Hoàn thành",
  SUCCEEDED: "Hoàn thành",
  SUCCESS: "Thành công",
  FAILED: "Thất bại",
  CANCELLED: "Đã hủy",
  CANCELED: "Đã hủy",
  EXPIRED: "Đã hết hạn",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  PAID: "Đã thanh toán",
  UNPAID: "Chưa thanh toán",
  REFUNDED: "Đã hoàn tiền",
  PENDING_REVIEW: "Chờ duyệt",
  PENDING_GRADING: "Đang chấm bài",
  GRADING: "Đang chấm bài",
  GRADED: "Đã chấm",
  SUBMITTED: "Đã nộp",
  IN_PROGRESS: "Đang làm",
  PENDING_START: "Chưa bắt đầu",
  ENROLLED: "Đã ghi danh",
};

/** "INTERMEDIATE" → "Trung cấp"; CEFR tags and free text pass through. */
export function levelLabel(value?: string | null): string {
  if (!value) return "";
  return LEVEL_LABELS[value.trim().toUpperCase()] ?? value;
}

/** "PUBLISHED" → "Đã xuất bản"; unknown values pass through. */
export function statusLabel(value?: string | null): string {
  if (!value) return "";
  return STATUS_LABELS[value.trim().toUpperCase()] ?? value;
}
