/**
 * Helper to map backend error responses to user-friendly Vietnamese messages.
 * Prevents raw exceptions or technical errors from being displayed directly to users.
 */
export function getApiErrorMessage(
  err: any,
  defaultMessage: string = "Thao tác thất bại. Vui lòng thử lại.",
): string {
  if (!err) return defaultMessage;

  const response = err.response;
  if (!response && (err.code === "ERR_NETWORK" || err.message === "Network Error")) {
    return "Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.";
  }
  const rawMessage = response?.data?.message;

  let message = "";
  if (Array.isArray(rawMessage)) {
    message = rawMessage.join(". ");
  } else if (typeof rawMessage === "string") {
    message = rawMessage;
  }

  const lowerMsg = message.toLowerCase();

  // A course waiting for review cannot go back to draft
  if (
    lowerMsg.includes("đang chờ admin duyệt") ||
    lowerMsg.includes("đang chờ duyệt")
  ) {
    return "Khóa học đang chờ Admin duyệt và không thể chuyển về Bản nháp.";
  }

  // Published course direct edit block
  if (
    lowerMsg.includes("đã xuất bản") &&
    (lowerMsg.includes("tiêu đề") ||
      lowerMsg.includes("cấp độ") ||
      lowerMsg.includes("chuyển về bản nháp"))
  ) {
    return "Khóa học đã xuất bản chỉ cho phép sửa trực tiếp ảnh bìa và mô tả. Để sửa tiêu đề, cấp độ hoặc giáo trình, vui lòng chuyển về Bản nháp.";
  }

  // If there's an explicit custom backend message
  if (message && message.trim().length > 0) {
    const technicalLeak =
      /prisma|query|sqlstate|stack trace|exception|undefined|cannot read properties|internal server error/i.test(
        message,
      );
    if (technicalLeak) return defaultMessage;
    // A message with no Vietnamese letter is an internal English message from
    // the API ("Quiz not found"); show the status-based Vietnamese text instead.
    if (/[À-ỹĐđ]/.test(message)) return message;
  }

  // HTTP status fallback mapping
  if (response?.status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  if (response?.status === 403) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }
  if (response?.status === 400 || response?.status === 422) {
    return "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.";
  }
  if (response?.status === 404) {
    return "Không tìm thấy dữ liệu yêu cầu hoặc mục đã bị xóa.";
  }
  if (response?.status === 429) {
    return "Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.";
  }
  if (response?.status === 409) {
    return "Dữ liệu bị trùng lặp hoặc đã bị thay đổi bởi phiên làm việc khác.";
  }
  if (response?.status >= 500) {
    return "Máy chủ gặp sự cố tạm thời. Vui lòng thử lại sau ít phút.";
  }

  return defaultMessage;
}
