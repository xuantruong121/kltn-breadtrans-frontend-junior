import { ShieldCheck } from "lucide-react";
import { PublicInfoPage } from "@/components/public/PublicInfoPage";

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Chính sách bảo mật"
      title="Dữ liệu học tập của bạn được tôn trọng"
      description="BreadTrans chỉ sử dụng thông tin cần thiết để tạo tài khoản, cá nhân hóa hành trình học và duy trì an toàn hệ thống."
      icon={ShieldCheck}
      sections={[
        { title: "Thông tin được sử dụng", body: "Chúng tôi xử lý các thông tin như email, hồ sơ học viên, tiến độ và kết quả luyện tập để cung cấp chức năng phù hợp." },
        { title: "Bảo vệ phiên đăng nhập", body: "Phiên truy cập được xác thực bằng cơ chế bảo mật của hệ thống. Bạn nên đăng xuất trên thiết bị dùng chung." },
        { title: "Liên hệ về dữ liệu", body: "Nếu cần hỗ trợ về tài khoản hoặc dữ liệu học tập, hãy liên hệ đội ngũ BreadTrans qua email hỗ trợ." },
      ]}
      cta={{ label: "Liên hệ hỗ trợ", href: "mailto:support@breadtrans.edu.vn" }}
    />
  );
}
