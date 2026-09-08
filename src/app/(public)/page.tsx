"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { QuickLoginModal } from "@/components/auth/QuickLoginModal";
import { QuickRegisterModal } from "@/components/auth/QuickRegisterModal";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

export default function PublicLandingPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Auth Gate state
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [targetLabel, setTargetLabel] = useState("bài học");
  const [targetRoute, setTargetRoute] = useState("/dashboard");

  // Quick modals state
  const [quickLoginOpen, setQuickLoginOpen] = useState(false);
  const [quickRegisterOpen, setQuickRegisterOpen] = useState(false);

  // Intercept action if guest
  const handleProtectedAction = (label: string, route: string) => {
    if (user) {
      router.push(route);
    } else {
      setTargetLabel(label);
      setTargetRoute(route);
      setAuthGateOpen(true);
    }
  };

  const openDirectLogin = (label = "bài học", route = "/dashboard") => {
    setTargetLabel(label);
    setTargetRoute(route);
    setQuickLoginOpen(true);
  };

  const openDirectRegister = (label = "tài khoản học viên", route = "/dashboard") => {
    setTargetLabel(label);
    setTargetRoute(route);
    setQuickRegisterOpen(true);
  };

  return (
    <div className="min-h-full bg-[#fbfaf8] text-slate-800 antialiased selection:bg-amber-600 selection:text-white pb-24 md:pb-16 font-['Quicksand',sans-serif]">
      {/* BEGIN: MainContentContainer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8" id="dashboard-content">
        
        {/* BEGIN: WelcomeBanner */}
        <section className="bg-gradient-to-r from-amber-50 via-[#f5ede2] to-amber-100/60 border border-amber-200/80 rounded-3xl p-6 sm:p-8 text-slate-800 relative overflow-hidden shadow-soft">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative block shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/10 border-2 border-amber-200 shadow-md flex items-center justify-center text-3xl sm:text-4xl">
                  <span aria-label="Bánh Mì" role="img">🍞</span>
                </div>
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-amber-200/80 text-xs font-bold text-amber-900 mb-2 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Không gian học tập</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  Chào bạn, hôm nay bạn muốn luyện kỹ năng nào?
                </h1>
                <p className="text-slate-600 text-sm sm:text-base font-semibold mt-1">
                  Khám phá các bài luyện Nghe, Nói, Đọc và Viết phù hợp với mục tiêu của bạn.
                </p>
              </div>
            </div>

            {/* Right Box */}
            <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs max-w-sm w-full space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Lưu tiến độ học tập</span>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Đồng bộ tiến độ
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                {user
                  ? `Xin chào ${user.profile?.name || user.email}, tiến độ học tập của bạn luôn được tự động lưu trữ.`
                  : "Đăng nhập để lưu bài học, theo dõi tiến độ và nhận gợi ý phù hợp."}
              </p>
              {user ? (
                <Link
                  href="/dashboard"
                  className="block w-full text-center bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition-colors shadow-xs"
                >
                  Vào bàn học tập →
                </Link>
              ) : (
                <button
                  onClick={() => openDirectLogin("bài học", "/dashboard")}
                  className="btn-direct-login block w-full text-center bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition-colors shadow-xs cursor-pointer"
                  type="button"
                >
                  Đăng nhập
                </button>
              )}
            </div>
          </div>
        </section>
        {/* END: WelcomeBanner */}

        {/* BEGIN: PriorityNextAction */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái: Bắt đầu mục tiêu học tập của bạn */}
          <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-soft flex flex-col justify-between space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center font-bold text-lg">
                  🎯
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Bắt đầu mục tiêu học tập của bạn</h3>
                  <p className="text-xs font-semibold text-slate-500">
                    Tạo tài khoản để nhận nhiệm vụ hằng ngày và theo dõi kết quả luyện tập.
                  </p>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                Dành cho tân thủ
              </span>
            </div>

            <div className="space-y-3">
              {/* Bước 1 */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="flex items-center gap-3.5">
                  <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Làm bài test chẩn đoán trình độ 5 phút</p>
                    <p className="text-xs font-semibold text-slate-500">
                      Đánh giá nhanh từ vựng, ngữ pháp và nghe hiểu ban đầu
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleProtectedAction("bài kiểm tra chẩn đoán", "/diagnostic")}
                  className="text-xs font-black text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
                  type="button"
                >
                  Làm ngay →
                </button>
              </div>

              {/* Bước 2 */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/80">
                <div className="flex items-center gap-3.5">
                  <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Nhận gợi ý lộ trình học phù hợp</p>
                    <p className="text-xs font-semibold text-slate-500">
                      Chọn kỹ năng muốn cải thiện và xây dựng nhịp học phù hợp với bạn
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleProtectedAction("lộ trình cá nhân hóa", "/courses")}
                  className="text-xs font-black text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
                  type="button"
                >
                  Khám phá →
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  if (user) {
                    router.push("/dashboard");
                  } else {
                    openDirectLogin("bài học", "/dashboard");
                  }
                }}
                className="btn-direct-login inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm py-2.5 px-5 rounded-2xl shadow-xs transition-colors cursor-pointer"
                type="button"
              >
                <span>{user ? "Vào bàn học tập" : "Đăng nhập để bắt đầu"}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Cột phải: Card chào mừng người mới */}
          <div className="bg-white border border-slate-200/90 text-slate-800 rounded-3xl p-6 sm:p-7 shadow-soft flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-amber-800">Quà tặng người mới</span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Miễn phí 100%
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Tặng 50 Bánh Mì cho tài khoản mới</h3>
              <p className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">
                Tích lũy Bánh Mì để mở khóa nội dung học, nhận lượt chấm phát âm AI và bắt đầu với bài kiểm tra đầu vào ngắn.
              </p>
              <div className="mt-4 bg-amber-50 border border-amber-200/70 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🥖</span>
                  <span className="text-xs font-bold text-amber-900">+50 Bánh Mì ngay khi kích hoạt</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">⏱️</span>
                  <span className="text-xs font-bold text-amber-900">Bài kiểm tra chẩn đoán trình độ 5 phút</span>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  if (user) {
                    router.push("/student/profile?tab=quotas");
                  } else {
                    openDirectRegister("tài khoản nhận 50 Bánh Mì", "/dashboard");
                  }
                }}
                className="btn-direct-register w-full block text-center bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm py-3 rounded-2xl shadow-xs transition-colors cursor-pointer"
                type="button"
              >
                {user ? "Xem số dư Bánh Mì của bạn" : "Đăng ký nhận quà ngay"}
              </button>
            </div>
          </div>
        </section>
        {/* END: PriorityNextAction */}

        {/* BEGIN: EnrolledCourseSection */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-800">Khóa học nổi bật</span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">Khóa học dành cho bạn</h2>
            </div>
            <Link
              href="/courses"
              className="text-sm font-bold text-slate-600 hover:text-amber-800 flex items-center gap-1 group transition-colors"
            >
              <span>Xem tất cả khóa học</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="bg-white border-2 border-amber-100 rounded-3xl p-6 sm:p-7 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-amber-200 transition-colors">
            <div className="flex items-start sm:items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 text-amber-800">
                <BookOpen size={32} />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                    Khóa trọng tâm
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Mục tiêu: Giao tiếp tự tin</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Tiếng Anh giao tiếp công sở
                </h3>
                <p className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-600" />
                  <span>60 bài giảng chuyên đề &amp; hệ thống bài tập thực hành ETS</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 shrink-0">
              <Link
                href="/courses"
                className="px-4 py-3 rounded-2xl border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-sm text-center transition-colors bg-white cursor-pointer"
              >
                Xem giáo trình
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-3 rounded-2xl font-black text-sm whitespace-nowrap transition-colors shadow-xs cursor-pointer"
              >
                <span>Xem khóa học</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
        {/* END: EnrolledCourseSection */}

        {/* BEGIN: SkillsPracticeGrid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-800">Luyện tập 4 kỹ năng</span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">Bạn muốn luyện kỹ năng nào?</h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Chọn một kỹ năng để bắt đầu luyện tập.</p>
            </div>
            <button
              onClick={() => handleProtectedAction("tất cả kỹ năng", "/practice")}
              className="text-sm font-bold text-slate-600 hover:text-amber-800 flex items-center gap-1 group transition-colors cursor-pointer"
              type="button"
            >
              <span>Xem tất cả kỹ năng</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Nghe */}
            <div className="skill-card-hover bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-col justify-between group hover:border-blue-300">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center text-2xl">
                    🎧
                  </div>
                  <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 tracking-wide">
                    Nghe hiểu
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Luyện nghe
                </h3>
                <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
                  Rèn khả năng nghe hiểu qua hội thoại và tình huống thực tế.
                </p>
              </div>
              <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 font-bold">120 bài nghe</span>
                <button
                  onClick={() => handleProtectedAction("bài luyện nghe", "/practice/listening")}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors font-extrabold flex items-center gap-1 cursor-pointer"
                  type="button"
                >
                  Bắt đầu luyện nghe →
                </button>
              </div>
            </div>

            {/* 2. Nói */}
            <div className="skill-card-hover bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-col justify-between group hover:border-violet-300">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-200 text-violet-700 flex items-center justify-center text-2xl">
                    🎙️
                  </div>
                  <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-violet-100 text-violet-800 tracking-wide">
                    Luyện nói với AI
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-violet-700 transition-colors">
                  Luyện nói và phát âm
                </h3>
                <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
                  Cải thiện phát âm, ngữ điệu và phản xạ với trợ lý AI.
                </p>
              </div>
              <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-violet-800 font-extrabold">Nhận góp ý từ AI</span>
                <button
                  onClick={() => handleProtectedAction("bài luyện nói và phát âm", "/practice/speaking")}
                  className="px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 transition-colors font-extrabold flex items-center gap-1 cursor-pointer"
                  type="button"
                >
                  Bắt đầu luyện nói →
                </button>
              </div>
            </div>

            {/* 3. Đọc */}
            <div className="skill-card-hover bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-col justify-between group hover:border-emerald-300">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-2xl">
                    📖
                  </div>
                  <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 tracking-wide">
                    Đọc hiểu
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Luyện đọc
                </h3>
                <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
                  Phát triển kỹ năng đọc hiểu, tìm ý chính và xử lý thông tin.
                </p>
              </div>
              <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-800 font-extrabold">85 bài đọc hiểu</span>
                <button
                  onClick={() => handleProtectedAction("bài luyện đọc", "/practice/reading")}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors font-extrabold flex items-center gap-1 cursor-pointer"
                  type="button"
                >
                  Bắt đầu luyện đọc →
                </button>
              </div>
            </div>

            {/* 4. Viết */}
            <div className="skill-card-hover bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-col justify-between group hover:border-rose-300">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center text-2xl">
                    ✏️
                  </div>
                  <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 tracking-wide">
                    AI Writing
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                  Luyện viết
                </h3>
                <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
                  Luyện viết câu, email và nhận góp ý chi tiết từ AI.
                </p>
              </div>
              <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-rose-800 font-extrabold">Chấm bài chi tiết</span>
                <button
                  onClick={() => handleProtectedAction("bài luyện viết", "/practice/writing")}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors font-extrabold flex items-center gap-1 cursor-pointer"
                  type="button"
                >
                  Bắt đầu luyện viết →
                </button>
              </div>
            </div>
          </div>

          {/* Công cụ hỗ trợ: Từ vựng & Ngữ pháp */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">Công cụ hỗ trợ</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Từ vựng cốt lõi */}
              <div className="skill-card-hover bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-col justify-between group hover:border-amber-300">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center text-2xl">
                      🗂️
                    </div>
                    <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 tracking-wide">
                      Thuật toán SRS
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                    Từ vựng cốt lõi
                  </h3>
                  <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
                    Luyện ghi nhớ từ vựng theo chủ đề hằng ngày, học tập và công việc với chu kỳ lặp thông minh.
                  </p>
                </div>
                <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-800 font-extrabold">Từ vựng theo chủ đề</span>
                  <button
                    onClick={() => handleProtectedAction("kho từ vựng", "/flashcard")}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors font-extrabold flex items-center gap-1 cursor-pointer"
                    type="button"
                  >
                    Luyện ngay →
                  </button>
                </div>
              </div>

              {/* Ngữ pháp cấu trúc câu */}
              <div className="skill-card-hover bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-col justify-between group hover:border-amber-300">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center text-2xl">
                      📝
                    </div>
                    <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 tracking-wide">
                      24 Chuyên đề
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Ngữ pháp cấu trúc câu
                  </h3>
                  <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
                    Hệ thống hóa mệnh đề quan hệ, câu điều kiện, thì và tìm thông tin ngữ pháp bằng sơ đồ tư duy thực chiến.
                  </p>
                </div>
                <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-800 font-extrabold">24 chủ điểm ngữ pháp</span>
                  <button
                    onClick={() => handleProtectedAction("sổ tay ngữ pháp", "/grammar")}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors font-extrabold flex items-center gap-1 cursor-pointer"
                    type="button"
                  >
                    Luyện ngay →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Luyện đề TOEIC Banner */}
          <div className="skill-card-hover bg-gradient-to-br from-amber-50 to-[#fdf8f3] border border-amber-200 rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-amber-400">
            <div className="flex items-start sm:items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 text-3xl shadow-sm">
                📋
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-lg bg-white text-amber-900 shadow-xs border border-amber-200 tracking-wide">
                    ETS 2024
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Phòng thi chuẩn 200 câu</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                  Thi Thử TOEIC Mô Phỏng Chuẩn
                </h3>
                <p className="text-sm font-semibold text-slate-600 mt-1 leading-relaxed">
                  Phòng thi áp lực thời gian thực 200 câu trong 120 phút. Báo cáo phân tích điểm mạnh và điểm yếu chi tiết.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleProtectedAction("đề thi TOEIC", "/practice/quizzes")}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white transition-colors font-extrabold text-sm shadow-xs whitespace-nowrap cursor-pointer shrink-0"
              type="button"
            >
              <span>Làm đề ETS →</span>
            </button>
          </div>
        </section>
        {/* END: SkillsPracticeGrid */}

        {/* Footer note matching UI mockup */}
        <footer className="pt-8 pb-4 text-center text-xs font-semibold text-slate-400 border-t border-slate-200/80">
          <p>© 2025 BreadTrans - Nền tảng tự học tiếng Anh với AI. Thiết kế lấy học viên làm trung tâm.</p>
        </footer>
      </div>
      {/* END: MainContentContainer */}

      {/* BEGIN: FloatingAssistant */}
      <aside className="fixed bottom-20 md:bottom-6 right-6 z-40" data-purpose="floating-learning-assistant">
        <div className="group relative">
          <div className="absolute bottom-16 right-0 mb-2 w-64 bg-slate-900 text-white text-xs font-semibold rounded-2xl p-3.5 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
            <p className="font-bold text-amber-400 mb-0.5">Trợ lý học tập AI</p>
            Hỏi nghĩa từ vựng, giải thích câu sai ngữ pháp hoặc dịch câu tức thì!
          </div>
          <button
            onClick={() => {
              if (user) {
                router.push("/practice/speaking");
              } else {
                handleProtectedAction("trợ lý AI", "/practice/speaking");
              }
            }}
            aria-label="Mở trợ lý ảo AI"
            className="w-14 h-14 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white shadow-soft flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-amber-200 cursor-pointer"
            type="button"
          >
            <MessageSquare className="w-7 h-7" />
          </button>
        </div>
      </aside>
      {/* END: FloatingAssistant */}

      {/* Mobile navigation bottom bar */}
      <MobileBottomNav
        onOpenSkills={() => handleProtectedAction("Trung tâm luyện kỹ năng", "/practice")}
        onOpenAccount={() => {
          if (user) {
            router.push("/dashboard");
          } else {
            openDirectLogin("tài khoản học viên", "/dashboard");
          }
        }}
      />

      {/* Auth Gate Modal */}
      <AuthGateModal
        isOpen={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        targetLabel={targetLabel}
        targetRoute={targetRoute}
        onOpenLogin={() => {
          setAuthGateOpen(false);
          setQuickLoginOpen(true);
        }}
        onOpenRegister={() => {
          setAuthGateOpen(false);
          setQuickRegisterOpen(true);
        }}
      />

      {/* Quick Login Modal */}
      <QuickLoginModal
        isOpen={quickLoginOpen}
        onClose={() => setQuickLoginOpen(false)}
        targetLabel={targetLabel}
        targetRoute={targetRoute}
        onSwitchToRegister={() => {
          setQuickLoginOpen(false);
          setQuickRegisterOpen(true);
        }}
      />

      {/* Quick Register Modal */}
      <QuickRegisterModal
        isOpen={quickRegisterOpen}
        onClose={() => setQuickRegisterOpen(false)}
        targetLabel={targetLabel}
        targetRoute={targetRoute}
        onSwitchToLogin={() => {
          setQuickRegisterOpen(false);
          setQuickLoginOpen(true);
        }}
      />
    </div>
  );
}
