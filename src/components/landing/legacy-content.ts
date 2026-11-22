/**
 * The copy of the old landing (src/app/(public)/page.tsx before 2026-11-22),
 * kept verbatim so Task 4 (path) and Task 5 (FAQ) can take it over. Delete
 * this file once both have moved what they need into src/lib/landing/.
 */
import { Milestone, Target, Trophy, Zap } from "lucide-react";

// Every statement here must match what the product actually does. No learner
// counts, success rates, testimonials or exam-board claims: BreadTrans writes
// its own practice material and its results are internal practice indicators.
export const ROADMAP_STEPS = [
  {
    step: "01",
    title: "Làm bài đánh giá đầu vào",
    desc: "Trả lời bộ câu hỏi đầu vào để thấy kỹ năng nào đang mạnh, kỹ năng nào cần luyện thêm. Kết quả là ước lượng nội bộ để gợi ý bài luyện, không phải chứng chỉ hay cấp độ CEFR.",
    badge: "Miễn phí",
    icon: Target,
  },
  {
    step: "02",
    title: "Nhận gợi ý bài luyện",
    desc: "Từ những câu bạn làm sai, hệ thống gợi ý bài luyện cho kỹ năng còn yếu. Bạn vẫn có thể chọn bất kỳ bài nào trong thư viện.",
    badge: "Theo kết quả của bạn",
    icon: Milestone,
  },
  {
    step: "03",
    title: "Luyện Nghe, Nói, Đọc, Viết",
    desc: "Bài Nghe và Đọc được chấm ngay sau khi nộp. Bài Nói được chấm phát âm từng từ, bài Viết nhận nhận xét tự động theo tiêu chí.",
    badge: "Phản hồi tự động",
    icon: Zap,
  },
  {
    step: "04",
    title: "Luyện đề theo cấu trúc TOEIC",
    desc: "Làm đề Nghe & Đọc 200 câu trong 120 phút có đồng hồ, rồi xem lại đáp án và giải thích. Đề do BreadTrans biên soạn; điểm là chỉ số luyện tập, không phải điểm thi chính thức.",
    badge: "Có giới hạn thời gian",
    icon: Trophy,
  },
];

export const FAQ_LIST = [
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
];
