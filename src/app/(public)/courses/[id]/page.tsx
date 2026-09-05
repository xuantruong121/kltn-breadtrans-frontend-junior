"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  User as UserIcon,
  Users,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { courseService, PublicCourseDetail } from "@/lib/api/services/course.service";

export default function PublicCourseDetailPage() {
  const params = useParams();

  const id = Number(params?.id);

  const [course, setCourse] = useState<PublicCourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || isNaN(id)) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setNotFound(false);
    setError(null);

    courseService
      .getPublicCourseDetail(id)
      .then((data) => {
        if (isMounted) {
          setCourse(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error loading public course detail:", err);
        if (isMounted) {
          if (err.response?.status === 404) {
            setNotFound(true);
          } else {
            setError("Không thể tải thông tin khóa học. Vui lòng thử lại sau.");
          }
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Đang cập nhật";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48" />
        <div className="h-10 bg-slate-200 rounded-xl w-3/4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-40 bg-slate-100 rounded-3xl" />
            <div className="h-64 bg-slate-100 rounded-3xl" />
          </div>
          <div className="h-96 bg-slate-100 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (notFound || !course) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Khóa học không tồn tại hoặc chưa được công khai
        </h1>
        <p className="text-slate-600 max-w-md mx-auto text-base">
          Nội dung bạn đang tìm kiếm có thể đã được gỡ bỏ hoặc đang trong quá trình biên tập nội dung.
        </p>
        <div className="pt-2">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-junior-blue text-white font-bold hover:bg-junior-blue-dark transition-colors shadow-xs"
          >
            <ArrowLeft size={18} />
            Quay lại danh mục khóa học
          </Link>
        </div>
      </div>
    );
  }

  const redirectUrl = `/courses/${course.id}`;
  const loginCtaUrl = `/login?redirect=${encodeURIComponent(redirectUrl)}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* 1. Breadcrumb & Back button */}
      <div>
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Tất cả khóa học
        </Link>
      </div>

      {/* 2. Hero Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-junior-blue border border-blue-200/60 uppercase tracking-wide">
            {course.level || "Cơ bản"}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Chương trình chuẩn hóa
          </span>
          {course.classes.length > 0 ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {course.classes.length} lớp sắp khai giảng
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              Đang cập nhật lịch khai giảng
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          {course.title}
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-4xl">
          {course.description || "Khóa học cung cấp kiến thức nền tảng vững vàng, phát triển toàn diện các kỹ năng nghe nói đọc viết và tự tin ứng dụng trong môi trường học tập."}
        </p>

        {/* Teacher profile highlight */}
        <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-junior-blue flex items-center justify-center font-bold text-lg">
            {course.teacher.fullName?.[0] || "G"}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phụ trách chuyên môn</p>
            <p className="text-base font-bold text-slate-900">{course.teacher.fullName}</p>
            {course.teacher.specialization && (
              <p className="text-xs font-semibold text-slate-500">{course.teacher.specialization}</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Curriculum (Left) & Upcoming Classes Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Curriculum Outline & Highlights */}
        <div className="lg:col-span-7 space-y-8">
          {/* Curriculum Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Khung chương trình học</h2>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Tổng quan nội dung đào tạo theo từng bài học
                </p>
              </div>
              <div className="px-3 py-1 rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                {course.lessons.length} bài học
              </div>
            </div>

            {course.lessons.length > 0 ? (
              <div className="space-y-3">
                {course.lessons.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-4 hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 mt-0.5">
                      {lesson.order || idx + 1}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-900">{lesson.title}</h4>
                      {lesson.description && (
                        <p className="text-sm text-slate-600 leading-relaxed">{lesson.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Khung giáo trình đang được hoàn thiện cập nhật.
              </div>
            )}

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">Lưu ý:</span> Khung chương trình trên là nội dung tổng quan. Tài liệu độc quyền, video hướng dẫn và hệ thống bài tập thực hành sẽ được mở trong tài khoản của học viên sau khi nhập học vào lớp.
            </div>
          </div>

          {/* Value Highlights */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Cam kết chất lượng đào tạo</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <p className="font-bold text-sm text-slate-900">Tương tác trực tiếp</p>
                <p className="text-xs text-slate-600">Giảng viên sửa phát âm và theo sát phản xạ từng học viên.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <p className="font-bold text-sm text-slate-900">Kiểm tra định kỳ</p>
                <p className="text-xs text-slate-600">Đánh giá tiến độ sau mỗi học phần để phụ huynh nắm rõ năng lực.</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Upcoming Classes (Sidebar) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Lịch mở lớp sắp tới</h3>
              <p className="text-xs text-slate-500 mt-1">
                Các lớp dự kiến khai giảng nhận đăng ký tư vấn
              </p>
            </div>

            {course.classes.length > 0 ? (
              <div className="space-y-4">
                {course.classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-base font-bold text-slate-900">{cls.name}</h4>
                      {cls.isSoldOut ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-200 text-slate-600 shrink-0">
                          Đã hết chỗ
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700 shrink-0">
                          Còn {cls.remainingSeats} chỗ
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        <span>Khai giảng: <strong className="text-slate-800">{formatDate(cls.startDate)}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-slate-400 shrink-0" />
                        <span>Sĩ số dự kiến: {cls.capacity} học viên</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserIcon size={14} className="text-slate-400 shrink-0" />
                        <span>Giảng viên: <strong className="text-slate-800">{cls.teacher.fullName}</strong></span>
                      </div>
                    </div>

                    <div className="pt-2">
                      {cls.isSoldOut ? (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-400 cursor-not-allowed text-center"
                        >
                          Lớp đã đủ học viên
                        </button>
                      ) : (
                        <Link
                          href={loginCtaUrl}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-junior-orange text-white hover:bg-junior-orange-dark transition-all shadow-xs"
                        >
                          Đăng ký nhận tư vấn lớp này
                          <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Calendar className="mx-auto text-slate-300" size={36} />
                <p className="text-sm font-bold text-slate-700">Chưa có lịch mở lớp mới</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Trung tâm đang hoàn thiện lịch khai giảng cho khóa học này. Hãy đăng ký tài khoản hoặc liên hệ hotline để nhận thông báo sớm nhất.
                </p>
              </div>
            )}

            {/* Registration Guidance Note */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Sau khi đăng nhập hoặc đăng ký tài khoản, bạn sẽ được trung tâm liên hệ để tư vấn xếp lớp và hướng dẫn thủ tục nhập học chi tiết.
              </p>
              <Link
                href={loginCtaUrl}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                Đăng nhập tài khoản học viên
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
