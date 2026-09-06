import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-junior-blue flex items-center justify-center text-white font-bold text-xl">
                B
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">
                BreadTrans <span className="text-junior-blue">Junior</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Hệ thống đào tạo tiếng Anh và luyện thi TOEIC tương tác, mang lại trải nghiệm học tập hiệu quả, hiện đại và tràn đầy cảm hứng cho học viên.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base font-bold text-white mb-4">Khám phá</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="/courses" className="hover:text-white transition-colors">
                  Danh sách khóa học
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Đăng ký nhập học
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-base font-bold text-white mb-4">Dành cho học viên</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Đăng nhập hệ thống
                </Link>
              </li>
              <li>
                <Link href="/my-courses" className="hover:text-white transition-colors">
                  Lớp học của tôi
                </Link>
              </li>
              <li>
                <Link href="/change-password" className="hover:text-white transition-colors">
                  Đổi mật khẩu
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-base font-bold text-white mb-4">Liên hệ trung tâm</h4>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <Phone size={16} className="text-junior-blue shrink-0" />
              <span>Hotline: 1900 6868</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <Mail size={16} className="text-junior-blue shrink-0" />
              <span>contact@breadtrans.edu.vn</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-slate-400">
              <MapPin size={16} className="text-junior-blue shrink-0 mt-0.5" />
              <span>Tầng 5, Tòa nhà Tri Thức, Quận Cầu Giấy, Hà Nội</span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} BreadTrans Junior. Toàn bộ bản quyền được bảo lưu.</p>
        </div>
      </div>
    </footer>
  );
}
