"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { courseService } from "@/lib/api/services/course.service";
import { courseLessonPath } from "@/lib/course/navigation";
import { levelLabel } from "@/lib/ui/displayLabels";

export default function CourseDetailPage(props: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId: rawCourseId } = use(props.params);
  const courseId = Number(rawCourseId);
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
    <div className="w-full space-y-8 px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8">
      <Link
        href="/courses"
        className="inline-flex items-center gap-2 text-base font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={18} /> Danh mục khóa học
      </Link>
      <header className="space-y-4">
        <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
          {levelLabel(data.course.level) || "Khóa học"}
        </p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
          {data.course.title}
        </h1>
        <p className="max-w-4xl text-base sm:text-lg lg:text-xl leading-relaxed text-slate-600 dark:text-slate-300">
          {data.course.description}
        </p>
        <div className="max-w-2xl pt-2">
          <div className="mb-2 flex justify-between text-base font-semibold text-slate-700 dark:text-slate-200">
            <span>Tiến độ khóa học</span>
            <span>
              {data.progress.completedLessons}/{data.progress.totalLessons} bài
              · {data.progress.percentage}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-3 rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${data.progress.percentage}%` }}
            />
          </div>
        </div>
      </header>
      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Lộ trình học tập
          </h2>
          <p className="mt-2 text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            Bạn có thể mở bất kỳ bài học nào. Thứ tự chỉ là gợi ý.
          </p>
          {learning?.objectives?.length ? (
            <ul className="mt-4 space-y-2.5 text-base sm:text-lg leading-relaxed text-slate-700 dark:text-slate-200">
              {learning.objectives.map((objective) => (
                <li key={objective} className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">•</span>
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex flex-col justify-between rounded-3xl border border-blue-100 bg-blue-50/80 p-6 sm:p-8 dark:border-blue-900/50 dark:bg-blue-950/20 shadow-xs">
          <div>
            <p className="text-lg sm:text-xl font-bold text-blue-950 dark:text-blue-100">
              Sẵn sàng học tiếp?
            </p>
            <p className="mt-2 text-base sm:text-lg text-blue-800/90 dark:text-blue-200 leading-relaxed">
              Mở bài học và luyện tập ngay trong khóa.
            </p>
          </div>
          {firstIncomplete && (
            <div className="mt-6">
              <Link
                href={courseLessonPath(courseId, firstIncomplete.id)}
                className="inline-flex min-h-12 items-center gap-2.5 rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                {data.progress.completedLessons ? "Học tiếp bài học" : "Bắt đầu bài học"}
                <ArrowRight size={18} />
              </Link>
            </div>
          )}
        </div>
      </section>
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.lessons.map((lesson) => (
          <Link
            key={lesson.id}
            href={courseLessonPath(courseId, lesson.id)}
            className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
                  Bài {lesson.order}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ${
                    lesson.completed
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {lesson.completed ? "Đã hoàn thành" : "Chưa học"}
                </span>
              </div>
              <h2 className="mt-2 text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-blue-600 dark:text-white leading-snug transition-colors">
                {lesson.title}
              </h2>
              <p className="mt-2.5 text-base leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-3">
                {lesson.summary}
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800 text-sm sm:text-base text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-2 font-medium">
                <BookOpen size={16} /> {lesson.exerciseCount} bài tập ·{" "}
                {lesson.estimatedMinutes} phút
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold text-blue-600 group-hover:underline">
                {lesson.completed ? "Ôn lại" : "Bắt đầu"}
                <ArrowRight size={16} />
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
