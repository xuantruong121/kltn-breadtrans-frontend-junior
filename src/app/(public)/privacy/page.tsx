import { PublicInfoPage } from "@/components/public/PublicInfoPage";
import { LEGAL_UPDATED_LABEL } from "@/lib/auth/accountPrivacy";

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      title="Chính sách bảo mật"
      description="Chính sách này mô tả đúng những gì hệ thống BreadTrans đang làm với dữ liệu của bạn. Khi tạo tài khoản, bạn đồng ý với chính sách này; lần đồng ý được ghi lại cùng thời điểm và phiên bản."
      updated={LEGAL_UPDATED_LABEL}
      sections={[
        {
          title: "Dữ liệu được thu thập",
          body: "BreadTrans chỉ lưu những gì cần để bạn học và quản lý tài khoản:",
          items: [
            "Tài khoản: email, họ tên, mật khẩu (chỉ lưu dạng băm), ảnh đại diện; với đăng nhập Google là mã tài khoản Google và ảnh hồ sơ.",
            "Học tập: bài làm, điểm, ghi âm bài nói, bài viết, sổ lỗi, từ đã lưu, tiến độ, kết quả bài đánh giá đầu vào.",
            "Mua bán: gói Plus/Pro đã mua, giao dịch thanh toán, đơn đổi quà, lịch sử Bánh Mì; số điện thoại và địa chỉ nhận quà khi bạn đổi quà hiện vật.",
            "Phiên đăng nhập: loại trình duyệt và thiết bị; địa chỉ IP lúc bạn đồng ý điều khoản.",
          ],
        },
        {
          title: "Không dùng vị trí",
          body: "BreadTrans không đọc vị trí của thiết bị. Địa chỉ nhận quà là địa chỉ bạn tự gõ, chỉ dùng để giao quà.",
        },
        {
          title: "Mục đích sử dụng",
          body: "Dữ liệu được dùng để: tạo và bảo vệ tài khoản; chấm bài và hiển thị tiến độ; gợi ý bài luyện phù hợp; xử lý thanh toán và giao quà; gửi email về tài khoản (đặt lại mật khẩu, xác nhận xoá tài khoản). BreadTrans không bán dữ liệu và không dùng dữ liệu cho quảng cáo.",
        },
        {
          title: "Bên thứ ba xử lý dữ liệu",
          body: "Một số chức năng gửi dữ liệu cần thiết sang dịch vụ bên ngoài:",
          items: [
            "Microsoft Azure AI Speech: nhận ghi âm bài nói để chấm phát âm.",
            "Google Gemini, Cloudflare Workers AI và một dịch vụ AI tương thích: nhận nội dung bài làm để chấm và giải thích.",
            "Cloudflare R2: lưu tệp như ghi âm, ảnh đại diện, ảnh đính kèm góp ý, và bản sao lưu cơ sở dữ liệu.",
            "payOS và SePay: xử lý thanh toán chuyển khoản.",
            "Google: đăng nhập bằng tài khoản Google.",
            "Dịch vụ gửi thư (SMTP): gửi email về tài khoản.",
          ],
        },
        {
          title: "Thời gian lưu",
          body: "Dữ liệu được giữ trong suốt thời gian tài khoản còn hoạt động. Bản sao lưu cơ sở dữ liệu được tạo mỗi ngày và tự xoá sau 14 ngày.",
        },
        {
          id: "xoa-tai-khoan",
          title: "Xoá tài khoản và dữ liệu",
          body: "Bạn tự xoá tài khoản trong Tài khoản > Quyền riêng tư > Xoá tài khoản:",
          items: [
            "Tài khoản bị khoá và đăng xuất trên mọi thiết bị ngay lập tức.",
            "Sau 7 ngày, hồ sơ, bài làm, ghi âm, tệp đã tải lên và dữ liệu học tập bị xoá vĩnh viễn.",
            "Đơn hàng, thanh toán, gói đã mua và lịch sử Bánh Mì được giữ ở dạng ẩn danh, không còn gắn với email hay tên của bạn, để đối soát giao dịch.",
            "Trong 7 ngày đó, đăng nhập lại và chọn \"Huỷ yêu cầu xoá\" để giữ tài khoản.",
            "Dữ liệu đã xoá có thể còn trong bản sao lưu tối đa 14 ngày, sau đó bản sao lưu tự xoá.",
          ],
        },
      ]}
      contact={{
        label: "Câu hỏi về dữ liệu cá nhân, hãy gửi email tới",
        linkText: "support@breadtrans.edu.vn",
        href: "mailto:support@breadtrans.edu.vn",
      }}
    />
  );
}
