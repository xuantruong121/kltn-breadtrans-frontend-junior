"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

interface AuthShellProps {
  children: ReactNode;
  contentPosition?: "center" | "start";
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#fbfaf8] text-slate-900 selection:bg-amber-100 selection:text-amber-900">
      {/* Minimalist Auth Top Bar */}
      <div className="w-full bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-xs border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-slate-900 hover:opacity-90 transition-opacity"
            >
              <div className="relative w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-200 flex items-center justify-center overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="BreadTrans Logo"
                  width={28}
                  height={28}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl text-amber-700 leading-tight tracking-tight">
                  BreadTrans
                </span>
                <span className="text-xs text-slate-500 hidden sm:inline-block font-medium">
                  Nền tảng Tự học Tiếng Anh &amp; Luyện 4 Kỹ năng
                </span>
              </div>
            </Link>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-amber-700 transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
            <span>Quay lại Trang chủ</span>
          </Link>
        </div>
      </div>

      {/* Main Authentication Canvas */}
      <main className="w-full flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 relative overflow-hidden">
        {/* Subtle Ambient Background Accents */}
        <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-amber-200/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-20 w-96 h-96 rounded-full bg-orange-200/20 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md mx-auto my-4 z-10">
          {children}

          {/* Quick Platform Support Credentials Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Gặp sự cố khi đăng nhập hoặc đăng ký? Liên hệ đội ngũ học thuật:{" "}
              <a
                className="text-amber-700 hover:underline font-semibold"
                href="mailto:support@breadtrans.edu.vn"
              >
                support@breadtrans.edu.vn
              </a>
            </p>
          </div>

          {/* Policy & Legal Links Footer */}
          <div className="mt-6 flex items-center justify-center gap-3 sm:gap-4 text-xs text-slate-500">
            <Link href="/terms" className="hover:text-amber-700 transition-colors">
              Điều khoản dịch vụ
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-amber-700 transition-colors">
              Chính sách bảo mật
            </Link>
            <span>•</span>
            <Link href="/help" className="hover:text-amber-700 transition-colors">
              Trợ giúp
            </Link>
          </div>
        </div>
      </main>

      {/* Brand Footer */}
      <footer className="w-full bg-white shadow-[0_-1px_6px_rgba(0,0,0,0.03)] border-t border-slate-200/70 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="relative w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-200 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/logo.png"
                    alt="BreadTrans Logo"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <span className="text-xl font-extrabold text-amber-700 tracking-tight">BreadTrans</span>
              </div>
              <p className="text-sm text-slate-500 max-w-md mb-4 leading-relaxed">
                Nền tảng tự học tiếng Anh tương tác. Rèn luyện 4 kỹ năng, củng cố từ vựng
                và ngữ pháp theo phương pháp học chủ động.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                <CheckCircle2 size={16} className="text-amber-600 shrink-0" />
                <span>Học theo lộ trình phù hợp với bạn</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">Luyện 4 Kỹ Năng</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    className="text-slate-600 hover:text-amber-700 transition-colors"
                    href="/practice/listening"
                  >
                    Luyện Nghe chép chính tả
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-slate-600 hover:text-amber-700 transition-colors"
                    href="/practice/speaking"
                  >
                    Luyện nói chuẩn âm vị
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-slate-600 hover:text-amber-700 transition-colors"
                    href="/practice/reading"
                  >
                    Luyện Đọc tra từ thông minh
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-slate-600 hover:text-amber-700 transition-colors"
                    href="/practice/writing"
                  >
                    Luyện Viết gợi ý sửa lỗi
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">Chương Trình Học</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    className="text-slate-600 hover:text-amber-700 transition-colors"
                    href="/courses"
                  >
                    Khóa học cốt lõi
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-slate-600 hover:text-amber-700 transition-colors"
                    href="/practice/quizzes"
                  >
                    Thi thử TOEIC Full Test
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-slate-600 hover:text-amber-700 transition-colors"
                    href="/courses"
                  >
                    Đánh giá trình độ ban đầu
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-slate-600 hover:text-amber-700 transition-colors"
                    href="/market"
                  >
                    Gói hội viên &amp; Bánh Mì
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">Hỗ Trợ &amp; Pháp Lý</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    className="text-slate-600 hover:text-amber-700 transition-colors"
                    href="/help"
                  >
                    Trung tâm trợ giúp
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-slate-600 hover:text-amber-700 transition-colors"
                    href="/privacy"
                  >
                    Chính sách bảo mật
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-slate-600 hover:text-amber-700 transition-colors"
                    href="/terms"
                  >
                    Điều khoản sử dụng
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-slate-600 hover:text-amber-700 transition-colors"
                    href="/contact"
                  >
                    Liên hệ góp ý
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} BreadTrans EdTech. Nền tảng tự học tiếng Anh phản xạ 4 kỹ năng.</p>
            <div className="flex items-center gap-4">
              <span>Phiên bản Web 2.4.0</span>
              <span>•</span>
              <span>Hệ thống trực tuyến</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
