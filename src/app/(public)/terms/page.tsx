import { PublicInfoPage } from "@/components/public/PublicInfoPage";
import { LEGAL_UPDATED_LABEL } from "@/lib/auth/accountPrivacy";

export default function TermsPage() {
  return (
    <PublicInfoPage
      title="Điều khoản sử dụng"
      description="Các điều khoản dưới đây giúp BreadTrans vận hành minh bạch và bảo vệ trải nghiệm học tập của mọi học viên. Khi tạo tài khoản, bạn đồng ý với các điều khoản này."
      updated={LEGAL_UPDATED_LABEL}
      sections={[
        { title: "Tài khoản học viên", body: "Bạn chịu trách nhiệm bảo mật thông tin đăng nhập của mình và sử dụng tài khoản cho mục đích học tập hợp pháp." },
        { title: "Nội dung học tập", body: "Bài học, đề luyện và phản hồi trên BreadTrans phục vụ việc tự học. Không sao chép hoặc phát tán nội dung khi chưa có sự đồng ý." },
        { title: "Kết quả luyện tập", body: "Đề luyện TOEIC trên BreadTrans là nội dung tự biên soạn theo cấu trúc bài thi. Điểm và kết quả chỉ là chỉ số luyện tập nội bộ, không phải điểm thi chính thức." },
        { title: "Dịch vụ và phản hồi", body: "Một số tính năng phụ thuộc vào dịch vụ bên thứ ba. Chúng tôi có thể cải tiến giao diện hoặc nội dung để nâng cao chất lượng học tập." },
        { title: "Dữ liệu cá nhân", body: "Cách BreadTrans thu thập, sử dụng và xoá dữ liệu của bạn được mô tả trong Chính sách bảo mật. Bạn có thể tự xoá tài khoản bất cứ lúc nào." },
        { title: "Thay đổi điều khoản", body: "Khi điều khoản hoặc chính sách bảo mật thay đổi, ứng dụng sẽ hỏi lại bạn trước khi tiếp tục sử dụng." },
      ]}
    />
  );
}
