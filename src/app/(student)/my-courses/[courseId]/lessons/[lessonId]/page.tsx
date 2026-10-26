"use client";

import Link from "next/link";
import { use, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Headphones,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  Target,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  courseService,
  CourseV5Exercise,
} from "@/lib/api/services/course.service";
import { courseLessonPath } from "@/lib/course/navigation";
import { normalizeSectionContent } from "@/lib/course/sectionContent";
import { isDuplicateLearningObjectivesSection } from "@/lib/course/lessonObjectives";
import {
  LessonAudioExamplesBlock,
  LessonExampleCard,
} from "@/components/course/LessonContentBlocks";

const listValue = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const formatAnswer = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return String(value);
  if (Array.isArray(value)) return value.map(formatAnswer).join(", ");
  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
};
type LessonExample = {
  label?: string;
  text?: string;
  translation?: string;
  explanation?: string;
};

const mistakeReason = (wrong: string, correct: string): string => {
  const normalized = wrong.toLowerCase();
  if (/doesn['’]?t|does not/.test(normalized) && /works?/.test(normalized))
    return "Sau does not/doesn’t, động từ chính luôn trở về dạng nguyên mẫu; does đã mang dấu hiệu ngôi thứ ba.";
  if (/\bam\s+go\b/.test(normalized) || /going/.test(correct.toLowerCase()))
    return "Am/is/are phải đi với động từ thêm -ing khi diễn tả hành động đang diễn ra.";
  if (/\bshe\s+work\b/.test(normalized) || /\bhe\s+work\b/.test(normalized))
    return "Chủ ngữ he/she/it ở hiện tại đơn cần động từ thêm -s hoặc -es trong câu khẳng định.";
  return "Hãy xác định chủ ngữ, dấu hiệu thời gian và cấu trúc của thì trước khi chia động từ.";
};

const parseMistake = (value: unknown) => {
  if (typeof value === "object" && value !== null) {
    const item = value as Record<string, unknown>;
    const wrong = typeof item.wrong === "string" ? item.wrong : "";
    const correct = typeof item.correct === "string" ? item.correct : "";
    return {
      wrong,
      correct,
      reason:
        typeof item.reason === "string"
          ? item.reason
          : mistakeReason(wrong, correct),
    };
  }
  const raw = typeof value === "string" ? value : "";
  const [wrong = "", correct = ""] = raw.split(/\s*→\s*/);
  if (!correct) {
    return {
      wrong: "",
      correct: "",
      reason: raw || "Hãy kiểm tra lại cấu trúc trước khi dùng câu này.",
    };
  }
  return { wrong, correct, reason: mistakeReason(wrong, correct) };
};
function renderQuestionPrompt(prompt: string) {
  const parts = prompt.split(/_+/g);
  if (parts.length === 1) return prompt;

  return parts.flatMap((part, index) => [
    <span key={`prompt-${index}`}>{part}</span>,
    ...(index < parts.length - 1
      ? [
          <span
            key={`blank-${index}`}
            aria-label="Chỗ trống cần điền"
            role="img"
            className="mx-1 inline-block w-12 translate-y-[-0.08em] border-b-2 border-current"
          />,
        ]
      : []),
  ]);
}

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    percentage: number;
    feedback: Array<{
      questionId: number;
      answer: unknown;
      correctAnswer: unknown;
      isCorrect: boolean | null;
      explanation: string | null;
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
      setSubmitError(null);
      setResult(value);
      void client.invalidateQueries({
        queryKey: ["course-learning-v5", courseId],
      });
      void client.invalidateQueries({
        queryKey: ["course-learning-v5-lesson", courseId, lessonId],
      });
    },
    onError: () => {
      setSubmitError(
        "Không thể nộp bài. Kiểm tra kết nối rồi thử lại; câu trả lời của bạn vẫn được giữ lại.",
      );
      toast.error("Không thể nộp bài. Vui lòng thử lại.");
    },
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
  const recordingTask =
    typeof exerciseContent.recordingTask === "string"
      ? exerciseContent.recordingTask
      : null;
  const rule =
    typeof exerciseContent.rule === "string" ? exerciseContent.rule : null;
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
      {(contentAudio ||
        passage ||
        usefulLanguage.length > 0 ||
        modelStructure.length > 0 ||
        targetWords.length > 0 ||
        collocations.length > 0 ||
        recordingTask ||
        rule) && (
        <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-5 text-base sm:text-lg dark:bg-slate-950">
          {contentAudio && (
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                Audio nhiệm vụ
              </p>
              <audio
                className="mt-2.5 w-full"
                controls
                preload="metadata"
                src={contentAudio}
              />
            </div>
          )}
          {passage && (
            <blockquote className="border-l-4 border-blue-500 pl-4 py-1 leading-relaxed text-slate-700 dark:text-slate-200 italic">
              {passage}
            </blockquote>
          )}
          {usefulLanguage.length > 0 && (
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                Cụm từ hữu ích
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-6 text-slate-600 dark:text-slate-300">
                {usefulLanguage.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {modelStructure.length > 0 && (
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                Cấu trúc bài viết
              </p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-6 text-slate-600 dark:text-slate-300">
                {modelStructure.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
          )}
          {recordingTask && (
            <p className="leading-relaxed text-slate-700 dark:text-slate-200">
              <strong>Nhiệm vụ nói:</strong> {recordingTask}
            </p>
          )}
          {rule && (
            <p className="leading-relaxed text-slate-700 dark:text-slate-200">
              <strong>Quy tắc:</strong> {rule}
            </p>
          )}
          {targetWords.length > 0 && (
            <p className="leading-relaxed text-slate-700 dark:text-slate-200">
              <strong>Từ mục tiêu:</strong> {targetWords.join(" · ")}
            </p>
          )}
          {collocations.length > 0 && (
            <p className="leading-relaxed text-slate-700 dark:text-slate-200">
              <strong>Cụm từ:</strong> {collocations.join(" · ")}
            </p>
          )}
          {listValue(objectValue(exercise.rubric).criteria).length > 0 && (
            <p className="leading-relaxed text-slate-700 dark:text-slate-200">
              <strong>Tiêu chí rubric:</strong>{" "}
              {listValue(objectValue(exercise.rubric).criteria).join(" · ")}
            </p>
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
            <div
              key={question.id}
              ref={(node) => {
                questionRefs.current[question.id] = node;
              }}
            >
              <p className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200">
                {question.order}. {renderQuestionPrompt(question.prompt)}
              </p>
              {options.length > 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {options.map((option, index) => {
                    const label =
                      typeof option === "string"
                        ? option
                        : (JSON.stringify(option) ?? "");
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
        disabled={mutation.isPending}
        onClick={() => {
          const unanswered = exercise.questions.filter((question) => {
            const answer = answers[question.id];
            return (
              answer === undefined ||
              (typeof answer === "string" && !answer.trim())
            );
          });
          if (unanswered.length > 0) {
            setSubmitError(`Bạn còn ${unanswered.length} câu chưa trả lời.`);
            const target = questionRefs.current[unanswered[0].id];
            target?.scrollIntoView({ behavior: "smooth", block: "center" });
            target?.querySelector<HTMLElement>("button, textarea")?.focus();
            return;
          }
          setSubmitError(null);
          mutation.mutate();
        }}
        className="mt-6 inline-flex min-h-12 items-center gap-2.5 rounded-2xl bg-blue-600 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mutation.isPending ? "Đang chấm..." : "Nộp bài"}
        <ArrowRight size={18} />
      </button>
      {submitError && (
        <p
          role="alert"
          className="mt-3 text-sm font-semibold text-rose-700 dark:text-rose-300"
        >
          {submitError}
        </p>
      )}
      {result && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
          <p className="font-bold text-lg">Hoàn thành bài tập</p>
          {result.maxScore > 0 && (
            <p className="mt-1 text-xl font-extrabold text-blue-700 dark:text-blue-300">
              {result.score}/{result.maxScore} câu trắc nghiệm đúng · {result.percentage}%
            </p>
          )}
          {result.feedback.some((item) => item.isCorrect === null) && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Câu tự viết không chấm đúng/sai vì có nhiều cách trả lời hợp lệ. Hãy so câu của bạn với câu tham khảo.
            </p>
          )}
          <ul className="mt-4 space-y-3">
            {result.feedback.map((item) =>
              item.isCorrect === null ? (
                <li
                  key={item.questionId}
                  className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    Câu tự viết
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>
                      <strong>Bạn viết:</strong> {formatAnswer(item.answer)}
                    </p>
                    <p>
                      <strong>Câu tham khảo:</strong>{" "}
                      {formatAnswer(item.correctAnswer)}
                    </p>
                  </div>
                  {item.explanation && (
                    <p className="mt-2 text-sm leading-relaxed">
                      <strong>Giải thích:</strong> {item.explanation}
                    </p>
                  )}
                </li>
              ) : (
              <li
                key={item.questionId}
                className={`rounded-xl border p-3 ${item.isCorrect ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30" : "border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/30"}`}
              >
                <p
                  className={`font-bold ${item.isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}
                >
                  {item.isCorrect ? "✓ Chính xác" : "✕ Chưa chính xác"}
                </p>
                {!item.isCorrect && (
                  <div className="mt-2 space-y-1 text-sm">
                    <p>
                      <strong>Bạn chọn:</strong> {formatAnswer(item.answer)}
                    </p>
                    <p>
                      <strong>Đáp án đúng:</strong>{" "}
                      {formatAnswer(item.correctAnswer)}
                    </p>
                  </div>
                )}
                {item.explanation && (
                  <p className="mt-2 text-sm leading-relaxed">
                    <strong>Giải thích:</strong> {item.explanation}
                  </p>
                )}
              </li>
              ),
            )}
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
  const sections = useMemo(() => {
    const all = data?.lesson.sections ?? [];
    const objectives = data?.lesson.learningObjectives;
    return all.filter(
      (section) =>
        !isDuplicateLearningObjectivesSection(section, objectives),
    );
  }, [data]);
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
              <div className="mt-6">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
                  <Target size={13} /> Mục tiêu
                </div>
                <p className="mt-1 text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  MỤC TIÊU BÀI HỌC
                </p>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {listValue(lesson.learningObjectives).map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-base sm:text-lg text-slate-700 dark:text-slate-200 leading-relaxed"
                    >
                      <span className="text-emerald-500 font-bold shrink-0">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </header>
          {lesson.media.length > 0 && (
            <section
              className={
                lesson.media.length === 1
                  ? "grid grid-cols-1 gap-5"
                  : "grid gap-5 sm:grid-cols-2"
              }
            >
              {lesson.media.map((media, mediaIndex) =>
                media.type === "AUDIO" ? (
                  <div
                    key={media.id}
                    className="rounded-3xl border border-blue-100 bg-blue-50/60 p-6 dark:border-blue-900/60 dark:bg-blue-950/30 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-blue-800 dark:text-blue-200">
                      <Headphones size={20} /> Nghe mẫu trong bài học
                    </div>
                    <audio
                      className="mt-4 w-full"
                      controls
                      preload="metadata"
                      src={media.url}
                    />
                  </div>
                ) : (
                  (() => {
                    const isFullWidthMedia =
                      lessonId === 656 ||
                      media.url.includes("lesson-656") ||
                      (Boolean(media.altText) &&
                        /international phonetic alphabet|bảng ký hiệu.*ipa/i.test(
                          media.altText ?? "",
                        ));
                    if (isFullWidthMedia) {
                      return (
                        <figure
                          key={media.id}
                          className="mx-auto flex w-full max-w-none items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-0 shadow-xs dark:border-slate-800 dark:bg-slate-950/40"
                        >
                          <img
                            src={media.url}
                            alt={media.altText ?? lesson.title}
                            className="h-auto max-h-none w-[104%] max-w-none -translate-x-[2%] object-contain"
                            loading={mediaIndex === 0 ? "eager" : "lazy"}
                            decoding="async"
                          />
                        </figure>
                      );
                    }

                    const isLargeMedia =
                      lessonId === 660 ||
                      lessonId === 57 ||
                      lessonId === 5 ||
                      media.url.includes("lesson-660") ||
                      media.url.includes("lesson-57") ||
                      /\/lesson-5\//.test(media.url) ||
                      (Boolean(media.altText) &&
                        /bảng phụ âm|so sánh hiện tại đơn|mặt bằng nhà/i.test(
                          media.altText ?? "",
                        ));

                    const isMediumLargeMedia =
                      lessonId === 663 ||
                      media.url.includes("lesson-663") ||
                      (Boolean(media.altText) &&
                        /nhận diện âm thanh/i.test(media.altText ?? ""));

                    const containerMaxW = isLargeMedia
                      ? "max-w-4xl sm:p-5"
                      : isMediumLargeMedia
                        ? "max-w-3xl"
                        : "max-w-2xl";

                    const imgMaxH = isLargeMedia
                      ? "max-h-[560px] sm:max-h-[640px]"
                      : isMediumLargeMedia
                        ? "max-h-[500px] sm:max-h-[560px]"
                        : "max-h-[380px] sm:max-h-[420px]";

                    return (
                      <figure
                        key={media.id}
                        className={`mx-auto flex w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60 ${containerMaxW}`}
                      >
                        <img
                          src={media.url}
                          alt={media.altText ?? lesson.title}
                          className={`h-auto w-auto max-w-full rounded-xl object-contain ${imgMaxH}`}
                          loading={mediaIndex === 0 ? "eager" : "lazy"}
                          decoding="async"
                        />
                      </figure>
                    );
                  })()
                ),
              )}
            </section>
          )}
          {sections.map((section) => {
            let rawContent = section.content;
            if (typeof rawContent === "string") {
              try {
                rawContent = JSON.parse(rawContent);
              } catch {
                // Legacy plain text is handled by the shared normalizer below.
              }
            }
            const content = objectValue(rawContent);
            const normalizedContent = normalizeSectionContent(section.content);
            const paragraphs = listValue(content.paragraphs).length
              ? listValue(content.paragraphs)
              : normalizedContent.paragraphs;
            const bullets = listValue(content.bullets).length
              ? listValue(content.bullets)
              : normalizedContent.bullets;
            const formulas = listValue(content.formulas);
            const examples = Array.isArray(content.examples)
              ? content.examples.filter(
                  (item): item is LessonExample =>
                    Boolean(item) && typeof item === "object",
                )
              : normalizedContent.examples;
            const mistakeItems = Array.isArray(content.bullets)
              ? content.bullets.filter(
                  (item) =>
                    typeof item === "string" ||
                    (item && typeof item === "object"),
                )
              : [];
            const audioExamples = normalizedContent.audioExamples;
            const vocabulary = Array.isArray(content.items)
              ? content.items.filter(
                  (
                    item,
                  ): item is {
                    term?: string;
                    meaning?: string;
                    partOfSpeech?: string;
                    ipa?: string;
                    example?: string;
                    translation?: string;
                    note?: string;
                  } => Boolean(item) && typeof item === "object",
                )
              : [];
            return (
              <section
                key={section.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-9 dark:border-slate-800 dark:bg-slate-900 shadow-xs"
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {section.heading}
                </h2>
                {section.type === "EXAMPLE" && (
                  <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
                    Đọc câu tiếng Anh trước, đối chiếu nghĩa tiếng Việt, sau đó
                    chú ý phần giải thích để biết vì sao cấu trúc này phù hợp
                    với ngữ cảnh.
                  </p>
                )}
                {section.type === "COMMON_MISTAKE" && (
                  <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
                    Những lỗi dưới đây thường xuất hiện khi người học chia động
                    từ theo thói quen tiếng Việt hoặc trộn lẫn hai thì. Mỗi ví
                    dụ đều chỉ rõ nguyên nhân để bạn tự sửa được câu mới.
                  </p>
                )}
                {paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-4 text-base sm:text-lg lg:text-xl leading-relaxed text-slate-700 dark:text-slate-200"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.type === "COMMON_MISTAKE" &&
                mistakeItems.length > 0 ? (
                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    {mistakeItems.map((item, index) => {
                      const parsed = parseMistake(item);
                      return (
                        <article
                          key={`${section.id}-mistake-${index}`}
                          className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-5 dark:border-rose-900/60 dark:bg-rose-950/20"
                        >
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-rose-700 dark:text-rose-300">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-sm dark:bg-rose-900/60">
                              !
                            </span>
                            Lỗi cần tránh {index + 1}
                          </div>
                          {parsed.correct ? (
                            <>
                              <p className="mt-4 text-base font-semibold text-rose-800 line-through decoration-rose-400 dark:text-rose-200">
                                {parsed.wrong}
                              </p>
                              <p className="mt-2 text-base font-bold text-emerald-700 dark:text-emerald-300">
                                <span className="mr-2 no-underline">✓</span>
                                {parsed.correct}
                              </p>
                            </>
                          ) : (
                            <p className="mt-4 text-base font-semibold leading-relaxed text-rose-800 dark:text-rose-200">
                              {parsed.reason}
                            </p>
                          )}
                          {parsed.correct && (
                            <div className="mt-4 rounded-xl border border-white/80 bg-white/80 p-3 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
                              <strong>Vì sao?</strong> {parsed.reason}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  bullets.length > 0 && (
                    <ul className="mt-4 space-y-2.5 text-base sm:text-lg leading-relaxed text-slate-700 dark:text-slate-200">
                      {bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2.5">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )
                )}
                {formulas.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                    <p className="font-bold text-amber-900 dark:text-amber-200">
                      Cấu trúc cần nhớ
                    </p>
                    <ul className="mt-2 space-y-1.5 font-mono text-sm leading-relaxed text-amber-950 dark:text-amber-100">
                      {formulas.map((formula) => (
                        <li key={formula}>{formula}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {examples.length > 0 && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {examples.map((example, index) => (
                      <LessonExampleCard
                        key={`${section.id}-example-${index}`}
                        index={index}
                        example={example}
                      />
                    ))}
                  </div>
                )}
                <LessonAudioExamplesBlock
                  sectionId={section.id}
                  audioExamples={audioExamples}
                />
                {vocabulary.length > 0 && (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {vocabulary.map((item, index) => (
                      <div
                        key={`${section.id}-vocabulary-${index}`}
                        className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30"
                      >
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <p className="font-bold text-emerald-900 dark:text-emerald-200">
                            {item.term ?? "Từ vựng"}
                          </p>
                          {item.ipa && (
                            <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
                              {item.ipa}
                            </span>
                          )}
                          {item.partOfSpeech && (
                            <span className="text-sm italic text-slate-500 dark:text-slate-400">
                              ({item.partOfSpeech})
                            </span>
                          )}
                        </div>
                        {item.meaning && (
                          <p className="mt-1 text-slate-700 dark:text-slate-200">
                            {item.meaning}
                          </p>
                        )}
                        {item.example && (
                          <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {item.example}
                          </p>
                        )}
                        {item.translation && (
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {item.translation}
                          </p>
                        )}
                        {item.note && (
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {item.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
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
