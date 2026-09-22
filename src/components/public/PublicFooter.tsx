import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { BrandLogo } from "@/components/brand";

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pt-16 pb-12 text-slate-600 dark:text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-4">
            <BrandLogo href="/" variant="compact" size="lg" />
            <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Nền tảng tự học tiếng Anh 4 kỹ năng, kết hợp Flashcard, ngữ pháp cùng công cụ luyện phát âm và viết câu thông minh.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">Khám phá</h4>
            <ul className="space-y-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/" className="transition-colors hover:text-amber-600 dark:hover:text-amber-400">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="/courses" className="transition-colors hover:text-amber-600 dark:hover:text-amber-400">
                  Danh sách khóa học
                </Link>
              </li>
              <li>
                <Link href="/practice/quizzes" className="transition-colors hover:text-amber-600 dark:hover:text-amber-400">
                  Đề thi TOEIC
                </Link>
              </li>
              <li>
                <Link href="/register" className="transition-colors hover:text-amber-600 dark:hover:text-amber-400">
                  Đăng ký nhận Bánh Mì
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">Dành cho học viên</h4>
            <ul className="space-y-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/login" className="transition-colors hover:text-amber-600 dark:hover:text-amber-400">
                  Đăng nhập hệ thống
                </Link>
              </li>
              <li>
                <Link href="/my-courses" className="transition-colors hover:text-amber-600 dark:hover:text-amber-400">
                  Khóa học của tôi
                </Link>
              </li>
              <li>
                <Link href="/flashcard" className="transition-colors hover:text-amber-600 dark:hover:text-amber-400">
                  Flashcard từ vựng
                </Link>
              </li>
              <li>
                <Link href="/arena" className="transition-colors hover:text-amber-600 dark:hover:text-amber-400">
                  Bảng xếp hạng
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">Liên hệ trung tâm</h4>
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
              <Phone size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Hotline: 1900 6868</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
              <Mail size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>contact@breadtrans.edu.vn</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
              <MapPin size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>Tầng 5, Tòa nhà Tri Thức, Quận Cầu Giấy, Hà Nội</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-8 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link href="/terms" className="hover:text-amber-700 dark:hover:text-amber-400">Điều khoản</Link>
            <Link href="/privacy" className="hover:text-amber-700 dark:hover:text-amber-400">Chính sách bảo mật</Link>
            <Link href="/help" className="hover:text-amber-700 dark:hover:text-amber-400">Trợ giúp</Link>
          </div>
          <p>© {new Date().getFullYear()} BreadTrans - Nền tảng tự học tiếng Anh & Luyện thi TOEIC. Thiết kế lấy học viên làm trung tâm.</p>
        </div>
      </div>
    </footer>
  );
}
