"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  LockKeyhole,
  Target,
} from "lucide-react";
import toast from "react-hot-toast";
import { courseService } from "@/lib/api/services/course.service";
import { courseLessonPath, withCourseReturn } from "@/lib/course/navigation";

export default function CourseLessonPage(props: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId: rawCourseId, lessonId: rawLessonId } = use(props.params);
  const courseId = Number(rawCourseId);
  const lessonId = Number(rawLessonId);
  const router = useRouter();
  const [mediaFailed, setMediaFailed] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["course-lesson", courseId, lessonId],
    queryFn: () => courseService.getCourseLesson(courseId, lessonId),
    enabled: Number.isInteger(courseId) && Number.isInteger(lessonId),
  });

  const openActivity = async (route: string, activityId: string) => {
    try {
      await courseService.getCourseActivityAccess(
        courseId,
        Number(activityId.replace("activity:", "")),
      );
      router.push(withCourseReturn(route, courseId, lessonId));
    } catch {
      toast.error("Hoạt động này đang bị khóa trong lộ trình.");
    }
  };

  if (isLoading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
        Đang tải bài học...
      </div>
    );
  if (error || !data)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-slate-600 dark:text-slate-300">
          Không thể mở bài học này hoặc bài học đang bị khóa.
        </p>
        <Link
          className="mt-5 inline-flex text-blue-600"
          href={`/my-courses/${courseId}`}
        >
          Quay lại khóa học
        </Link>
      </div>
    );

  const { lesson, course, navigation, progress } = data;
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Link
        href={`/my-courses/${courseId}`}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft size={16} /> {course.title}
      </Link>
      <header className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-9">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
          <BookOpen size={15} /> Lesson {lesson.order}
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {lesson.title}
        </h1>
        {lesson.description && (
          <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
            {lesson.description}
          </p>
        )}
        <div className="mt-6 rounded-2xl bg-blue-50 p-5 text-blue-950 dark:bg-blue-950/30 dark:text-blue-100">
          <p className="text-xs font-bold uppercase tracking-wider">
            Bối cảnh học tập
          </p>
          <p className="mt-2 leading-7">{course.learning?.introduction}</p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <article className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <BookOpen size={19} className="text-blue-600" /> Nội dung trọng
              tâm
            </h2>
            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              {lesson.theory.overview}
            </p>
          </div>
          <div>
            <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Target size={17} className="text-blue-600" /> Sau bài này bạn có
              thể
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {lesson.theory.keyPoints.map((point) => (
                <li key={point}>• {point}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
            <div className="flex gap-2">
              <Lightbulb size={17} className="mt-0.5 shrink-0 text-amber-600" />
              <span>
                Đọc kỹ phần hướng dẫn trước khi mở bài luyện tập. Bạn có thể
                quay lại lesson sau khi nộp bài để xem bước tiếp theo.
              </span>
            </div>
          </div>
          {lesson.materials.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white">
                Tài liệu của bài
              </h3>
              {lesson.materials.map((material) => (
                <div
                  key={material.id}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {material.title}
                  </p>
                  {material.objective && (
                    <p className="mt-1 text-sm text-slate-500">
                      {material.objective}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>
        <aside className="space-y-5">
          <div className="relative min-h-40 overflow-hidden rounded-3xl border border-blue-100 bg-blue-50 text-center dark:border-blue-900/50 dark:bg-blue-950/20">
            {course.learning?.coverImage && !mediaFailed ? (
              <Image
                src={course.learning.coverImage}
                alt={course.title}
                fill
                sizes="(max-width: 1024px) 100vw, 360px"
                className="object-cover"
                onError={() => setMediaFailed(true)}
              />
            ) : (
              <div className="flex min-h-40 items-center justify-center">
                <BookOpen className="text-blue-600" size={32} />
              </div>
            )}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-bold text-slate-900 dark:text-white">
              Luyện tập sau phần học
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Chọn một hoạt động cụ thể khi bạn đã sẵn sàng.
            </p>
            <div className="mt-4 space-y-2">
              {lesson.activities.map((activity) => {
                const state = progress?.activities.find(
                  (item) => item.id === activity.id,
                );
                const locked = state?.unlocked === false;
                return activity.route && !locked ? (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() =>
                      void openActivity(activity.route!, activity.id)
                    }
                    className="flex w-full items-center justify-between rounded-xl border border-blue-200 px-3 py-3 text-left text-sm font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
                  >
                    <span>
                      {activity.title}
                      <small className="mt-1 block text-xs font-normal text-slate-500">
                        {state?.completed
                          ? "Đã hoàn thành"
                          : activity.required
                            ? "Bắt buộc"
                            : "Tùy chọn"}
                      </small>
                    </span>
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:bg-slate-800/60"
                  >
                    <span>{activity.title}</span>
                    <LockKeyhole size={15} />
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </section>
      <nav className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          {navigation.previousLessonId ? (
            <Link
              href={courseLessonPath(courseId, navigation.previousLessonId)}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300"
            >
              <ArrowLeft size={16} /> Bài trước
            </Link>
          ) : (
            <span />
          )}
        </div>
        <div className="text-xs text-slate-500">
          Tiến độ: {progress?.percentage ?? 0}%{" "}
          <CheckCircle2 size={14} className="ml-1 inline text-emerald-500" />
        </div>
        <div>
          {navigation.nextLessonId ? (
            <Link
              href={courseLessonPath(courseId, navigation.nextLessonId)}
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300"
            >
              Bài tiếp theo <ArrowRight size={16} />
            </Link>
          ) : (
            <Link
              href={`/my-courses/${courseId}`}
              className="text-sm font-bold text-blue-700"
            >
              Xem tổng kết
            </Link>
          )}
        </div>
      </nav>
    </main>
  );
}
