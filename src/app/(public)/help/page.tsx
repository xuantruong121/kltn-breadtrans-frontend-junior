import { CircleHelp } from "lucide-react";
import { PublicInfoPage } from "@/components/public/PublicInfoPage";

export default function HelpPage() {
  return (
    <PublicInfoPage
      eyebrow="Trung tâm trợ giúp"
      title="Bạn cần hỗ trợ trong quá trình học?"
      description="Bắt đầu bằng các hướng dẫn cơ bản dưới đây. Nếu vẫn cần trợ giúp, đội ngũ BreadTrans luôn sẵn sàng tiếp nhận thông tin qua email."
      icon={CircleHelp}
      sections={[
        { title: "Không đăng nhập được", body: "Kiểm tra đúng email và mật khẩu, hoặc sử dụng đăng nhập Google nếu tài khoản của bạn đã liên kết với Google." },
        { title: "Quên mật khẩu", body: "Hiện bạn có thể gửi yêu cầu đặt lại mật khẩu cho đội ngũ hỗ trợ. Luồng tự động sẽ chỉ được mở khi backend xác thực email đã sẵn sàng." },
        { title: "Tính năng yêu cầu đăng nhập", body: "Bạn có thể xem trước các nội dung công khai. Khi bắt đầu luyện tập, hệ thống sẽ yêu cầu đăng nhập để lưu tiến độ và kết quả." },
      ]}
      cta={{ label: "Gửi yêu cầu hỗ trợ", href: "mailto:support@breadtrans.edu.vn?subject=H%E1%BB%97%20tr%E1%BB%A3%20BreadTrans" }}
    />
  );
}
