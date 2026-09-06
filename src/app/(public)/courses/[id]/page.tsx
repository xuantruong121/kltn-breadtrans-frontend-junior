"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  User as UserIcon,
  Users,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  X,
  Loader2,
} from "lucide-react";
import {
  courseService,
  PublicCourseDetail,
  PublicClass,
  StudentCourseEnrollment,
} from "@/lib/api/services/course.service";
import { useAuthStore } from "@/stores/authStore";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import toast from "react-hot-toast";

export default function PublicCourseDetailPage() {
  const params = useParams();
  const { user } = useAuthStore();

  const id = Number(params?.id);

  const [course, setCourse] = useState<PublicCourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Student enrollment mapping: classId -> StudentCourseEnrollment
  const [studentEnrollments, setStudentEnrollments] = useState<
    Record<number, StudentCourseEnrollment>
  >({});
  const [, setIsLoadingEnrollments] = useState(false);

  // Enrollment Confirmation Modal State
  const [selectedClassForEnroll, setSelectedClassForEnroll] =
    useState<PublicClass | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

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

  // Fetch current student's enrollments in this course
  useEffect(() => {
    if (!id || !user || user.role !== "STUDENT") {
      setStudentEnrollments({});
      return;
    }

    let isMounted = true;
    setIsLoadingEnrollments(true);

    courseService
      .getMyCourseEnrollments(id)
      .then((enrollments) => {
        if (isMounted) {
          const mapping: Record<number, StudentCourseEnrollment> = {};
          enrollments.forEach((e) => {
            mapping[e.classId] = e;
          });
          setStudentEnrollments(mapping);
          setIsLoadingEnrollments(false);
        }
      })
      .catch((err) => {
        console.warn("Could not load user course enrollments:", err);
        if (isMounted) {
          setIsLoadingEnrollments(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, user]);

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

  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
  };

  const handleConfirmEnroll = async () => {
    if (!selectedClassForEnroll) return;

    setIsEnrolling(true);
    try {
      const res = await courseService.enrollInClass(selectedClassForEnroll.id);

      // Update student enrollments map
      setStudentEnrollments((prev) => ({
        ...prev,
        [selectedClassForEnroll.id]: {
          id: res.enrollmentId,
          classId: res.classId,
          status: res.status,
          joinedAt: new Date().toISOString(),
        },
      }));

      // Update remaining seats locally if ACTIVE
      if (res.status === "ACTIVE" && course) {
        setCourse({
          ...course,
          classes: course.classes.map((c) =>
            c.id === selectedClassForEnroll.id
              ? {
                  ...c,
                  currentEnrollmentCount: c.currentEnrollmentCount + 1,
                  remainingSeats: Math.max(0, c.remainingSeats - 1),
                  isSoldOut: c.remainingSeats - 1 <= 0,
                }
              : c,
          ),
        });
      }

      toast.success(res.message);
      setSelectedClassForEnroll(null);
    } catch (err: any) {
      const msg = getApiErrorMessage(err, "Ghi danh lớp học thất bại. Vui lòng thử lại.");
      toast.error(msg);
    } finally {
      setIsEnrolling(false);
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

  if (error && !notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Không thể tải thông tin khóa học
        </h1>
        <p className="text-slate-600 max-w-md mx-auto text-base">{error}</p>
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
          {course.description ||
            "Khóa học cung cấp kiến thức nền tảng vững vàng, phát triển toàn diện các kỹ năng nghe nói đọc viết và tự tin ứng dụng trong môi trường học tập."}
        </p>

        {/* Teacher profile highlight */}
        <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-junior-blue flex items-center justify-center font-bold text-lg">
            {course.teacher.fullName?.[0] || "G"}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Phụ trách chuyên môn
            </p>
            <p className="text-base font-bold text-slate-900">{course.teacher.fullName}</p>
            {course.teacher.specialization && (
              <p className="text-xs font-semibold text-slate-500">
                {course.teacher.specialization}
              </p>
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
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Khung chương trình học
                </h2>
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
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {lesson.description}
                        </p>
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
              <span className="font-bold text-slate-800">Lưu ý:</span> Khung chương trình trên là
              nội dung tổng quan. Tài liệu độc quyền, video hướng dẫn và hệ thống bài tập thực hành
              sẽ được mở trong tài khoản của học viên sau khi nhập học vào lớp.
            </div>
          </div>

          {/* Value Highlights */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Cam kết chất lượng đào tạo</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <p className="font-bold text-sm text-slate-900">Tương tác trực tiếp</p>
                <p className="text-xs text-slate-600">
                  Giảng viên sửa phát âm và theo sát phản xạ từng học viên.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <p className="font-bold text-sm text-slate-900">Kiểm tra định kỳ</p>
                <p className="text-xs text-slate-600">
                  Đánh giá tiến độ sau mỗi học phần để phụ huynh nắm rõ năng lực.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Upcoming Classes (Sidebar) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Lịch mở lớp sắp tới
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Các lớp dự kiến khai giảng mở ghi danh trực tiếp
              </p>
            </div>

            {course.classes.length > 0 ? (
              <div className="space-y-4">
                {course.classes.map((cls) => {
                  const enrollment = studentEnrollments[cls.id];
                  const isEnrolledActive = enrollment?.status === "ACTIVE";
                  const isEnrolledPending = enrollment?.status === "PENDING_PAYMENT";
                  const isFree = cls.tuitionFeeVnd === 0;

                  return (
                    <div
                      key={cls.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 hover:border-slate-300 transition-colors"
                    >
                      {/* Class Header: Name + Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <h4 className="text-base font-bold text-slate-900">{cls.name}</h4>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isFree ? (
                              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Miễn phí
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {formatVnd(cls.tuitionFeeVnd)}
                              </span>
                            )}
                            {cls.isSoldOut ? (
                              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-200 text-slate-600">
                                Hết chỗ
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Còn {cls.remainingSeats} chỗ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Class Details */}
                      <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400 shrink-0" />
                          <span>
                            Khai giảng:{" "}
                            <strong className="text-slate-800">{formatDate(cls.startDate)}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-slate-400 shrink-0" />
                          <span>Sĩ số tối đa: {cls.capacity} học viên</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserIcon size={14} className="text-slate-400 shrink-0" />
                          <span>
                            Giảng viên:{" "}
                            <strong className="text-slate-800">{cls.teacher.fullName}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Action CTA Button */}
                      <div className="pt-2">
                        {!user ? (
                          /* 1. Guest: Login CTA */
                          <Link
                            href={loginCtaUrl}
                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-junior-orange text-white hover:bg-junior-orange-dark transition-all shadow-xs"
                          >
                            Đăng nhập để đăng ký lớp
                            <ArrowRight size={14} />
                          </Link>
                        ) : user.role !== "STUDENT" ? (
                          /* 2. Teacher or Admin */
                          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500 text-xs text-center font-medium">
                            Tài khoản {user.role === "TEACHER" ? "Giảng viên" : "Quản trị viên"} (quản lý tại Dashboard)
                          </div>
                        ) : isEnrolledActive ? (
                          /* 3. Student already ACTIVE */
                          <Link
                            href={`/classes/${cls.id}`}
                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs"
                          >
                            <CheckCircle2 size={15} />
                            Đã ghi danh • Vào lớp học
                          </Link>
                        ) : isEnrolledPending ? (
                          /* 4. Student PENDING_PAYMENT */
                          <div className="space-y-1.5">
                            <div className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-100 border border-amber-300 text-amber-800 text-center flex items-center justify-center gap-1.5">
                              <Clock size={14} />
                              Đang chờ thanh toán
                            </div>
                            <p className="text-[11px] text-slate-500 text-center">
                              Vui lòng xem thông tin tại{" "}
                              <Link href="/my-courses" className="text-junior-blue font-bold hover:underline">
                                Khóa học của tôi
                              </Link>
                            </p>
                          </div>
                        ) : cls.isSoldOut ? (
                          /* 5. Sold out */
                          <button
                            disabled
                            className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-400 cursor-not-allowed text-center"
                          >
                            Lớp đã đủ học viên
                          </button>
                        ) : isFree ? (
                          /* 6. Student Enroll FREE */
                          <button
                            onClick={() => setSelectedClassForEnroll(cls)}
                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-junior-orange text-white hover:bg-junior-orange-dark transition-all shadow-xs cursor-pointer"
                          >
                            Đăng ký miễn phí
                            <ArrowRight size={14} />
                          </button>
                        ) : (
                          /* 7. Student Enroll PAID */
                          <button
                            onClick={() => setSelectedClassForEnroll(cls)}
                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-junior-orange text-white hover:bg-junior-orange-dark transition-all shadow-xs cursor-pointer"
                          >
                            Đăng ký lớp
                            <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Calendar className="mx-auto text-slate-300" size={36} />
                <p className="text-sm font-bold text-slate-700">Chưa có lịch mở lớp mới</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Trung tâm đang hoàn thiện lịch khai giảng cho khóa học này. Hãy đăng ký tài khoản hoặc
                  liên hệ hotline để nhận thông báo sớm nhất.
                </p>
              </div>
            )}

            {/* Bottom Guidance Note */}
            {!user && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Đăng nhập tài khoản học viên để tự ghi danh vào các lớp học sắp khai giảng.
                </p>
                <Link
                  href={loginCtaUrl}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  Đăng nhập tài khoản học viên
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Enrollment Confirmation Modal */}
      {selectedClassForEnroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedClassForEnroll.tuitionFeeVnd === 0
                    ? "Xác nhận ghi danh miễn phí"
                    : "Xác nhận đăng ký lớp học"}
                </h3>
                <p className="text-xs text-slate-500">{course.title}</p>
              </div>
              <button
                onClick={() => !isEnrolling && setSelectedClassForEnroll(null)}
                disabled={isEnrolling}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Lớp học:</span>
                  <strong className="text-slate-900">{selectedClassForEnroll.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Khai giảng:</span>
                  <span className="text-slate-700 font-medium">
                    {formatDate(selectedClassForEnroll.startDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Giảng viên:</span>
                  <span className="text-slate-700 font-medium">
                    {selectedClassForEnroll.teacher.fullName}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500 text-xs">Học phí:</span>
                  {selectedClassForEnroll.tuitionFeeVnd === 0 ? (
                    <span className="font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-lg text-xs">
                      Miễn phí
                    </span>
                  ) : (
                    <span className="font-bold text-slate-900 text-base">
                      {formatVnd(selectedClassForEnroll.tuitionFeeVnd)}
                    </span>
                  )}
                </div>
              </div>

              {/* Specific notice for Free vs Paid */}
              {selectedClassForEnroll.tuitionFeeVnd === 0 ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-800 leading-relaxed flex items-start gap-2.5">
                  <ShieldCheck size={18} className="shrink-0 mt-0.5 text-emerald-600" />
                  <span>
                    Lớp học hoàn toàn miễn phí. Sau khi xác nhận, bạn sẽ được cấp quyền truy cập
                    bài giảng và tài liệu học tập ngay lập tức.
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed flex items-start gap-2.5">
                  <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    <strong>Lưu ý quan trọng:</strong> Đăng ký sẽ tạo yêu cầu ở trạng thái{" "}
                    <strong>Chờ thanh toán</strong> và <strong>chưa giữ chỗ học chính thức</strong>.
                    Chỗ học chỉ được xác nhận khi hoàn tất học phí.
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedClassForEnroll(null)}
                disabled={isEnrolling}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmEnroll}
                disabled={isEnrolling}
                className="flex-1 py-3 rounded-xl bg-junior-orange text-white font-bold text-xs hover:bg-junior-orange-dark transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isEnrolling ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Đang xử lý...
                  </>
                ) : selectedClassForEnroll.tuitionFeeVnd === 0 ? (
                  "Xác nhận ghi danh"
                ) : (
                  "Xác nhận đăng ký"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
