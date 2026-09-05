/**
 * Helper to map backend error responses to user-friendly Vietnamese messages.
 * Prevents raw exceptions or technical errors from being displayed directly to users.
 */
export function getApiErrorMessage(err: any, defaultMessage: string = "Thao tác thất bại. Vui lòng thử lại."): string {
  if (!err) return defaultMessage;

  const response = err.response;
  const rawMessage = response?.data?.message;

  let message = "";
  if (Array.isArray(rawMessage)) {
    message = rawMessage.join(". ");
  } else if (typeof rawMessage === "string") {
    message = rawMessage;
  }

  const lowerMsg = message.toLowerCase();

  // 1. Session consistency constraint
  if (
    lowerMsg.includes("latestsession") ||
    lowerMsg.includes("buổi học") ||
    lowerMsg.includes("thời gian kết thúc của buổi học")
  ) {
    return "Không thể cập nhật ngày kết thúc. Ngày kết thúc mới đang sớm hơn buổi học cuối cùng đã được lên lịch. Vui lòng chọn ngày kết thúc muộn hơn buổi học cuối cùng.";
  }

  // 2. Ongoing class prevents reverting to draft
  if (
    lowerMsg.includes("đang chờ admin duyệt") ||
    lowerMsg.includes("đang chờ duyệt")
  ) {
    return "Khóa học đang chờ Admin duyệt và không thể chuyển về Bản nháp.";
  }

  if (
    lowerMsg.includes("chuyển khóa học về bản nháp") ||
    (lowerMsg.includes("lớp học đang diễn ra") && lowerMsg.includes("khóa học"))
  ) {
    return "Không thể chỉnh sửa giáo trình. Khóa học đang có lớp học diễn ra. Bạn không thể chuyển khóa học về Bản nháp cho đến khi các lớp đang học kết thúc.";
  }

  // 3. Class ongoing start date locked
  if (
    lowerMsg.includes("ngày bắt đầu của lớp học đang diễn ra") ||
    lowerMsg.includes("không thể thay đổi ngày bắt đầu")
  ) {
    return "Lớp học đang diễn ra. Bạn không thể thay đổi ngày bắt đầu lịch sử của lớp.";
  }

  // 4. Capacity vs Enrollment constraint
  if (
    lowerMsg.includes("sức chứa") ||
    lowerMsg.includes("capacity") ||
    lowerMsg.includes("ghi danh")
  ) {
    if (lowerMsg.includes("nhỏ hơn") || lowerMsg.includes("ít hơn")) {
      return "Sức chứa không thể nhỏ hơn số học viên hiện tại đang ghi danh trong lớp.";
    }
  }

  // 5. Delete class with enrollments
  if (
    lowerMsg.includes("xóa lớp học") &&
    (lowerMsg.includes("học viên") || lowerMsg.includes("enrollment"))
  ) {
    return "Không thể xóa lớp học này vì đã có học viên đăng ký. Vui lòng chuyển lớp sang trạng thái Đã hủy (CANCELLED).";
  }

  // 6. Published course direct edit block
  if (
    lowerMsg.includes("đã xuất bản") &&
    (lowerMsg.includes("tiêu đề") || lowerMsg.includes("cấp độ") || lowerMsg.includes("chuyển về bản nháp"))
  ) {
    return "Khóa học đã xuất bản chỉ cho phép sửa trực tiếp ảnh bìa và mô tả. Để sửa tiêu đề, cấp độ hoặc giáo trình, vui lòng chuyển về Bản nháp.";
  }

  // 7. Enrollment specific errors
  if (lowerMsg.includes("đã đủ số lượng học viên tối đa") || lowerMsg.includes("full capacity")) {
    return "Lớp học đã đủ số lượng học viên tối đa. Vui lòng chọn lớp học khác hoặc liên hệ trung tâm để được hỗ trợ.";
  }
  if (lowerMsg.includes("đã ghi danh vào lớp học này rồi")) {
    return "Bạn đã ghi danh vào lớp học này trước đó.";
  }

  // If there's an explicit custom backend message
  if (message && message.trim().length > 0) {
    return message;
  }

  // HTTP status fallback mapping
  if (response?.status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  if (response?.status === 403) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }
  if (response?.status === 404) {
    return "Không tìm thấy dữ liệu yêu cầu hoặc mục đã bị xóa.";
  }
  if (response?.status === 409) {
    return "Dữ liệu bị trùng lặp hoặc đã bị thay đổi bởi phiên làm việc khác.";
  }
  if (response?.status >= 500) {
    return "Máy chủ gặp sự cố tạm thời. Vui lòng thử lại sau ít phút.";
  }

  return defaultMessage;
}
