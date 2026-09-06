"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Users, Award, CheckCircle2, ChevronRight, GraduationCap } from "lucide-react";
import { courseService, PublicCourseCard } from "@/lib/api/services/course.service";

export default function LandingPage() {
  const [courses, setCourses] = useState<PublicCourseCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    courseService
      .getPublicCatalog()
      .then((data) => {
        if (isMounted) {
          setCourses(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load catalog:", err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const featuredCourses = courses.slice(0, 3);

  return (
    <div className="space-y-24 py-12 md:py-16">
      {/* 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-junior-blue font-bold text-sm">
              <GraduationCap size={18} />
              Nền tảng Đào tạo Tiếng Anh Chuẩn Quốc Tế
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Khơi dậy tiềm năng ngôn ngữ cùng{" "}
              <span className="text-junior-blue">BreadTrans Junior</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl">
              Phương pháp giảng dạy tương tác toàn diện 4 kỹ năng Nghe - Nói - Đọc - Viết. Lớp học sĩ số nhỏ, đội ngũ giảng viên tâm huyết giúp học viên tự tin bứt phá.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/courses"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-junior-orange text-white text-lg font-bold hover:bg-junior-orange-dark transition-all shadow-md hover:shadow-lg"
              >
                Khám phá khóa học
                <ArrowRight size={20} strokeWidth={2.5} />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 text-lg font-bold hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Tạo tài khoản học viên
              </Link>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200/80">
              <div>
                <p className="text-3xl font-extrabold text-slate-900">100%</p>
                <p className="text-sm font-semibold text-slate-500 mt-1">Giảng viên chuyên môn</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-slate-900">4 Kỹ năng</p>
                <p className="text-sm font-semibold text-slate-500 mt-1">Lộ trình chuẩn hóa</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-slate-900">Sĩ số nhỏ</p>
                <p className="text-sm font-semibold text-slate-500 mt-1">Tối đa tương tác</p>
              </div>
            </div>
          </div>

          {/* Hero Visual Card */}
          <div className="lg:col-span-5">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="space-y-6 relative z-10">
                <div className="inline-block px-3 py-1 rounded-lg bg-white/20 text-white text-xs font-bold uppercase tracking-wider">
                  Trải nghiệm lớp học
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold leading-snug">
                  Môi trường học tập vui nhộn và tràn đầy động lực
                </h3>
                <p className="text-blue-100 text-base leading-relaxed">
                  Học viên được rèn luyện phát âm, mở rộng vốn từ vựng và tự tin nói tiếng Anh qua các bài giảng sinh động, tương tác trực tiếp cùng thầy cô.
                </p>

                <div className="pt-4 space-y-3">
                  {[
                    "Lớp học sĩ số tối ưu, theo sát từng bạn nhỏ",
                    "Khung chương trình minh bạch, bài bản",
                    "Hệ sinh thái bài tập và luyện nói thông minh",
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm font-semibold text-white">
                      <CheckCircle2 size={18} className="text-blue-200 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED COURSES SECTION */}
      <section className="bg-white py-16 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-sm font-extrabold uppercase tracking-wider text-junior-blue">
                Khóa học nổi bật
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">
                Lộ trình đào tạo được tin chọn
              </h2>
            </div>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 text-base font-bold text-junior-blue hover:text-junior-blue-dark transition-colors"
            >
              Xem toàn bộ khóa học
              <ChevronRight size={18} />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-80 bg-slate-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : featuredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredCourses.map((course) => (
                <div
                  key={course.id}
                  className="group bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-junior-blue uppercase tracking-wide">
                        {course.level || "Cơ bản"}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {course.upcomingClassCount > 0
                          ? `${course.upcomingClassCount} lớp sắp mở`
                          : "Đang cập nhật lịch"}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-junior-blue transition-colors line-clamp-2">
                      {course.title}
                    </h3>

                    <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                      {course.description || "Khóa học được thiết kế bám sát năng lực học viên, cung cấp kỹ năng thực chiến và kiến thức nền tảng vững chắc."}
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                        {course.teacher?.fullName?.[0] || "G"}
                      </div>
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[130px]">
                        {course.teacher?.fullName || "Giảng viên trung tâm"}
                      </span>
                    </div>

                    <Link
                      href={`/courses/${course.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-800 hover:bg-junior-blue hover:text-white hover:border-junior-blue transition-all"
                    >
                      Chi tiết
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-200">
              <p className="text-slate-500 font-medium">Hiện đang cập nhật danh sách khóa học mới.</p>
            </div>
          )}
        </div>
      </section>

      {/* 3. FOUR CORE PILLARS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-sm font-extrabold uppercase tracking-wider text-junior-blue">
            Vì sao chọn BreadTrans?
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Giá trị thực chất cho từng buổi học
          </h2>
          <p className="text-slate-600 text-base">
            Mỗi giờ học đều được tối ưu để học viên tiếp thu chủ động và hứng thú.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            {
              icon: <BookOpen className="text-blue-600" size={28} />,
              title: "Giáo trình chuẩn hóa",
              desc: "Nội dung bài học biên soạn khoa học, rõ ràng từ cơ bản đến nâng cao.",
            },
            {
              icon: <Users className="text-emerald-600" size={28} />,
              title: "Tương tác trực tiếp",
              desc: "Quy mô lớp học vừa phải, đảm bảo từng học viên được thầy cô sửa lỗi và động viên.",
            },
            {
              icon: <Award className="text-amber-600" size={28} />,
              title: "Giảng viên tâm huyết",
              desc: "Đội ngũ thầy cô giàu kinh nghiệm, thấu hiểu tâm lý lứa tuổi học sinh.",
            },
            {
              icon: <CheckCircle2 className="text-purple-600" size={28} />,
              title: "Đồng hành liên tục",
              desc: "Báo cáo tiến độ học tập, bài tập sau giờ học giúp phụ huynh luôn an tâm.",
            },
          ].map((pillar, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 hover:shadow-xs transition-shadow"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                {pillar.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900">{pillar.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. FINAL CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-center text-white space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Sẵn sàng nâng tầm tiếng Anh cùng BreadTrans?
          </h2>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
            Xem lịch khai giảng các lớp sắp mở hoặc đăng ký tài khoản để nhận tư vấn lộ trình học phù hợp nhất.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/courses"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-junior-blue text-white font-bold text-base hover:bg-junior-blue-dark transition-colors shadow-md"
            >
              Xem danh sách lớp học
            </Link>
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-base transition-colors border border-white/20"
            >
              Đăng ký học viên mới
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
