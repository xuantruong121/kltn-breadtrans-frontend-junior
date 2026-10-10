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
  LockKeyhole,
  Lightbulb,
  PlayCircle,
  Target,
} from "lucide-react";
import {
  courseService,
  PublicCourseDetail,
} from "@/lib/api/services/course.service";
import { useAuthStore } from "@/stores/authStore";
import { getCourseCardMedia } from "@/lib/course/catalogVisual";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import toast from "react-hot-toast";

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

  const start = async () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/courses/${id}`)}`);
      return;
    }
    setStarting(true);
    try {
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
      <div className="mx-auto max-w-5xl px-4 py-20 animate-pulse">
        <div className="h-10 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-6 h-48 rounded-3xl bg-slate-100 dark:bg-slate-900" />
      </div>
    );
  if (error || !course)
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <AlertCircle className="mx-auto mb-4 text-rose-500" size={40} />
        <p className="text-slate-700 dark:text-slate-200">
          {error || "Không tìm thấy khóa học."}
        </p>
        <Link
          className="mt-6 inline-flex items-center gap-2 text-blue-600"
          href="/courses"
        >
          <ArrowLeft size={16} />
          Danh mục khóa học
        </Link>
      </div>
    );

  const activities =
    course.curriculum?.lessons.flatMap((lesson) => lesson.activities) ?? [];
  const media = getCourseCardMedia(course);
  const mediaSrc = mediaFailed ? media.fallbackSrc : media.src;
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <Link
        href="/courses"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft size={16} />
        Tất cả khóa học
      </Link>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_260px] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                {course.level || "Cơ bản"}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                Tự học theo lộ trình
              </span>
              {!course.canAccess && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <LockKeyhole size={13} />
                  PRO
                </span>
              )}
            </div>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {course.title}
            </h1>
            <p className="mt-4 max-w-3xl leading-relaxed text-slate-600 dark:text-slate-300">
              {course.description ||
                "Lộ trình tiếng Anh tự học theo tiến độ cá nhân."}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={start}
                disabled={starting || !course.canAccess}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {starting ? (
                  "Đang mở..."
                ) : course.canAccess ? (
                  <>
                    <PlayCircle size={17} />
                    Bắt đầu / tiếp tục
                  </>
                ) : (
                  <>
                    <LockKeyhole size={17} />
                    Cần gói PRO
                  </>
                )}
              </button>
              {!course.canAccess && (
                <Link
                  href="/plans?highlight=pro"
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-300 px-5 py-3 text-sm font-bold text-amber-700 hover:bg-amber-50 dark:text-amber-300"
                >
                  <ArrowRight size={16} />
                  Xem gói PRO
                </Link>
              )}
            </div>
          </div>
          <div className="relative min-h-44 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 text-center dark:border-blue-900/50 dark:bg-blue-950/30">
            {mediaSrc ? (
              <Image
                src={mediaSrc}
                alt={media.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 260px"
                className="object-cover"
                onError={() => setMediaFailed(true)}
              />
            ) : (
              <div className="flex min-h-44 items-center justify-center">
                <BookOpen className="text-blue-600" size={34} />
              </div>
            )}
          </div>
        </div>
      </section>
      {course.learning && (
        <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Giới thiệu khóa học
            </p>
            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              {course.learning.introduction}
            </p>
          </div>
          <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Target size={17} className="text-blue-600" /> Bạn sẽ học được
                gì?
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {course.learning.objectives.map((objective) => (
                  <li key={objective}>• {objective}</li>
                ))}
              </ul>
            </div>
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Lightbulb size={17} className="text-amber-500" /> Cách học khóa
                này
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {course.learning.studyGuidance}
              </p>
            </div>
          </div>
        </section>
      )}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Lộ trình học
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {course.lessons.length} bài học · {activities.length} hoạt động
            </p>
          </div>
          {course.curriculum && (
            <span className="text-xs font-bold text-emerald-600">
              {course.curriculum.readiness}
            </span>
          )}
        </div>
        <div className="mt-5 space-y-4">
          {course.lessons.map((lesson, index) => (
            <div
              key={lesson.id}
              className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold dark:bg-slate-800">
                  {lesson.order || index + 1}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {lesson.title}
                  </h3>
                  {lesson.description && (
                    <p className="text-sm text-slate-500">
                      {lesson.description}
                    </p>
                  )}
                </div>
              </div>
              {lesson.activities.length > 0 && (
                <div className="mt-4 space-y-2">
                  {lesson.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {activity.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {activity.skill || "Bài học"}
                          {activity.required ? " · Bắt buộc" : " · Tùy chọn"}
                        </p>
                      </div>
                      {course.canAccess ? (
                        <Link
                          href={`/my-courses/${id}/lessons/${lesson.id}`}
                          className="text-blue-600"
                          aria-label={`Mở bài học ${lesson.title}`}
                        >
                          <ArrowRight size={16} />
                        </Link>
                      ) : (
                        <LockKeyhole size={15} className="text-slate-400" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {course.canAccess && activities.length === 0 && (
          <p className="mt-6 text-sm text-amber-700">
            Khóa học chưa có hoạt động học tập khả dụng.
          </p>
        )}
        {course.canAccess && (
          <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 size={15} className="text-emerald-500" />
            Hoàn thành theo thứ tự; tiến độ được lưu tự động.
          </p>
        )}
      </section>
    </div>
  );
}
