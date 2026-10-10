"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  LockKeyhole,
  Loader2,
  Target,
} from "lucide-react";
import { courseService } from "@/lib/api/services/course.service";
import { courseLessonPath, withCourseReturn } from "@/lib/course/navigation";
import toast from "react-hot-toast";

export default function CourseDetailPage(props: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(props.params);
  const id = Number(courseId);
  const router = useRouter();
  const [mediaFailed, setMediaFailed] = useState(false);
  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: () => courseService.getCourseById(id),
    enabled: Number.isInteger(id),
  });
  if (isLoading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );
  if (!course)
    return (
      <div className="p-12 text-center">
        Không tìm thấy khóa học.
        <Link className="ml-2 text-blue-600" href="/courses">
          Quay lại
        </Link>
      </div>
    );
  const progress = course.progress;
  const openActivity = async (
    route: string,
    activityId: string,
    lessonId: number,
  ) => {
    try {
      await courseService.getCourseActivityAccess(
        id,
        Number(activityId.replace("activity:", "")),
      );
      router.push(withCourseReturn(route, id, lessonId));
    } catch {
      toast.error("Hoạt động này đang bị khóa trong lộ trình.");
    }
  };
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <Link
        href="/courses"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500"
      >
        <ArrowLeft size={16} />
        Danh mục khóa học
      </Link>
      <header>
        {course.learning?.coverImage && !mediaFailed && (
          <div className="relative mb-6 h-44 overflow-hidden rounded-3xl border border-blue-100 dark:border-blue-900/50 sm:h-56">
            <Image
              src={course.learning.coverImage}
              alt={course.title}
              fill
              sizes="(max-width: 1024px) 100vw, 800px"
              className="object-cover"
              onError={() => setMediaFailed(true)}
            />
          </div>
        )}
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
          {course.level || "Cơ bản"}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
          {course.title}
        </h1>
        <p className="mt-3 text-slate-500">
          {course.description || "Lộ trình tự học theo hoạt động kỹ năng."}
        </p>
        {progress && (
          <div className="mt-6 max-w-xl">
            <div className="mb-1 flex justify-between text-xs font-bold text-slate-500">
              <span>Tiến độ bắt buộc</span>
              <span>{progress.percentage}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            {progress.nextActivity?.lessonId && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    courseLessonPath(id, progress.nextActivity!.lessonId!),
                  )
                }
                className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-blue-600"
              >
                Tiếp tục: {progress.nextActivity.title}
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        )}
      </header>
      {course.learning && (
        <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Giới thiệu
            </p>
            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              {course.learning.introduction}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Target size={17} className="text-blue-600" /> Mục tiêu & cách học
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {course.learning.objectives.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <p className="mt-4 flex gap-2 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300">
              <Lightbulb size={16} className="mt-1 shrink-0 text-amber-500" />
              {course.learning.studyGuidance}
            </p>
          </div>
        </section>
      )}
      <section className="space-y-4">
        {course.curriculum?.lessons.map((lesson) => (
          <div
            key={lesson.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">
                  {lesson.order}. {lesson.title}
                </h2>
                {lesson.description && (
                  <p className="mt-1 text-sm text-slate-500">
                    {lesson.description}
                  </p>
                )}
              </div>
              <Link
                href={courseLessonPath(id, lesson.id)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 dark:border-blue-900 dark:text-blue-300"
              >
                Mở bài học <ArrowRight size={13} />
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {lesson.activities.map((activity) => {
                const status = progress?.activities.find(
                  (item) => item.id === activity.id,
                );
                const locked = status?.unlocked === false;
                return activity.route && !locked ? (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() =>
                      void openActivity(activity.route!, activity.id, lesson.id)
                    }
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold hover:border-blue-300 dark:border-slate-800"
                  >
                    <span>
                      {activity.title}
                      <small className="ml-2 text-xs text-slate-500">
                        {status?.completed
                          ? "Đã hoàn thành"
                          : activity.required
                            ? "Bắt buộc"
                            : "Tùy chọn"}
                      </small>
                    </span>
                    <ArrowRight size={15} className="text-blue-600" />
                  </button>
                ) : (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:bg-slate-800/50"
                  >
                    <span>{activity.title}</span>
                    <LockKeyhole size={15} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
