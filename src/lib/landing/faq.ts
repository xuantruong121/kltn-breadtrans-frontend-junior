/**
 * The landing FAQ (spec 6.4.5). The first five are FAQ_LIST of the old landing
 * (src/app/(public)/page.tsx before 2026-11-22), verbatim. The sixth is the
 * payment question of the /plans page (PlanFaqAccordion, "payment-methods"),
 * verbatim, so a visitor who just read the prices learns how to pay.
 *
 * Every answer must match what the product does: no learner counts, no
 * exam-board claims; BreadTrans writes its own practice material and its
 * results are internal practice indicators.
 */
export type FaqEntry = { q: string; a: string };

export const FAQ: FaqEntry[] = [
  {
    q: "BreadTrans có miễn phí để bắt đầu không?",
    a: "Có. Bạn đăng ký bằng email, không cần thẻ ngân hàng, rồi làm bài đánh giá đầu vào và các bài luyện được đánh dấu miễn phí. Một số bài cần gói Plus hoặc Pro; các bài đó hiển thị nhãn khóa rõ ràng.",
  },
  {
    q: "Bài Nói được chấm như thế nào?",
    a: "Bạn đọc theo câu mẫu và ghi âm. Hệ thống nhận dạng giọng nói rồi chấm độ chính xác của từng từ cùng độ trôi chảy, đánh dấu những từ nên luyện lại. Trước khi ghi âm, bạn có thể nghe câu mẫu ở tốc độ 0.75×, 0.9× hoặc 1×.",
  },
  {
    q: "Đề luyện TOEIC trên BreadTrans có phải đề thi thật không?",
    a: "Không. Đề do BreadTrans tự biên soạn theo cấu trúc bài thi TOEIC Nghe & Đọc (Part 1 đến Part 7, 200 câu, 120 phút). BreadTrans không liên kết với ETS và không cấp chứng chỉ; điểm hiển thị chỉ dùng để theo dõi tiến bộ khi luyện tập.",
  },
  {
    q: "Bánh Mì dùng để làm gì?",
    a: "Bánh Mì là điểm thưởng nhận được khi hoàn thành bài luyện và nhiệm vụ; lần đầu hoàn thành bài đánh giá đầu vào được thưởng 50 Bánh Mì (tính trong giới hạn thưởng mỗi ngày). Bạn dùng Bánh Mì để cho thú ảo ăn hoặc đổi vật phẩm trong Cửa hàng, ví dụ khung avatar, khiên giữ chuỗi và một số quà tặng.",
  },
  {
    q: "Tôi có học được trên điện thoại không?",
    a: "Có. BreadTrans chạy trên trình duyệt, giao diện co giãn theo màn hình điện thoại, máy tính bảng và máy tính. Hiện chưa có ứng dụng cài đặt riêng.",
  },
  {
    q: "Tôi có thể thanh toán gói qua những hình thức nào?",
    a: "Thanh toán bằng chuyển khoản ngân hàng qua mã VietQR do PayOS tạo. Quét mã bằng ứng dụng ngân hàng hoặc ví điện tử có hỗ trợ VietQR; mã đã có sẵn số tiền và nội dung chuyển khoản.",
  },
];
