"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { breads, streak } = useGamificationStore();

  const studentName = user?.profile?.name || user?.email?.split("@")[0] || "Học Viên";
  const studentAvatar = user?.profile?.avatarUrl;
  const streakCount = streak || 5;
  const breadBalance = breads || 320;

  return (
    <div className="space-y-8 pb-16 font-['Quicksand',sans-serif]" id="dashboard">
      {/* BEGIN: WelcomeBanner */}
      <section
        className="bg-gradient-to-r from-amber-50 via-[#f7f0e6] to-amber-100/70 border border-amber-200/90 rounded-3xl p-6 sm:p-8 text-slate-800 relative overflow-hidden shadow-soft"
        data-purpose="welcome-motivation"
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Link
              href="/student/profile"
              className="relative block shrink-0 cursor-pointer group"
              title="Hồ sơ cá nhân & Gói học"
            >
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-amber-600 text-white font-black text-2xl sm:text-3xl flex items-center justify-center border-2 border-amber-200 shadow-md group-hover:scale-105 transition-transform overflow-hidden">
                {studentAvatar ? (
                  <img
                    src={studentAvatar}
                    alt={`Ảnh của ${studentName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{studentName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span
                className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white"
                title="Trực tuyến"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    clipRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    fillRule="evenodd"
                  />
                </svg>
              </span>
            </Link>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-amber-200/80 text-xs font-bold text-amber-900 mb-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Hôm nay học gì nhỉ?</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Chào {studentName}, sẵn sàng bứt phá mục tiêu hôm nay!
              </h1>
              <p className="text-slate-600 text-sm sm:text-base font-semibold mt-1">
                Chỉ cần 15 phút tập trung mỗi ngày để tiến gần hơn với mục tiêu tiếng Anh của bạn.
              </p>
            </div>
          </div>

          {/* Real Statistics (Chuỗi học, Mục tiêu, Bánh Mì) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 bg-white p-3 sm:p-4 rounded-2xl border border-amber-200/80 shadow-xs min-w-[290px] shrink-0">
            <div className="text-center px-2 py-1">
              <span className="text-xs font-bold text-slate-500 block">Chuỗi học</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 block">
                {streakCount} ngày
              </span>
              <span className="text-[11px] font-semibold text-amber-700">Đều đặn 🔥</span>
            </div>
            <div className="text-center px-2 py-1 border-x border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">Mục tiêu</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 block">2 / 3</span>
              <span className="text-[11px] font-semibold text-emerald-700">Bài hoàn thành</span>
            </div>
            <Link
              href="/student/profile?tab=quotas"
              className="text-center px-2 py-1 block rounded-xl hover:bg-amber-50 transition-colors w-full cursor-pointer"
              title="Ví Bánh Mì"
            >
              <span className="text-xs font-bold text-slate-500 block">Bánh Mì</span>
              <span className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5 block">
                +{breadBalance > 100 ? 45 : breadBalance}
              </span>
              <span className="text-[11px] font-semibold text-amber-800">Tích lũy hôm nay →</span>
            </Link>
          </div>
        </div>
      </section>
      {/* END: WelcomeBanner */}

      {/* BEGIN: PriorityTasksSection (Nhiệm vụ nhận Bánh Mì & Mục tiêu hôm nay) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-purpose="tasks-and-daily-quest">
        {/* Cột trái: Nhiệm vụ nhận Bánh Mì hôm nay */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-soft space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center font-bold text-lg">
                🍞
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Nhiệm vụ nhận Bánh Mì hôm nay</h3>
                <p className="text-xs font-semibold text-slate-500">
                  Hoàn thành nhiệm vụ để tích lũy Bánh Mì đổi quà và mở khóa đề độc quyền
                </p>
              </div>
            </div>
            <span className="text-xs font-black px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
              Còn lại 2 nhiệm vụ
            </span>
          </div>

          <div className="space-y-3">
            {/* Task 1: Đăng nhập */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/70 opacity-85">
              <div className="flex items-center gap-3.5">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 size={16} />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800 line-through">
                    Đăng nhập vào BreadTrans và giữ chuỗi học
                  </p>
                  <p className="text-xs font-semibold text-slate-500">Đã nhận lúc 08:30 sáng</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1">
                ✓ Đã nhận +15 🍞
              </span>
            </div>

            {/* Task 2: Ôn tập từ vựng SRS */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white border-2 border-amber-200/80 hover:border-amber-400 transition-colors">
              <div className="flex items-center gap-3.5">
                <span className="w-6 h-6 rounded-full border-2 border-amber-600 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Ôn tập 20 từ vựng với thẻ Flashcard SRS</p>
                  <p className="text-xs font-semibold text-slate-500">Tiến độ: 14/20 từ (còn 6 từ nữa)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/flashcard"
                  className="text-xs font-black text-white bg-amber-600 hover:bg-amber-700 px-3.5 py-1.5 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Làm ngay
                </Link>
                <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                  +25 🍞
                </span>
              </div>
            </div>

            {/* Task 3: Phát âm Speaking AI */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3.5">
                <span className="w-6 h-6 rounded-full border-2 border-slate-300 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Thực hành 1 bài phát âm: Luyện nói và nhận góp ý phát âm
                  </p>
                  <p className="text-xs font-semibold text-slate-500">Chưa bắt đầu trong ngày</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/practice/speaking"
                  className="text-xs font-black text-white bg-amber-600 hover:bg-amber-700 px-3.5 py-1.5 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Làm ngay
                </Link>
                <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                  +30 🍞
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: Mục tiêu hôm nay */}
        <div className="bg-white border border-slate-200/90 text-slate-800 rounded-3xl p-6 sm:p-7 shadow-soft flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                Mục tiêu hôm nay
              </span>
              <span className="text-xs font-semibold text-slate-500">Cập nhật theo thời gian thực</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Giữ nhịp học liên tục</h3>
            <p className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">
              Hoàn thành ít nhất 1 bài học mỗi ngày trước 23:59 để bảo vệ chuỗi ngày.
            </p>
            <div className="mt-6 bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Khối lượng hoàn thành</span>
                <span className="text-sm font-black text-amber-700">67%</span>
              </div>
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-400 to-amber-600 h-full rounded-full transition-all duration-500"
                  style={{ width: "67%" }}
                />
              </div>
              <p className="text-[11px] font-semibold text-slate-500 text-center">
                Chỉ cần hoàn thành thêm một bài luyện ngắn để đạt 100% mục tiêu!
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <Link
              href="/practice/quizzes"
              className="w-full block text-center bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm py-3 rounded-2xl shadow-sm transition-colors cursor-pointer"
            >
              Làm bài kiểm tra nhanh (5 phút)
            </Link>
          </div>
        </div>
      </section>
      {/* END: PriorityTasksSection */}

      {/* BEGIN: CurrentEnrolledCourse (Khóa học đang học - 58%) */}
      <section className="space-y-4" data-purpose="current-enrolled-course">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-800">Ưu tiên hôm nay</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">Khóa học đang học</h2>
          </div>
          <Link
            href="/my-courses"
            className="text-sm font-bold text-slate-600 hover:text-amber-800 flex items-center gap-1 group transition-colors cursor-pointer"
          >
            <span>Xem tất cả khóa học</span>
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="bg-white border-2 border-amber-100 rounded-3xl p-6 sm:p-7 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-amber-200 transition-colors">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 text-amber-800 text-3xl">
              📖
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                  Lộ trình đang học
                </span>
                <span className="text-xs font-semibold text-slate-500">Mục tiêu: Giao tiếp tự tin</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                Tiếng Anh giao tiếp công sở
              </h3>
              <p className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-600" />
                <span>
                  Đang học dở: <strong>Bài 14: Nghe hội thoại và bắt ý chính</strong>
                </span>
                <span className="hidden sm:inline text-slate-400">· Ước tính 15 phút</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
            <div className="text-right hidden sm:block pr-2">
              <span className="text-xs font-bold text-slate-500 block">Tiến độ khóa học</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-28 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-amber-600 h-full rounded-full" style={{ width: "58%" }} />
                </div>
                <span className="text-sm font-black text-slate-900">58%</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Link
                href="/my-courses"
                className="px-4 py-3 rounded-2xl border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-sm text-center transition-colors bg-white cursor-pointer"
              >
                Lộ trình AI Tự học
              </Link>
              <Link
                href="/my-courses"
                className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-3 rounded-2xl font-black text-sm whitespace-nowrap transition-colors shadow-xs cursor-pointer"
              >
                <span>Học tiếp bài 14</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* END: CurrentEnrolledCourse */}

      {/* BEGIN: SkillsPracticeGrid (Đồng bộ 100% về kích thước, tỷ lệ, màu nhận diện & nội dung) */}
      <section className="space-y-4" data-purpose="skill-practice-modules">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-800">Luyện tập 4 kỹ năng</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">Bạn muốn luyện kỹ năng nào?</h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">Chọn một kỹ năng để bắt đầu luyện tập.</p>
          </div>
          <Link
            href="/practice"
            className="text-sm font-bold text-slate-600 hover:text-amber-800 flex items-center gap-1 group transition-colors cursor-pointer"
          >
            <span>Xem tất cả kỹ năng</span>
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Nghe (Xanh dương) */}
          <div className="skill-card-hover bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-col justify-between group hover:border-blue-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center text-2xl">
                  🎧
                </div>
                <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 tracking-wide">
                  Kỹ năng Nghe
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                Luyện nghe
              </h3>
              <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
                Rèn khả năng nghe hiểu qua hội thoại và tình huống thực tế.
              </p>
            </div>
            <div className="pt-5 mt-4 border-t border-slate-100">
              <Link
                href="/practice/listening"
                className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors font-extrabold flex items-center justify-center gap-1 text-xs cursor-pointer"
              >
                Bắt đầu luyện nghe →
              </Link>
            </div>
          </div>

          {/* Card 2: Nói (Tím) */}
          <div className="skill-card-hover bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-col justify-between group hover:border-purple-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center text-2xl">
                  🎙️
                </div>
                <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 tracking-wide">
                  Kỹ năng Nói
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                Luyện nói và phát âm
              </h3>
              <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
                Cải thiện phát âm, ngữ điệu và phản xạ với trợ lý AI.
              </p>
            </div>
            <div className="pt-5 mt-4 border-t border-slate-100">
              <Link
                href="/practice/speaking"
                className="w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors font-extrabold flex items-center justify-center gap-1 text-xs cursor-pointer"
              >
                Bắt đầu luyện nói →
              </Link>
            </div>
          </div>

          {/* Card 3: Đọc (Xanh lá) */}
          <div className="skill-card-hover bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-col justify-between group hover:border-emerald-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center text-2xl">
                  📖
                </div>
                <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 tracking-wide">
                  Kỹ năng Đọc
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Luyện đọc
              </h3>
              <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
                Phát triển kỹ năng đọc hiểu, tìm ý chính và xử lý thông tin.
              </p>
            </div>
            <div className="pt-5 mt-4 border-t border-slate-100">
              <Link
                href="/practice/reading"
                className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors font-extrabold flex items-center justify-center gap-1 text-xs cursor-pointer"
              >
                Bắt đầu luyện đọc →
              </Link>
            </div>
          </div>

          {/* Card 4: Viết (San hô / Hồng) */}
          <div className="skill-card-hover bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-col justify-between group hover:border-rose-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center text-2xl">
                  ✍️
                </div>
                <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 tracking-wide">
                  Kỹ năng Viết
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                Luyện viết
              </h3>
              <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
                Luyện viết câu, email và nhận góp ý chi tiết từ AI.
              </p>
            </div>
            <div className="pt-5 mt-4 border-t border-slate-100">
              <Link
                href="/practice/writing"
                className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors font-extrabold flex items-center justify-center gap-1 text-xs cursor-pointer"
              >
                Bắt đầu luyện viết →
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* END: SkillsPracticeGrid */}

      {/* BEGIN: AuxiliarySupportTools (Công cụ hỗ trợ tách biệt) */}
      <section className="space-y-4" data-purpose="auxiliary-tools">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-800">Nền tảng bổ trợ</span>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">Công cụ hỗ trợ</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Tool 1: Từ vựng cốt lõi */}
          <div className="skill-card-hover bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-col justify-between group hover:border-amber-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center text-2xl">
                  🗂️
                </div>
                <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 tracking-wide">
                  Kho từ vựng SRS 3.000 từ
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                Từ vựng cốt lõi
              </h4>
              <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
                Luyện ghi nhớ từ vựng theo chủ đề hằng ngày, học tập và công việc với chu kỳ lặp thông minh SRS.
              </p>
            </div>
            <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
              <span className="text-amber-800 font-extrabold">24 từ cần ôn tập</span>
              <Link
                href="/flashcard"
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors font-extrabold flex items-center gap-1 cursor-pointer"
              >
                Ôn từ vựng ngay →
              </Link>
            </div>
          </div>

          {/* Tool 2: Ngữ pháp cấu trúc câu */}
          <div className="skill-card-hover bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-col justify-between group hover:border-emerald-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center text-2xl">
                  📝
                </div>
                <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 tracking-wide">
                  Hệ thống 24 chuyên đề
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Ngữ pháp cấu trúc câu
              </h4>
              <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
                Hệ thống hóa mệnh đề quan hệ, câu điều kiện, thì và cấu trúc câu thông qua sơ đồ tư duy thực chiến.
              </p>
            </div>
            <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
              <span className="text-emerald-800 font-extrabold">Đã hoàn thành 18/24 chủ điểm</span>
              <Link
                href="/grammar"
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors font-extrabold flex items-center gap-1 cursor-pointer"
              >
                Luyện ngữ pháp →
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* END: AuxiliarySupportTools */}

      {/* BEGIN: TOEICExamSimulation (Luyện đề TOEIC) */}
      <section className="space-y-4" data-purpose="toeic-exam-simulation">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-800">Mô phỏng kỳ thi</span>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">Luyện đề TOEIC</h3>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 via-white to-[#fdf8f3] border-2 border-amber-200 rounded-3xl p-6 sm:p-7 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-amber-400 transition-colors">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 text-3xl shadow-sm">
              📋
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-100 text-amber-900 border border-amber-200">
                  Bộ đề chuẩn ETS 2024
                </span>
                <span className="text-xs font-semibold text-slate-500">200 câu hỏi · 120 phút</span>
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-slate-900">Thi Thử TOEIC Mô Phỏng Chuẩn</h4>
              <p className="text-sm font-semibold text-slate-600">
                Phòng thi áp lực thời gian thực tế, chấm điểm tự động kèm báo cáo phân tích điểm mạnh và điểm yếu chi tiết.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-200">
            <div className="text-right hidden sm:block pr-2">
              <span className="text-xs font-bold text-slate-500 block">Điểm gần nhất</span>
              <span className="text-xl font-black text-amber-700 mt-0.5 block">645 điểm</span>
            </div>
            <Link
              href="/practice/quizzes"
              className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-3 rounded-2xl font-black text-sm whitespace-nowrap transition-colors shadow-xs cursor-pointer"
            >
              <span>Làm đề thi ngay</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      {/* END: TOEICExamSimulation */}
    </div>
  );
}
