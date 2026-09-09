"use client";

import type { ReactNode } from "react";
import Link from "next/link";

interface AuthShellProps {
  children: ReactNode;
  contentPosition?: "center" | "start";
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Minimalist Auth Top Bar */}
      <div className="w-full bg-surface-container-lowest/80 backdrop-blur-md sticky top-0 z-30 shadow-xs border-b border-surface-container-high/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-on-surface hover:opacity-90 transition-opacity"
            >
              <div className="w-9 h-9 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary font-bold">
                <span className="material-symbols-outlined text-[24px]">bakery_dining</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl text-primary leading-tight tracking-tight">
                  BreadTrans
                </span>
                <span className="text-xs text-on-surface-variant hidden sm:inline-block">
                  Nền tảng Tự học Tiếng Anh &amp; Luyện 4 Kỹ năng
                </span>
              </div>
            </Link>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors py-1.5 px-3 rounded-lg hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Quay lại Trang chủ</span>
          </Link>
        </div>
      </div>

      {/* Main Authentication Canvas */}
      <main className="w-full flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 relative overflow-hidden">
        {/* Subtle Ambient Background Accents */}
        <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-20 w-96 h-96 rounded-full bg-secondary-fixed/40 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md mx-auto my-4 z-10">
          {children}

          {/* Quick Platform Support Credentials Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-on-surface-variant">
              Gặp sự cố khi đăng nhập hoặc đăng ký? Liên hệ đội ngũ học thuật:{" "}
              <a
                className="text-primary hover:underline font-semibold"
                href="mailto:support@breadtrans.edu.vn"
              >
                support@breadtrans.edu.vn
              </a>
            </p>
          </div>

          {/* Policy & Legal Links Footer */}
          <div className="mt-6 flex items-center justify-center gap-3 sm:gap-4 text-xs text-on-surface-variant">
            <Link href="/terms" className="hover:text-primary transition-colors">
              Điều khoản dịch vụ
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Chính sách bảo mật
            </Link>
            <span>•</span>
            <Link href="/help" className="hover:text-primary transition-colors">
              Trợ giúp
            </Link>
          </div>
        </div>
      </main>

      {/* Brand Footer */}
      <footer className="w-full bg-surface-container-lowest shadow-[0_-1px_6px_rgba(0,0,0,0.03)] border-t border-surface-container-high/40 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">bakery_dining</span>
                </div>
                <span className="text-xl font-bold text-primary tracking-tight">BreadTrans</span>
              </div>
              <p className="text-sm text-on-surface-variant max-w-md mb-4 leading-relaxed">
                Nền tảng tự học tiếng Anh ứng dụng AI. Rèn luyện 4 kỹ năng, củng cố từ vựng
                và ngữ pháp theo phương pháp tương tác tự nhiên.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface-variant text-xs font-semibold">
                <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
                <span>Học theo lộ trình phù hợp với bạn</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-on-surface mb-3">Luyện 4 Kỹ Năng</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    href="/practice/listening"
                  >
                    Luyện Nghe chép chính tả
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    href="/practice/speaking"
                  >
                    Luyện nói với AI
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    href="/practice/reading"
                  >
                    Luyện Đọc tra từ thông minh
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    href="/practice/writing"
                  >
                    Luyện Viết AI gợi ý sửa lỗi
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-on-surface mb-3">Chương Trình Học</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    href="/courses"
                  >
                    Khóa học cốt lõi
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    href="/practice/quizzes"
                  >
                    Thi thử TOEIC Full Test
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    href="/courses"
                  >
                    Đánh giá trình độ ban đầu
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    href="/market"
                  >
                    Gói hội viên &amp; Bánh Mì
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-on-surface mb-3">Hỗ Trợ &amp; Pháp Lý</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    href="/help"
                  >
                    Trung tâm trợ giúp
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    href="/privacy"
                  >
                    Chính sách bảo mật
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    href="/terms"
                  >
                    Điều khoản sử dụng
                  </Link>
                </li>
                <li>
                  <Link
                    className="text-on-surface-variant hover:text-primary transition-colors"
                    href="/contact"
                  >
                    Liên hệ góp ý
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-surface-container-high/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
            <p>© {new Date().getFullYear()} BreadTrans EdTech. Nền tảng tự học tiếng Anh phản xạ 4 kỹ năng.</p>
            <div className="flex items-center gap-4">
              <span>Phiên bản Web 2.4.0</span>
              <span>•</span>
              <span>AI Model Active</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
