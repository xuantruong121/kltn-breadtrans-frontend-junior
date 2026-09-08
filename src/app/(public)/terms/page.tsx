import { FileText } from "lucide-react";
import { PublicInfoPage } from "@/components/public/PublicInfoPage";

export default function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="Điều khoản sử dụng"
      title="Học tập rõ ràng, tôn trọng và an toàn"
      description="Các điều khoản dưới đây giúp BreadTrans vận hành minh bạch và bảo vệ trải nghiệm học tập của mọi học viên."
      icon={FileText}
      sections={[
        { title: "Tài khoản học viên", body: "Bạn chịu trách nhiệm bảo mật thông tin đăng nhập của mình và sử dụng tài khoản cho mục đích học tập hợp pháp." },
        { title: "Nội dung học tập", body: "Bài học, đề luyện và phản hồi trên BreadTrans phục vụ việc tự học. Không sao chép hoặc phát tán nội dung khi chưa có sự đồng ý." },
        { title: "Dịch vụ và phản hồi", body: "Một số tính năng phụ thuộc vào dịch vụ bên thứ ba. Chúng tôi có thể cải tiến giao diện hoặc nội dung để nâng cao chất lượng học tập." },
      ]}
      cta={{ label: "Khám phá khóa học", href: "/courses" }}
    />
  );
}
