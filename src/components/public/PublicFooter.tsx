import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white pt-16 pb-12 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Col */}
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white font-bold text-xl shadow-xs">
                🍞
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-900">
                Bread<span className="text-amber-600">Trans</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-500">
              Nền tảng tự học tiếng Anh và luyện thi TOEIC 4 kỹ năng tự chủ, hỗ trợ AI chấm phát âm và sửa lỗi ngữ pháp thông minh.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-base font-bold text-slate-900">Khám phá</h4>
            <ul className="space-y-2.5 text-sm font-semibold text-slate-600">
              <li>
                <Link href="/" className="transition-colors hover:text-amber-600">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="/courses" className="transition-colors hover:text-amber-600">
                  Danh sách khóa học
                </Link>
              </li>
              <li>
                <Link href="/practice/quizzes" className="transition-colors hover:text-amber-600">
                  Đề thi TOEIC
                </Link>
              </li>
              <li>
                <Link href="/register" className="transition-colors hover:text-amber-600">
                  Đăng ký nhận Bánh Mì
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-4 text-base font-bold text-slate-900">Dành cho học viên</h4>
            <ul className="space-y-2.5 text-sm font-semibold text-slate-600">
              <li>
                <Link href="/login" className="transition-colors hover:text-amber-600">
                  Đăng nhập hệ thống
                </Link>
              </li>
              <li>
                <Link href="/my-courses" className="transition-colors hover:text-amber-600">
                  Khóa học của tôi
                </Link>
              </li>
              <li>
                <Link href="/flashcard" className="transition-colors hover:text-amber-600">
                  Flashcard từ vựng
                </Link>
              </li>
              <li>
                <Link href="/arena" className="transition-colors hover:text-amber-600">
                  Bảng xếp hạng
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="mb-4 text-base font-bold text-slate-900">Liên hệ trung tâm</h4>
            <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
              <Phone size={16} className="text-amber-600 shrink-0" />
              <span>Hotline: 1900 6868</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
              <Mail size={16} className="text-amber-600 shrink-0" />
              <span>contact@breadtrans.edu.vn</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-slate-500 font-medium">
              <MapPin size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>Tầng 5, Tòa nhà Tri Thức, Quận Cầu Giấy, Hà Nội</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8 text-center text-xs font-semibold text-slate-400">
          <p>© {new Date().getFullYear()} BreadTrans - Nền Tảng Luyện Thi TOEIC &amp; Tiếng Anh Toàn Diện. Thiết kế lấy học viên làm trung tâm.</p>
        </div>
      </div>
    </footer>
  );
}
