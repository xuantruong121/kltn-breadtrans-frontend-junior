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
const sectionTypeLabels: Record<string, string> = {
  INTRO: "Mục tiêu bài học",
  THEORY: "Kiến thức trọng tâm",
  EXAMPLE: "Ví dụ song ngữ",
  VOCABULARY: "Từ vựng và cụm từ",
  COMMON_MISTAKE: "Lỗi thường gặp",
  TIP: "Mẹo ghi nhớ",
  CHECKPOINT: "Luyện tập có hướng dẫn",
  SUMMARY: "Tóm tắt bài học",
};
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
    <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600">
            Bài tập {exercise.order}
          </p>
          <h3 className="mt-1.5 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {exercise.title}
          </h3>
          <p className="mt-2.5 text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            {exercise.prompt}
          </p>
        </div>
        {exercise.completed && (
          <CheckCircle2 className="shrink-0 text-emerald-500" size={24} />
        )}
      </div>
      {(contentAudio || passage || usefulLanguage.length > 0 || modelStructure.length > 0 || targetWords.length > 0 || collocations.length > 0 || recordingTask || rule) && (
        <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-5 text-base sm:text-lg dark:bg-slate-950">
          {contentAudio && (
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">Audio nhiệm vụ</p>
              <audio className="mt-2.5 w-full" controls preload="metadata" src={contentAudio} />
            </div>
          )}
          {passage && (
            <blockquote className="border-l-4 border-blue-500 pl-4 py-1 leading-relaxed text-slate-700 dark:text-slate-200 italic">
              {passage}
            </blockquote>
          )}
          {usefulLanguage.length > 0 && (
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">Cụm từ hữu ích</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-6 text-slate-600 dark:text-slate-300">
                {usefulLanguage.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          {modelStructure.length > 0 && (
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">Cấu trúc bài viết</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-6 text-slate-600 dark:text-slate-300">
                {modelStructure.map((item) => <li key={item}>{item}</li>)}
              </ol>
            </div>
          )}
          {recordingTask && <p className="leading-relaxed text-slate-700 dark:text-slate-200"><strong>Nhiệm vụ nói:</strong> {recordingTask}</p>}
          {rule && <p className="leading-relaxed text-slate-700 dark:text-slate-200"><strong>Quy tắc:</strong> {rule}</p>}
          {targetWords.length > 0 && <p className="leading-relaxed text-slate-700 dark:text-slate-200"><strong>Từ mục tiêu:</strong> {targetWords.join(" · ")}</p>}
          {collocations.length > 0 && <p className="leading-relaxed text-slate-700 dark:text-slate-200"><strong>Cụm từ:</strong> {collocations.join(" · ")}</p>}
          {listValue(objectValue(exercise.rubric).criteria).length > 0 && (
            <p className="leading-relaxed text-slate-700 dark:text-slate-200"><strong>Tiêu chí rubric:</strong> {listValue(objectValue(exercise.rubric).criteria).join(" · ")}</p>
          )}
        </div>
      )}
      <div className="mt-6 space-y-6">
        {exercise.questions.map((question) => {
          const options = Array.isArray(question.options)
            ? question.options
            : [];
          const answer = answers[question.id];
          return (
            <div key={question.id}>
              <p className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200">
                {question.order}. {question.prompt}
              </p>
              {options.length > 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                        className={`min-h-12 rounded-2xl border px-4 py-3 text-left text-base font-medium transition ${selected ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200" : "border-slate-200 hover:border-blue-300 dark:border-slate-700"}`}
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
                  rows={4}
                  aria-label={`Câu trả lời ${question.order}`}
                  placeholder="Nhập câu trả lời hoặc bản nháp của bạn..."
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base leading-relaxed outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950"
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
        className="mt-6 inline-flex min-h-12 items-center gap-2.5 rounded-2xl bg-blue-600 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mutation.isPending ? "Đang chấm..." : "Nộp bài"}
        <ArrowRight size={18} />
      </button>
      {result && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-base text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <p className="font-bold text-lg">
            Kết quả: {result.score}/{result.maxScore} ({result.percentage}%)
          </p>
          <ul className="mt-3 space-y-2">
            {result.feedback.map((item) => (
              <li key={item.questionId} className="flex items-start gap-2">
                <span className={item.isCorrect ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                  {item.isCorrect ? "✓ Đúng" : "✕ Chưa đúng"}
                </span>
                <span>· {item.explanation}</span>
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
    <main className="w-full space-y-6 px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8">
      <div className="flex items-center justify-between">
        <Link
          href={`/my-courses/${courseId}`}
          className="inline-flex items-center gap-2 text-base font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={18} /> {course.title}
        </Link>
        <button
          type="button"
          className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 px-4 text-base font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={18} /> Danh sách bài học
        </button>
      </div>
      <div
        style={
          collapsed
            ? { gridTemplateColumns: "minmax(0, 1fr) 4.5rem" }
            : undefined
        }
        className={`grid items-start gap-8 transition-[grid-template-columns] lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem] ${collapsed ? "lg:grid-cols-[minmax(0,1fr)_4.5rem]" : ""}`}
      >
        <article className="min-w-0 space-y-8">
          <header className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-10 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
              Bài {lesson.order} · {lesson.estimatedMinutes} phút
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              {lesson.title}
            </h1>
            <p className="mt-4 max-w-4xl text-base sm:text-lg lg:text-xl leading-relaxed text-slate-600 dark:text-slate-300">
              {lesson.summary}
            </p>
            {listValue(lesson.learningObjectives).length > 0 && (
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {listValue(lesson.learningObjectives).map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-base sm:text-lg text-slate-700 dark:text-slate-200 leading-relaxed"
                  >
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </header>
          {lesson.media.length > 0 && (
            <section className="grid gap-5 sm:grid-cols-2">
              {lesson.media.map((media) =>
                media.type === "AUDIO" ? (
                  <div
                    key={media.id}
                    className="rounded-3xl border border-blue-100 bg-blue-50/60 p-6 dark:border-blue-900/60 dark:bg-blue-950/30 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-blue-800 dark:text-blue-200">
                      <Headphones size={20} /> Nghe mẫu trong bài học
                    </div>
                    <audio className="mt-4 w-full" controls preload="metadata" src={media.url} />
                  </div>
                ) : (
                  <figure key={media.id} className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <img src={media.url} alt={media.altText ?? lesson.title} className="h-56 sm:h-72 w-full object-cover" loading="lazy" />
                  </figure>
                ),
              )}
            </section>
          )}
          {sections.map((section) => {
            const content = objectValue(section.content);
            const paragraphs = listValue(content.paragraphs);
            const bullets = listValue(content.bullets);
            const formulas = listValue(content.formulas);
            const examples = Array.isArray(content.examples)
              ? content.examples.filter(
                  (item): item is { label?: string; text?: string; translation?: string; explanation?: string } =>
                    Boolean(item) && typeof item === "object",
                )
              : [];
            const audioExamples = Array.isArray(content.audioExamples)
              ? content.audioExamples.filter(
                  (item): item is {
                    term?: string;
                    ipa?: string | null;
                    meaning?: string;
                    audioUrl?: string;
                    accent?: string;
                  } =>
                    Boolean(item) &&
                    typeof item === "object" &&
                    typeof (item as Record<string, unknown>).term === "string" &&
                    typeof (item as Record<string, unknown>).audioUrl === "string",
                )
              : [];
            const vocabulary = Array.isArray(content.items)
              ? content.items.filter(
                  (item): item is { term?: string; meaning?: string; partOfSpeech?: string; ipa?: string; example?: string; translation?: string; note?: string } =>
                    Boolean(item) && typeof item === "object",
                )
              : [];
            return (
              <section
                key={section.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-9 dark:border-slate-800 dark:bg-slate-900 shadow-xs"
              >
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600">
                  {sectionTypeLabels[section.type] ?? section.type}
                </p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {section.heading}
                </h2>
                {paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-4 text-base sm:text-lg lg:text-xl leading-relaxed text-slate-700 dark:text-slate-200"
                  >
                    {paragraph}
                  </p>
                ))}
                {bullets.length > 0 && (
                  <ul className="mt-4 space-y-2.5 text-base sm:text-lg leading-relaxed text-slate-700 dark:text-slate-200">
                    {bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5">
                        <span className="text-blue-500 font-bold">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {formulas.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                    <p className="font-bold text-amber-900 dark:text-amber-200">Cấu trúc cần nhớ</p>
                    <ul className="mt-2 space-y-1.5 font-mono text-sm leading-relaxed text-amber-950 dark:text-amber-100">
                      {formulas.map((formula) => <li key={formula}>{formula}</li>)}
                    </ul>
                  </div>
                )}
                {examples.length > 0 && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {examples.map((example, index) => (
                      <div key={`${section.id}-example-${index}`} className="rounded-2xl bg-blue-50/70 p-4 text-base dark:bg-blue-950/30">
                        <p className="font-bold text-blue-800 dark:text-blue-200">{example.label ?? "Ví dụ"}</p>
                        <p className="mt-2 font-semibold leading-relaxed text-slate-800 dark:text-slate-100">{example.text ?? ""}</p>
                        {example.translation && <p className="mt-1.5 leading-relaxed text-slate-600 dark:text-slate-300">Nghĩa: {example.translation}</p>}
                        {example.explanation && <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Giải thích: {example.explanation}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {audioExamples.length > 0 && (
                  <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
                    <p className="font-bold text-blue-900 dark:text-blue-200">
                      Nghe mẫu phát âm
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      Nghe từ mẫu, nhìn IPA rồi lặp lại. Audio được lấy từ kho phát âm BreadTrans đã quản lý.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {audioExamples.map((item, index) => (
                        <div
                          key={`${section.id}-audio-example-${index}`}
                          className="rounded-xl border border-blue-100 bg-white p-3 dark:border-blue-900/60 dark:bg-slate-900"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {item.term}
                            </p>
                            {item.ipa && (
                              <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
                                {item.ipa}
                              </span>
                            )}
                          </div>
                          {item.meaning && (
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                              {item.meaning}
                            </p>
                          )}
                          <audio
                            className="mt-2 w-full"
                            controls
                            preload="metadata"
                            src={item.audioUrl}
                            aria-label={`Nghe phát âm từ ${item.term}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {vocabulary.length > 0 && (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {vocabulary.map((item, index) => (
                      <div key={`${section.id}-vocabulary-${index}`} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <p className="font-bold text-emerald-900 dark:text-emerald-200">{item.term ?? "Từ vựng"}</p>
                          {item.ipa && <span className="font-mono text-sm text-slate-500 dark:text-slate-400">{item.ipa}</span>}
                          {item.partOfSpeech && <span className="text-sm italic text-slate-500 dark:text-slate-400">({item.partOfSpeech})</span>}
                        </div>
                        {item.meaning && <p className="mt-1 text-slate-700 dark:text-slate-200">{item.meaning}</p>}
                        {item.example && <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{item.example}</p>}
                        {item.translation && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.translation}</p>}
                        {item.note && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.note}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
          <section className="space-y-6">
            <div>
              <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600">
                Thực hành trong khóa học
              </p>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
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
            <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
              <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                <BookOpen size={20} /> Tài liệu tham khảo thêm (không bắt buộc)
              </div>
              <div className="mt-4 space-y-3">
                {lesson.references.map((reference) => (
                  <a
                    key={reference.id}
                    href={reference.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold text-blue-700 hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <span>{reference.title}</span>
                    <ExternalLink size={17} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </section>
          )}
          <nav className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
            <Link
              href={
                navigation.previousLessonId
                  ? courseLessonPath(courseId, navigation.previousLessonId)
                  : `/my-courses/${courseId}`
              }
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft size={18} /> Bài trước
            </Link>
            {navigation.nextLessonId ? (
              <Link
                href={courseLessonPath(courseId, navigation.nextLessonId)}
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                Bài tiếp theo <ArrowRight size={18} />
              </Link>
            ) : (
              <Link
                href={`/my-courses/${courseId}`}
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                Tổng quan khóa học
              </Link>
            )}
          </nav>
        </article>
        <aside className="sticky top-24 hidden rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs lg:block">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">
              {collapsed ? "" : "Danh sách bài học"}
            </span>
            <button
              type="button"
              aria-label={
                collapsed ? "Mở danh sách bài học" : "Thu gọn danh sách bài học"
              }
              onClick={() => setCollapsed((value) => !value)}
              className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {collapsed ? (
                <PanelRightOpen size={18} />
              ) : (
                <PanelRightClose size={18} />
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
          <aside className="absolute right-0 top-0 h-full w-[min(86vw,24rem)] overflow-y-auto bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">Danh sách bài học</h2>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-xl border dark:border-slate-700"
                onClick={() => setDrawerOpen(false)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </main>
  );
}
