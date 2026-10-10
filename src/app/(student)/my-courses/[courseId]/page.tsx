"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { courseService } from "@/lib/api/services/course.service";
import { courseLessonPath } from "@/lib/course/navigation";

export default function CourseDetailPage(props: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId: rawCourseId } = use(props.params);
  const courseId = Number(rawCourseId);
  const [mediaFailed, setMediaFailed] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["course-learning-v5", courseId],
    queryFn: () => courseService.getCourseLearningOverview(courseId),
    enabled: Number.isInteger(courseId),
  });
  if (isLoading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );
  if (error || !data)
    return (
      <div className="p-12 text-center">
        Không thể tải khóa học.{" "}
        <Link className="text-blue-600" href="/courses">
          Quay lại
        </Link>
      </div>
    );
  const firstIncomplete =
    data.lessons.find((lesson) => !lesson.completed) ?? data.lessons[0];
  const learning = data.course.learning;
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <Link
        href="/courses"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"
      >
        <ArrowLeft size={16} /> Danh mục khóa học
      </Link>
      {learning?.coverImage && !mediaFailed && (
        <img
          src={learning.coverImage}
          alt=""
          className="h-48 w-full rounded-3xl object-cover"
          onError={() => setMediaFailed(true)}
        />
      )}
      <header className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
          {data.course.level ?? "Course"}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {data.course.title}
        </h1>
        <p className="max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
          {data.course.description}
        </p>
        <div className="max-w-xl pt-3">
          <div className="mb-2 flex justify-between text-sm font-semibold">
            <span>Tiến độ khóa học</span>
            <span>
              {data.progress.completedLessons}/{data.progress.totalLessons} bài
              · {data.progress.percentage}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-blue-600"
              style={{ width: `${data.progress.percentage}%` }}
            />
          </div>
        </div>
      </header>
      <section className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-bold">Lộ trình học tập</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Bạn có thể mở bất kỳ bài học nào. Thứ tự chỉ là gợi ý.
          </p>
          {learning?.objectives?.length ? (
            <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {learning.objectives.map((objective) => (
                <li key={objective}>• {objective}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 p-6 dark:border-blue-900/50 dark:bg-blue-950/20">
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Sẵn sàng học tiếp?
            </p>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-200">
              Mở bài học và luyện tập ngay trong khóa.
            </p>
          </div>
          {firstIncomplete && (
            <Link
              href={courseLessonPath(courseId, firstIncomplete.id)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"
            >
              {data.progress.completedLessons ? "Học tiếp" : "Bắt đầu"}
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {data.lessons.map((lesson) => (
          <Link
            key={lesson.id}
            href={courseLessonPath(courseId, lesson.id)}
            className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Bài {lesson.order}
                </p>
                <h2 className="mt-1 font-bold text-slate-900 group-hover:text-blue-600 dark:text-white">
                  {lesson.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {lesson.summary}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lesson.completed ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
              >
                {lesson.completed ? "Đã hoàn thành" : "Chưa học"}
              </span>
            </div>
            <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <BookOpen size={14} /> {lesson.exerciseCount} bài tập ·{" "}
                {lesson.estimatedMinutes} phút
              </span>
              <ArrowRight size={16} className="text-blue-600" />
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
