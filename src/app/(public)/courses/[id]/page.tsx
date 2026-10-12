"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Headphones,
  Lightbulb,
  LockKeyhole,
  Mic,
  PenTool,
  PlayCircle,
  Target,
} from "lucide-react";
import {
  courseService,
  CourseV5Overview,
  PublicCourseDetail,
} from "@/lib/api/services/course.service";
import { useAuthStore } from "@/stores/authStore";
import { getCourseCardMedia } from "@/lib/course/catalogVisual";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import toast from "react-hot-toast";

function getActivityIcon(skill: string | null) {
  switch (skill) {
    case "LISTENING":
      return (
        <Headphones size={18} className="text-blue-600 dark:text-blue-400" />
      );
    case "SPEAKING":
      return (
        <Mic size={18} className="text-emerald-600 dark:text-emerald-400" />
      );
    case "READING":
      return (
        <BookOpen size={18} className="text-amber-600 dark:text-amber-400" />
      );
    case "WRITING":
      return (
        <PenTool size={18} className="text-indigo-600 dark:text-indigo-400" />
      );
    default:
      return (
        <BookOpen size={18} className="text-slate-600 dark:text-slate-400" />
      );
  }
}

export default function PublicCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const id = Number(params?.id);
  const [course, setCourse] = useState<PublicCourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [learningOverview, setLearningOverview] =
    useState<CourseV5Overview | null>(null);

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) {
      setError("Khóa học không hợp lệ.");
      setLoading(false);
      return;
    }
    courseService
      .getPublicCourseDetail(id)
      .then(setCourse)
      .catch((err) =>
        setError(
          err?.response?.status === 404
            ? "Khóa học không tồn tại hoặc chưa được công khai."
            : "Không thể tải khóa học.",
        ),
      )
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!course?.canAccess || !user) return;
    courseService
      .getCourseLearningOverview(id)
      .then(setLearningOverview)
      .catch(() => setLearningOverview(null));
  }, [course?.canAccess, id, user]);

  const start = async () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/courses/${id}`)}`);
      return;
    }
    if (!course) return;
    setStarting(true);
    try {
      // V5-only courses (such as the authored pronunciation course) do not
      // have a legacy curriculum/start endpoint. They are already authorized
      // by the learner's entitlement, so go straight to the canonical V5 shell.
      if (course.lessons.length === 0 && course.canAccess) {
        router.push(`/my-courses/${id}`);
        return;
      }
      await courseService.startCourse(id);
      toast.success("Đã mở lộ trình tự học");
      router.push(`/my-courses/${id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể bắt đầu khóa học."));
    } finally {
      setStarting(false);
    }
  };

  if (loading)
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-10 animate-pulse space-y-6">
        <div className="h-10 w-1/4 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-96 rounded-3xl bg-slate-100 dark:bg-slate-900" />
          <div className="lg:col-span-5 h-96 rounded-3xl bg-slate-100 dark:bg-slate-900" />
        </div>
      </div>
    );

  if (error || !course)
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-24 text-center">
        <AlertCircle className="mx-auto mb-4 text-rose-500" size={44} />
        <p className="text-xl text-slate-700 dark:text-slate-200">
          {error || "Không tìm thấy khóa học."}
        </p>
        <Link
          className="mt-6 inline-flex items-center gap-2 text-base font-semibold text-blue-600 hover:underline"
          href="/courses"
        >
          <ArrowLeft size={18} />
          Danh mục khóa học
        </Link>
      </div>
    );

  const activities =
    course.curriculum?.lessons.flatMap((lesson) => lesson.activities) ?? [];
  const v5Lessons = learningOverview?.lessons ?? [];
  const displayLessons = v5Lessons.length
    ? v5Lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.summary,
        order: lesson.order,
        activities: [],
      }))
    : course.lessons;
  const activityCount = v5Lessons.length
    ? v5Lessons.reduce((total, lesson) => total + lesson.exerciseCount, 0)
    : activities.length;
  const media = getCourseCardMedia(course);
  const mediaSrc = mediaFailed ? media.fallbackSrc : media.src;

  return (
    <div className="w-full space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 lg:py-10">
      <Link
        href="/courses"
        className="inline-flex items-center gap-2 text-base font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        Tất cả khóa học
      </Link>

      {/* 2-Column Responsive Layout: Left = Content in Image 1, Right = Lộ trình học */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-10 items-start">
        {/* LEFT COLUMN: Hero banner card + Overview + Objectives + Study Guidance */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6 lg:space-y-8">
          {/* Main Course Header Card */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-10 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-bold">
              <span className="rounded-full bg-blue-50 px-3.5 py-1 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                {course.level || "Cơ bản"}
              </span>
              <span className="rounded-full bg-emerald-50 px-3.5 py-1 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                Tự học theo lộ trình
              </span>
              {!course.canAccess && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  <LockKeyhole size={14} />
                  Gói PRO
                </span>
              )}
            </div>

            <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              {course.title}
            </h1>

            <p className="mt-4 text-base sm:text-lg lg:text-xl leading-relaxed text-slate-600 dark:text-slate-300">
              {course.description ||
                "Củng cố ngữ pháp cốt lõi và vốn từ thông dụng/TOEIC theo chủ đề để hỗ trợ cả bốn kỹ năng."}
            </p>

            {/* Media Image Banner */}
            <div className="mt-6 relative h-48 sm:h-56 lg:h-64 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
              {mediaSrc ? (
                <Image
                  src={mediaSrc}
                  alt={media.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 850px"
                  className="object-cover"
                  onError={() => setMediaFailed(true)}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <BookOpen className="text-blue-600" size={48} />
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <button
                onClick={start}
                disabled={starting || !course.canAccess}
                className="inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-2xl bg-blue-600 px-7 py-3.5 text-base font-bold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/30 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
              >
                {starting ? (
                  "Đang mở..."
                ) : course.canAccess ? (
                  <>
                    <PlayCircle size={20} />
                    Bắt đầu / tiếp tục
                  </>
                ) : (
                  <>
                    <LockKeyhole size={20} />
                    Cần gói PRO
                  </>
                )}
              </button>
              {!course.canAccess && (
                <Link
                  href="/plans?highlight=pro"
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50/50 px-6 py-3.5 text-base font-bold text-amber-700 hover:bg-amber-100/60 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300 transition-colors"
                >
                  <ArrowRight size={18} />
                  Xem gói PRO
                </Link>
              )}
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <span className="block text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  Quy mô
                </span>
                <span className="mt-1 block text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {displayLessons.length} bài học
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <span className="block text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  Hoạt động
                </span>
                <span className="mt-1 block text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {activityCount} bài thực hành
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <span className="block text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  Hình thức
                </span>
                <span className="mt-1 block text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Tự học theo tiến độ
                </span>
              </div>
            </div>
          </section>

          {/* Pedagogical Deep-Dive: Giới thiệu & Mục tiêu */}
          {course.learning && (
            <div className="space-y-6">
              {/* Giới thiệu khóa học */}
              <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-9 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Giới thiệu khóa học
                </p>
                <p className="mt-3 text-base sm:text-lg lg:text-xl leading-relaxed text-slate-700 dark:text-slate-200">
                  {course.learning.introduction}
                </p>
              </section>

              {/* Bạn sẽ học được gì & Cách học khóa này */}
              <div className="grid gap-6 md:grid-cols-2">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="flex items-center gap-2.5 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    <Target
                      size={22}
                      className="text-blue-600 dark:text-blue-400 shrink-0"
                    />
                    Bạn sẽ học được gì?
                  </h2>
                  <ul className="mt-4 space-y-3.5 text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                    {course.learning.objectives.map((objective) => (
                      <li key={objective} className="flex items-start gap-2.5">
                        <span className="text-blue-500 font-bold leading-relaxed">
                          •
                        </span>
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="flex items-center gap-2.5 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    <Lightbulb size={22} className="text-amber-500 shrink-0" />
                    Cách học khóa này
                  </h2>
                  <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                    {course.learning.studyGuidance}
                  </p>
                </section>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Lộ trình học (Curriculum) */}
        <div className="lg:col-span-5 xl:col-span-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Lộ trình học
                </h2>
                <p className="mt-1.5 text-base text-slate-500 dark:text-slate-400 font-medium">
                  {displayLessons.length} bài học · {activityCount} hoạt động
                </p>
              </div>
              {course.curriculum && (
                <span className="rounded-full bg-emerald-50 px-3.5 py-1 text-xs sm:text-sm font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {course.curriculum.readiness}
                </span>
              )}
            </div>

            <div className="mt-6 space-y-4">
              {displayLessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-5 dark:border-slate-800 dark:bg-slate-950/40"
                >
                  <div className="flex items-start gap-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100/70 text-blue-800 text-sm font-bold dark:bg-blue-950/80 dark:text-blue-200">
                      {lesson.order || index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                        {lesson.title}
                      </h3>
                      {lesson.description && (
                        <p className="mt-1.5 text-sm sm:text-base leading-relaxed text-slate-500 dark:text-slate-400">
                          {lesson.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {lesson.activities.length > 0 && (
                    <div className="mt-4 space-y-2.5">
                      {lesson.activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                              {getActivityIcon(activity.skill)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-base font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {activity.title}
                              </p>
                              <p className="text-xs sm:text-sm text-slate-500">
                                {activity.skill || "Bài học"}
                                {activity.required
                                  ? " · Bắt buộc"
                                  : " · Tùy chọn"}
                              </p>
                            </div>
                          </div>
                          {!course.canAccess && (
                            <LockKeyhole
                              size={16}
                              className="text-slate-400 shrink-0"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {course.canAccess && activityCount === 0 && (
              <p className="mt-6 text-base text-amber-700 dark:text-amber-300 font-medium">
                Khóa học chưa có hoạt động học tập khả dụng.
              </p>
            )}
            {course.canAccess && (
              <p className="mt-6 flex items-center gap-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-4 dark:border-slate-800">
                <CheckCircle2 size={17} className="text-emerald-500 shrink-0" />
                Bắt đầu khóa học để truy cập bài học và làm bài tập.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
