import { CircleHelp } from "lucide-react";
import { PublicInfoPage } from "@/components/public/PublicInfoPage";

export default function HelpPage() {
  return (
    <PublicInfoPage
      eyebrow="Trung tâm trợ giúp & Liên hệ"
      title="Bạn cần hỗ trợ hoặc có đề xuất cải tiến?"
      description="Xem các hướng dẫn bên dưới, liên hệ qua email hỗ trợ hoặc gửi đề xuất tính năng để cùng chúng tôi phát triển BreadTrans ngày càng tốt hơn."
      icon={CircleHelp}
      sections={[
        { title: "Không đăng nhập được", body: "Kiểm tra đúng email và mật khẩu, hoặc sử dụng đăng nhập Google nếu tài khoản của bạn đã liên kết với Google." },
        { title: "Quên mật khẩu", body: "Hiện bạn có thể gửi yêu cầu đặt lại mật khẩu cho đội ngũ hỗ trợ. Luồng tự động sẽ chỉ được mở khi backend xác thực email đã sẵn sàng." },
        { title: "Tính năng yêu cầu đăng nhập", body: "Bạn có thể xem trước các nội dung công khai. Khi bắt đầu luyện tập, hệ thống sẽ yêu cầu đăng nhập để lưu tiến độ và kết quả." },
        { title: "Đề xuất tính năng & Đóng góp ý kiến", body: "Chúng tôi luôn lắng nghe đề xuất từ người học để cải tiến bài tập, giao diện và lộ trình học. Hãy gửi đóng góp trực tiếp qua email contact@breadtrans.online." },
      ]}
      cta={{ label: "Gửi yêu cầu hỗ trợ & Đề xuất", href: "mailto:contact@breadtrans.online?subject=H%E1%BB%97%20tr%E1%BB%A3%20%26%20%C4%90%E1%BB%81%20xu%E1%BA%A5t%20BreadTrans" }}
    />
  );
}
