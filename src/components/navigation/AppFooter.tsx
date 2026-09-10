import Link from "next/link";
import { Mail, Phone, MapPin, Wheat } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white pt-14 pb-10 text-slate-600">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-10">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-xs">
                <Wheat size={22} aria-hidden="true" />
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-900">
                Bread<span className="text-amber-600">Trans</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-500">
              Nền tảng tự học tiếng Anh 4 kỹ năng kết hợp Flashcard, ngữ pháp cùng công cụ luyện phát âm và viết câu thông minh.
            </p>
          </div>

          {/* Quick Discovery Links */}
          <div>
            <h4 className="mb-3.5 text-sm font-bold uppercase tracking-wider text-slate-900">Khám phá</h4>
            <ul className="space-y-2.5 text-sm font-semibold text-slate-600">
              <li>
                <Link href="/" className="transition-colors hover:text-amber-700">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="/courses" className="transition-colors hover:text-amber-700">
                  Khóa học
                </Link>
              </li>
              <li>
                <Link href="/practice/quizzes" className="transition-colors hover:text-amber-700">
                  Luyện đề thi TOEIC
                </Link>
              </li>
              <li>
                <Link href="/market" className="transition-colors hover:text-amber-700">
                  Cửa hàng đổi quà
                </Link>
              </li>
              <li>
                <Link href="/arena" className="transition-colors hover:text-amber-700">
                  Đấu trường & Bảng xếp hạng
                </Link>
              </li>
            </ul>
          </div>

          {/* Skill Practice Links */}
          <div>
            <h4 className="mb-3.5 text-sm font-bold uppercase tracking-wider text-slate-900">Luyện kỹ năng</h4>
            <ul className="space-y-2.5 text-sm font-semibold text-slate-600">
              <li>
                <Link href="/practice/listening" className="transition-colors hover:text-amber-700">
                  Luyện nghe hiểu
                </Link>
              </li>
              <li>
                <Link href="/practice/speaking" className="transition-colors hover:text-amber-700">
                  Luyện nói & phát âm
                </Link>
              </li>
              <li>
                <Link href="/practice/reading" className="transition-colors hover:text-amber-700">
                  Luyện đọc tra từ
                </Link>
              </li>
              <li>
                <Link href="/practice/writing" className="transition-colors hover:text-amber-700">
                  Luyện viết câu
                </Link>
              </li>
              <li>
                <Link href="/flashcard" className="transition-colors hover:text-amber-700">
                  Flashcard từ vựng
                </Link>
              </li>
              <li>
                <Link href="/grammar" className="transition-colors hover:text-amber-700">
                  Chuyên đề ngữ pháp
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-3">
            <h4 className="mb-3.5 text-sm font-bold uppercase tracking-wider text-slate-900">Hỗ trợ học viên</h4>
            <div className="flex items-center gap-2.5 text-sm text-slate-500 font-medium">
              <Phone size={16} className="text-amber-600 shrink-0" />
              <span>Hotline: 1900 6868</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-500 font-medium">
              <Mail size={16} className="text-amber-600 shrink-0" />
              <span>contact@breadtrans.edu.vn</span>
            </div>
            <div className="flex items-start gap-2.5 text-sm text-slate-500 font-medium">
              <MapPin size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>Tòa nhà Tri Thức, Quận Cầu Giấy, Hà Nội</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 text-center text-xs font-semibold text-slate-400">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link href="/terms" className="hover:text-amber-700 transition-colors">Điều khoản dịch vụ</Link>
            <Link href="/privacy" className="hover:text-amber-700 transition-colors">Chính sách bảo mật</Link>
            <Link href="/help" className="hover:text-amber-700 transition-colors">Trung tâm trợ giúp</Link>
          </div>
          <p>© {new Date().getFullYear()} BreadTrans — Nền tảng tự học tiếng Anh tương tác. Thiết kế lấy người học làm trung tâm.</p>
        </div>
      </div>
    </footer>
  );
}

export default AppFooter;
