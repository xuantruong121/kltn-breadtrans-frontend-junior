"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Headphones,
  Menu,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  courseService,
  CourseV5Exercise,
} from "@/lib/api/services/course.service";
import { courseLessonPath } from "@/lib/course/navigation";

const listValue = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
function ExerciseCard({
  exercise,
  courseId,
  lessonId,
}: {
  exercise: CourseV5Exercise;
  courseId: number;
  lessonId: number;
}) {
  const client = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    percentage: number;
    feedback: Array<{
      questionId: number;
      isCorrect: boolean;
      explanation: string;
    }>;
  } | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      courseService.submitCourseLearningExercise(
        courseId,
        lessonId,
        exercise.id,
        exercise.questions.map((question) => ({
          questionId: question.id,
          answer: answers[question.id] ?? "",
        })),
      ),
    onSuccess: (value) => {
      setResult(value);
      void client.invalidateQueries({
        queryKey: ["course-learning-v5", courseId],
      });
      void client.invalidateQueries({
        queryKey: ["course-learning-v5-lesson", courseId, lessonId],
      });
    },
    onError: () => toast.error("Không thể nộp bài. Vui lòng thử lại."),
  });
  const exerciseContent = objectValue(exercise.content);
  const contentAudio =
    typeof exerciseContent.audioUrl === "string"
      ? exerciseContent.audioUrl
      : null;
  const passage =
    typeof exerciseContent.passage === "string"
      ? exerciseContent.passage
      : null;
  const usefulLanguage = listValue(exerciseContent.usefulLanguage);
  const modelStructure = listValue(exerciseContent.modelStructure);
  const targetWords = listValue(exerciseContent.targetWords);
  const collocations = listValue(exerciseContent.collocations);
  const recordingTask = typeof exerciseContent.recordingTask === "string" ? exerciseContent.recordingTask : null;
  const rule = typeof exerciseContent.rule === "string" ? exerciseContent.rule : null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Bài tập {exercise.order}
          </p>
          <h3 className="mt-1 font-bold text-slate-900 dark:text-white">
            {exercise.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {exercise.prompt}
          </p>
        </div>
        {exercise.completed && (
          <CheckCircle2 className="shrink-0 text-emerald-500" size={20} />
        )}
      </div>
      {(contentAudio || passage || usefulLanguage.length > 0 || modelStructure.length > 0 || targetWords.length > 0 || collocations.length > 0 || recordingTask || rule) && (
        <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-950">
          {contentAudio && (
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">Audio nhiệm vụ</p>
              <audio className="mt-2 w-full" controls preload="metadata" src={contentAudio} />
            </div>
          )}
          {passage && (
            <blockquote className="border-l-2 border-blue-500 pl-3 leading-6 text-slate-700 dark:text-slate-300">
              {passage}
            </blockquote>
          )}
          {usefulLanguage.length > 0 && (
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">Cụm từ hữu ích</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-300">
                {usefulLanguage.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          {modelStructure.length > 0 && (
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">Cấu trúc bài viết</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-slate-600 dark:text-slate-300">
                {modelStructure.map((item) => <li key={item}>{item}</li>)}
              </ol>
            </div>
          )}
          {recordingTask && <p className="leading-6 text-slate-700 dark:text-slate-300"><strong>Nhiệm vụ nói:</strong> {recordingTask}</p>}
          {rule && <p className="leading-6 text-slate-700 dark:text-slate-300"><strong>Quy tắc:</strong> {rule}</p>}
          {targetWords.length > 0 && <p className="leading-6 text-slate-700 dark:text-slate-300"><strong>Từ mục tiêu:</strong> {targetWords.join(" · ")}</p>}
          {collocations.length > 0 && <p className="leading-6 text-slate-700 dark:text-slate-300"><strong>Cụm từ:</strong> {collocations.join(" · ")}</p>}
          {listValue(objectValue(exercise.rubric).criteria).length > 0 && (
            <p className="leading-6 text-slate-700 dark:text-slate-300"><strong>Tiêu chí:</strong> {listValue(objectValue(exercise.rubric).criteria).join(" · ")}</p>
          )}
        </div>
      )}
      <div className="mt-5 space-y-5">
        {exercise.questions.map((question) => {
          const options = Array.isArray(question.options)
            ? question.options
            : [];
          const answer = answers[question.id];
          return (
            <div key={question.id}>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {question.order}. {question.prompt}
              </p>
              {options.length > 0 ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {options.map((option, index) => {
                    const label =
                      typeof option === "string"
                        ? option
                        : JSON.stringify(option) ?? "";
                    const selected =
                      answers[question.id] === option ||
                      answers[question.id] === label;
                    return (
                      <button
                        key={`${question.id}-${index}`}
                        type="button"
                        onClick={() =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: option,
                          }))
                        }
                        className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm transition ${selected ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 hover:border-blue-300 dark:border-slate-700"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  value={typeof answer === "string" ? answer : ""}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: event.target.value,
                    }))
                  }
                  rows={3}
                  aria-label={`Câu trả lời ${question.order}`}
                  placeholder="Nhập câu trả lời hoặc bản nháp của bạn..."
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950"
                />
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        disabled={
          mutation.isPending ||
          exercise.questions.some((question) => {
            const answer = answers[question.id];
            return answer === undefined || (typeof answer === "string" && !answer.trim());
          })
        }
        onClick={() => mutation.mutate()}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mutation.isPending ? "Đang chấm..." : "Nộp bài"}
        <ArrowRight size={16} />
      </button>
      {result && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-bold">
            Kết quả: {result.score}/{result.maxScore} ({result.percentage}%)
          </p>
          <ul className="mt-2 space-y-1">
            {result.feedback.map((item) => (
              <li key={item.questionId}>
                {item.isCorrect ? "✓ Đúng" : "✕ Chưa đúng"} · {item.explanation}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function CourseLessonPage(props: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId: rawCourseId, lessonId: rawLessonId } = use(props.params);
  const courseId = Number(rawCourseId);
  const lessonId = Number(rawLessonId);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["course-learning-v5-lesson", courseId, lessonId],
    queryFn: () => courseService.getCourseLearningLesson(courseId, lessonId),
    enabled: Number.isInteger(courseId) && Number.isInteger(lessonId),
  });
  const sections = useMemo(() => data?.lesson.sections ?? [], [data]);
  if (isLoading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
        Đang tải bài học...
      </div>
    );
  if (error || !data)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-slate-600">Không thể mở bài học này.</p>
        <Link
          className="mt-5 inline-flex text-blue-600"
          href={`/my-courses/${courseId}`}
        >
          Quay lại khóa học
        </Link>
      </div>
    );
  const { lesson, course, navigation } = data;
  const nav = (
    <div className="space-y-1">
      {navigation.lessons.map((item) => (
        <Link
          key={item.id}
          href={courseLessonPath(courseId, item.id)}
          onClick={() => setDrawerOpen(false)}
          title={item.title}
          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${item.id === lessonId ? "bg-blue-50 font-bold text-blue-700" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold dark:bg-slate-800">
            {item.order}
          </span>
          {!collapsed && <span className="truncate">{item.title}</span>}
        </Link>
      ))}
    </div>
  );
  return (
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/my-courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"
        >
          <ArrowLeft size={16} /> {course.title}
        </Link>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm lg:hidden"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={17} /> Danh sách bài học
        </button>
      </div>
      <div
        style={
          collapsed
            ? { gridTemplateColumns: "minmax(0, 1fr) 4rem" }
            : undefined
        }
        className={`grid items-start gap-6 transition-[grid-template-columns] lg:grid-cols-[minmax(0,1fr)_18rem] ${collapsed ? "lg:grid-cols-[minmax(0,1fr)_4rem]" : ""}`}
      >
        <article className="min-w-0 space-y-6">
          <header className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Bài {lesson.order} · {lesson.estimatedMinutes} phút
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {lesson.title}
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
              {lesson.summary}
            </p>
            {listValue(lesson.learningObjectives).length > 0 && (
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {listValue(lesson.learningObjectives).map((item) => (
                  <li
                    key={item}
                    className="text-sm text-slate-600 dark:text-slate-300"
                  >
                    ✓ {item}
                  </li>
                ))}
              </ul>
            )}
          </header>
          {lesson.media.length > 0 && (
            <section className="grid gap-4 sm:grid-cols-2">
              {lesson.media.map((media) =>
                media.type === "AUDIO" ? (
                  <div
                    key={media.id}
                    className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 dark:border-blue-900/60 dark:bg-blue-950/30"
                  >
                    <div className="flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-200">
                      <Headphones size={17} /> Nghe mẫu trong bài học
                    </div>
                    <audio className="mt-4 w-full" controls preload="metadata" src={media.url} />
                  </div>
                ) : (
                  <figure key={media.id} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                    <img src={media.url} alt={media.altText ?? lesson.title} className="h-48 w-full object-cover" loading="lazy" />
                  </figure>
                ),
              )}
            </section>
          )}
          {sections.map((section) => {
            const content = objectValue(section.content);
            const paragraphs = listValue(content.paragraphs);
            const bullets = listValue(content.bullets);
            const examples = Array.isArray(content.examples)
              ? content.examples.filter(
                  (item): item is { label?: string; text?: string } =>
                    Boolean(item) && typeof item === "object",
                )
              : [];
            return (
              <section
                key={section.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  {section.type}
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {section.heading}
                </h2>
                {paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-3 leading-7 text-slate-600 dark:text-slate-300"
                  >
                    {paragraph}
                  </p>
                ))}
                {bullets.length > 0 && (
                  <ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-300">
                    {bullets.map((bullet) => (
                      <li key={bullet}>• {bullet}</li>
                    ))}
                  </ul>
                )}
                {examples.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {examples.map((example, index) => (
                      <div key={`${section.id}-example-${index}`} className="rounded-xl bg-blue-50/70 p-3 text-sm dark:bg-blue-950/30">
                        <p className="font-bold text-blue-800 dark:text-blue-200">{example.label ?? "Ví dụ"}</p>
                        <p className="mt-1 leading-6 text-slate-700 dark:text-slate-300">{example.text ?? ""}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
          <section className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Thực hành trong khóa học
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                Luyện tập ngay trong bài học
              </h2>
            </div>
            {lesson.exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                courseId={courseId}
                lessonId={lessonId}
              />
            ))}
          </section>
          {lesson.references.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                <BookOpen size={17} /> Đọc thêm theo chủ đề
              </div>
              <div className="mt-3 space-y-2">
                {lesson.references.map((reference) => (
                  <a
                    key={reference.id}
                    href={reference.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-blue-700 hover:border-blue-300 dark:border-slate-700 dark:text-blue-300"
                  >
                    <span>{reference.title}</span>
                    <ExternalLink size={15} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </section>
          )}
          <nav className="flex items-center justify-between border-t pt-5">
            <Link
              href={
                navigation.previousLessonId
                  ? courseLessonPath(courseId, navigation.previousLessonId)
                  : `/my-courses/${courseId}`
              }
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"
            >
              <ArrowLeft size={16} /> Bài trước
            </Link>
            {navigation.nextLessonId ? (
              <Link
                href={courseLessonPath(courseId, navigation.nextLessonId)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700"
              >
                Bài tiếp theo <ArrowRight size={16} />
              </Link>
            ) : (
              <Link
                href={`/my-courses/${courseId}`}
                className="text-sm font-semibold text-blue-700"
              >
                Tổng quan
              </Link>
            )}
          </nav>
        </article>
        <aside className="sticky top-24 hidden rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 lg:block">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {collapsed ? "" : "Bài học"}
            </span>
            <button
              type="button"
              aria-label={
                collapsed ? "Mở danh sách bài học" : "Thu gọn danh sách bài học"
              }
              onClick={() => setCollapsed((value) => !value)}
              className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {collapsed ? (
                <PanelRightOpen size={17} />
              ) : (
                <PanelRightClose size={17} />
              )}
            </button>
          </div>
          {nav}
        </aside>
      </div>
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Đóng danh sách bài học"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-[min(86vw,22rem)] overflow-y-auto bg-white p-4 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Bài học trong khóa</h2>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-lg border"
                onClick={() => setDrawerOpen(false)}
              >
                <ChevronRight size={17} />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </main>
  );
}
