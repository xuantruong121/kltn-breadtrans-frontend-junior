"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import {
  BTN_AI,
  BTN_DANGER,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SUCCESS,
} from "../cmsButtons";
import {
  GRAMMAR_LEVELS,
  grammarChecklist,
  grammarLevelLabel,
  youtubeIdFrom,
} from "./grammarCms";

type Question = {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
  order: number;
};

type Topic = {
  id: number;
  title: string;
  description?: string | null;
  level: string;
  videoYoutubeId?: string | null;
  keyFormula?: string | null;
  publicationStatus: "DRAFT" | "PUBLISHED";
  questions: Question[];
};

type TopicForm = {
  title: string;
  level: string;
  video: string;
  keyFormula: string;
  description: string;
};

type Candidate = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  chosen: boolean;
};

const FIELD =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
const ICON_BTN =
  "inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40";
const LETTERS = ["A", "B", "C", "D"];
const unwrap = <T,>(value: any): T => (value?.data ?? value) as T;

export default function GrammarTopicEditor({ id }: { id?: number }) {
  const { data: topic, isLoading } = useQuery<Topic>({
    queryKey: ["admin-grammar-topic-detail", id],
    enabled: Boolean(id),
    queryFn: async () =>
      unwrap<Topic>(await axiosClient.get(`/grammar/topics/${id}`)),
  });
  if (id && (isLoading || !topic))
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="animate-spin text-slate-500" />
      </div>
    );
  return <TopicBody key={topic?.id ?? "new"} topic={topic ?? null} />;
}

/** One question edited in place: four A–D rows with a radio for the answer. */
function QuestionForm({
  topicId,
  question,
  nextOrder,
  onDone,
}: {
  topicId: number;
  question: Question | null;
  nextOrder: number;
  onDone: (saved: boolean) => void;
}) {
  const [text, setText] = useState(question?.question ?? "");
  const [options, setOptions] = useState<string[]>(() => {
    const rows = [...(question?.options ?? [])];
    while (rows.length < 4) rows.push("");
    return rows.slice(0, 4);
  });
  const [correct, setCorrect] = useState<number | null>(
    question ? question.correctIndex : null,
  );
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!text.trim() || options.some((o) => !o.trim())) {
      toast.error("Cần đề bài và đủ 4 phương án A, B, C, D.");
      return;
    }
    if (correct === null) {
      toast.error("Chọn đáp án đúng.");
      return;
    }
    setSaving(true);
    const dto = {
      question: text.trim(),
      options: options.map((o) => o.trim()),
      correctIndex: correct,
      explanation: explanation.trim() || undefined,
    };
    try {
      if (question)
        await axiosClient.patch(
          `/grammar/topics/${topicId}/questions/${question.id}`,
          dto,
        );
      else
        await axiosClient.post(`/grammar/topics/${topicId}/questions`, {
          ...dto,
          order: nextOrder,
        });
      toast.success(question ? "Đã lưu câu hỏi." : "Đã thêm câu hỏi.");
      onDone(true);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không thể lưu câu hỏi."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="mt-3 space-y-3 border-t border-slate-100 pt-3"
    >
      <label className="block text-sm font-medium text-slate-800">
        Đề bài
        <textarea
          rows={2}
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Ví dụ: She ___ in Hanoi since 2019."
          className={FIELD}
        />
      </label>
      <fieldset>
        <legend className="text-sm font-medium text-slate-800">
          Phương án và đáp án đúng
        </legend>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {options.map((value, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 rounded-lg border px-3 ${
                correct === index
                  ? "border-emerald-400 bg-emerald-50/60 ring-1 ring-emerald-200"
                  : "border-slate-300 bg-white focus-within:border-slate-500"
              }`}
            >
              <label className="flex flex-none cursor-pointer items-center gap-2 py-2">
                <input
                  type="radio"
                  name={`grammar-correct-${question?.id ?? "new"}`}
                  checked={correct === index}
                  onChange={() => setCorrect(index)}
                  aria-label={`Phương án ${LETTERS[index]} là đáp án đúng`}
                  className="size-4 cursor-pointer accent-emerald-600"
                />
                <span className="w-4 text-sm font-semibold text-slate-700">
                  {LETTERS[index]}
                </span>
              </label>
              <input
                value={value}
                onChange={(event) =>
                  setOptions((rows) =>
                    rows.map((row, i) => (i === index ? event.target.value : row)),
                  )
                }
                aria-label={`Nội dung phương án ${LETTERS[index]}`}
                className="min-h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
              />
            </div>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-medium text-slate-800">
        Giải thích (học viên đọc sau khi trả lời)
        <textarea
          rows={2}
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
          className={FIELD}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={BTN_PRIMARY}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          {question ? "Lưu câu hỏi" : "Thêm câu hỏi"}
        </button>
        <button type="button" onClick={() => onDone(false)} className={BTN_SECONDARY}>
          Hủy
        </button>
      </div>
    </form>
  );
}

function TopicBody({ topic }: { topic: Topic | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const initial: TopicForm = {
    title: topic?.title ?? "",
    level: topic?.level ?? "BEGINNER",
    video: topic?.videoYoutubeId ?? "",
    keyFormula: topic?.keyFormula ?? "",
    description: topic?.description ?? "",
  };
  const [savedForm, setSavedForm] = useState(initial);
  const [form, setForm] = useState(initial);
  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  const questions = (topic?.questions ?? [])
    .slice()
    .sort((a, b) => a.order - b.order || a.id - b.id);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiCount, setAiCount] = useState(5);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewPick, setPreviewPick] = useState<number | null>(null);
  const [confirmLifecycle, setConfirmLifecycle] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Question | null>(null);
  const published = topic?.publicationStatus === "PUBLISHED";
  const nextOrder = (questions.at(-1)?.order ?? 0) + 1;
  const checklist = grammarChecklist({
    title: form.title,
    description: form.description,
    questions,
  });
  const doneCount = checklist.filter((item) => item.done).length;
  const previewQuestion = questions[Math.min(previewIndex, questions.length - 1)];

  useEffect(() => {
    if (!dirty && !pendingQuestions.length) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pendingQuestions.length]);

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["admin-grammar-topic-detail", topic?.id],
    });
    queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
  };

  /** Sequential, so questions keep the order they were chosen in. */
  const addQuestions = async (
    topicId: number,
    rows: Candidate[],
    base: number,
  ) => {
    let added = 0;
    for (const [index, row] of rows.entries()) {
      setProgress(`Đang thêm câu ${index + 1}/${rows.length}`);
      await axiosClient.post(`/grammar/topics/${topicId}/questions`, {
        question: row.question.trim(),
        options: row.options.map((o) => o.trim()),
        correctIndex: row.correctIndex,
        explanation: row.explanation?.trim() || undefined,
        order: base + index,
      });
      added++;
    }
    setProgress(null);
    return added;
  };

  const saveTopic = async () => {
    if (!form.title.trim()) {
      toast.error("Cần nhập tên chủ đề.");
      return;
    }
    setBusy(true);
    const dto = {
      title: form.title.trim(),
      level: form.level,
      videoYoutubeId: youtubeIdFrom(form.video) || undefined,
      keyFormula: form.keyFormula.trim() || undefined,
      description: form.description.trim() || undefined,
    };
    try {
      if (topic) {
        await axiosClient.patch(`/grammar/topics/${topic.id}`, dto);
        if (pendingQuestions.length)
          await addQuestions(topic.id, pendingQuestions, nextOrder);
        setSavedForm(form);
        setPendingQuestions([]);
        toast.success("Đã lưu chủ đề.");
        refresh();
      } else {
        const created = unwrap<{ id: number }>(
          await axiosClient.post("/grammar/topics", dto),
        );
        if (pendingQuestions.length)
          await addQuestions(created.id, pendingQuestions, 1);
        setSavedForm(form);
        setPendingQuestions([]);
        toast.success("Đã tạo chủ đề.");
        queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
        router.replace(`/admin/grammar/${created.id}`);
      }
    } catch (err: any) {
      setProgress(null);
      toast.error(getApiErrorMessage(err, "Không thể lưu chủ đề."));
    } finally {
      setBusy(false);
    }
  };

  /** Empty topic: AI writes the theory and the questions; otherwise it adds questions. */
  const askAi = async () => {
    if (!form.title.trim()) {
      toast.error("Cần tên chủ đề để AI biết viết về gì.");
      return;
    }
    setBusy(true);
    try {
      if (!questions.length && !form.description.trim()) {
        const data = unwrap<any>(
          await axiosClient.post("/admin/grammar/ai/full-draft", {
            topicTitle: form.title.trim(),
            level: form.level,
            count: aiCount,
          }),
        );
        setForm((current) => ({
          ...current,
          description: current.description || String(data?.description ?? ""),
          keyFormula: current.keyFormula || String(data?.keyFormula ?? ""),
        }));
        setCandidates(
          (data?.questions ?? []).map((q: any) => ({ ...q, chosen: true })),
        );
        toast.success("AI đã viết lý thuyết và gợi ý câu hỏi. Hãy xem lại.");
      } else {
        const data = unwrap<any>(
          await axiosClient.post("/admin/grammar/ai/suggest-questions", {
            topicTitle: form.title.trim(),
            level: form.level,
            theory: form.description.trim() || undefined,
            keyFormula: form.keyFormula.trim() || undefined,
            count: aiCount,
          }),
        );
        setCandidates(
          (data?.candidates ?? []).map((q: any) => ({ ...q, chosen: true })),
        );
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không thể lấy gợi ý AI lúc này."));
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!topic) return;
    const ids = questions.map((q) => q.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      await axiosClient.post(`/grammar/topics/${topic.id}/reorder-questions`, {
        questionIds: ids,
      });
      refresh();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không thể đổi thứ tự."));
    }
  };

  const videoId = youtubeIdFrom(form.video);

  return (
    <main className="space-y-6 p-6">
      <Link
        href="/admin/grammar"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> Danh sách
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            {topic ? topic.title : "Tạo chủ đề ngữ pháp"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {topic ? (published ? "Đã xuất bản" : "Bản nháp") : "Chủ đề mới, chưa lưu"} ·{" "}
            {doneCount}/{checklist.length} mục sẵn sàng
            {dirty && " · có thay đổi chưa lưu"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void saveTopic()} disabled={busy} className={BTN_SECONDARY}>
            <Save size={16} /> {topic ? "Lưu" : "Tạo chủ đề"}
          </button>
          {topic && (
            <button
              type="button"
              onClick={() => setConfirmLifecycle(true)}
              disabled={busy}
              className={BTN_SUCCESS}
            >
              <Send size={16} />
              {published ? "Chuyển về bản nháp" : "Kiểm tra & xuất bản"}
            </button>
          )}
        </div>
      </header>

      {/* Two columns from 1280px: the lesson and its questions on the left; a
          400px rail with the checklist and the learner view (24px gap). */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-start-1">
          <h2 className="font-semibold text-slate-950">Bài học</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
            <label className="text-sm font-medium text-slate-800">
              Tên chủ đề
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Ví dụ: Thì hiện tại hoàn thành"
                className={FIELD}
              />
            </label>
            <label className="text-sm font-medium text-slate-800">
              Trình độ
              <select
                value={form.level}
                onChange={(event) => setForm({ ...form, level: event.target.value })}
                className={FIELD}
              >
                {GRAMMAR_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-800">
              Công thức chính
              <input
                value={form.keyFormula}
                onChange={(event) => setForm({ ...form, keyFormula: event.target.value })}
                placeholder="S + have/has + V3"
                className={FIELD}
              />
            </label>
            <label className="text-sm font-medium text-slate-800">
              Video YouTube (link hoặc mã)
              <input
                value={form.video}
                onChange={(event) => setForm({ ...form, video: event.target.value })}
                placeholder="https://youtu.be/…"
                className={FIELD}
              />
              {form.video && (
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  Mã video: {videoId || "—"}
                </span>
              )}
            </label>
            <div className="grid gap-4 md:col-span-2 lg:grid-cols-2">
              <label className="text-sm font-medium text-slate-800">
                Lý thuyết
                <textarea
                  rows={12}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder={"Cách dùng, dấu hiệu nhận biết, ví dụ.\nMỗi ý một dòng."}
                  className={`${FIELD} leading-relaxed`}
                />
              </label>
              <div className="text-sm font-medium text-slate-800">
                Học viên sẽ thấy
                <div className="mt-1 min-h-[17rem] rounded-lg border border-slate-200 bg-slate-50 p-3 font-normal">
                  {form.keyFormula && (
                    <p className="mb-2 rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-900">
                      {form.keyFormula}
                    </p>
                  )}
                  <p className="whitespace-pre-line leading-relaxed text-slate-700">
                    {form.description || "Chưa có lý thuyết."}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {pendingQuestions.length > 0 && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-sm text-slate-700">
              {pendingQuestions.length} câu hỏi từ AI sẽ được thêm khi bấm{" "}
              {topic ? "Lưu" : "Tạo chủ đề"}.
            </p>
          )}
        </section>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:col-start-2 xl:row-span-2 xl:row-start-1">
          <section aria-labelledby="grammar-checklist-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="grammar-checklist-heading" className="font-semibold text-slate-950">
                Trước khi xuất bản
              </h2>
              <span className="text-sm tabular-nums text-slate-500">
                {doneCount}/{checklist.length}
              </span>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {checklist.map((entry) => (
                <li key={entry.label} className="flex items-center gap-2">
                  {entry.done ? (
                    <CheckCircle2 size={16} className="flex-none text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Circle size={16} className="flex-none text-slate-300" aria-hidden="true" />
                  )}
                  <span className={entry.done ? "text-slate-600" : "font-medium text-slate-900"}>{entry.label}</span>
                  <span className="sr-only">{entry.done ? "(đã xong)" : "(chưa xong)"}</span>
                </li>
              ))}
            </ul>
          </section>

          {previewQuestion && (
            <section aria-labelledby="grammar-preview-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="grammar-preview-heading" className="font-semibold text-slate-950">
                  Học viên làm bài
                </h2>
                <span className="text-sm tabular-nums text-slate-500">
                  {Math.min(previewIndex, questions.length - 1) + 1}/{questions.length}
                </span>
              </div>
              <p className="mt-3 font-semibold text-slate-900">{previewQuestion.question}</p>
              <ul className="mt-3 space-y-2">
                {previewQuestion.options.map((option, index) => {
                  const picked = previewPick === index;
                  const right = index === previewQuestion.correctIndex;
                  return (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => setPreviewPick(index)}
                        className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left text-sm ${
                          previewPick === null
                            ? "border-slate-200 hover:border-slate-300"
                            : right
                              ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                              : picked
                                ? "border-rose-300 bg-rose-50 text-rose-900"
                                : "border-slate-200 text-slate-500"
                        }`}
                      >
                        <span className="mr-2 font-semibold">{LETTERS[index]}</span>
                        {option}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {previewPick !== null && previewQuestion.explanation && (
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {previewQuestion.explanation}
                </p>
              )}
              <div className="mt-3 flex justify-between">
                <button
                  type="button"
                  disabled={previewIndex === 0}
                  onClick={() => {
                    setPreviewIndex((i) => Math.max(0, i - 1));
                    setPreviewPick(null);
                  }}
                  className={BTN_SECONDARY}
                >
                  Câu trước
                </button>
                <button
                  type="button"
                  disabled={previewIndex >= questions.length - 1}
                  onClick={() => {
                    setPreviewIndex((i) => Math.min(questions.length - 1, i + 1));
                    setPreviewPick(null);
                  }}
                  className={BTN_SECONDARY}
                >
                  Câu sau
                </button>
              </div>
            </section>
          )}
        </aside>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-start-1">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-semibold text-slate-950">
              Câu hỏi <span className="font-normal tabular-nums text-slate-500">{questions.length}</span>
            </h2>
            <p className="text-sm text-slate-500">Bấm Sửa để sửa ngay tại câu.</p>
          </div>

          <ol className="mt-4 space-y-3">
            {topic && questions.length === 0 && (
              <li className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                Chưa có câu hỏi. Thêm bên dưới hoặc nhờ AI gợi ý.
              </li>
            )}
            {questions.map((question, index) => {
              const editing = editingId === question.id;
              return (
                <li
                  key={question.id}
                  className={`rounded-lg border p-4 ${editing ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="flex size-7 flex-none items-center justify-center rounded-md bg-slate-100 text-xs font-semibold tabular-nums text-slate-700">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewIndex(index);
                        setPreviewPick(null);
                      }}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                      title="Xem như học viên"
                    >
                      <p className="font-medium text-slate-950">{question.question}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Đáp án: {LETTERS[question.correctIndex]} ·{" "}
                        {question.options[question.correctIndex]}
                      </p>
                    </button>
                    <div className="flex flex-none items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void move(index, -1)}
                        disabled={index === 0}
                        aria-label={`Đưa câu ${index + 1} lên trước`}
                        className={ICON_BTN}
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void move(index, 1)}
                        disabled={index === questions.length - 1}
                        aria-label={`Đưa câu ${index + 1} xuống sau`}
                        className={ICON_BTN}
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(question.id)}
                        disabled={editing}
                        className={BTN_SECONDARY}
                      >
                        {editing ? "Đang sửa" : "Sửa"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(question)}
                        aria-label={`Xóa câu ${index + 1}`}
                        className={BTN_DANGER}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {editing && topic && (
                    <QuestionForm
                      topicId={topic.id}
                      question={question}
                      nextOrder={nextOrder}
                      onDone={(saved) => {
                        setEditingId(null);
                        if (saved) refresh();
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          {progress && (
            <p className="mt-3 inline-flex items-center gap-2 text-sm tabular-nums text-slate-700">
              <Loader2 size={14} className="animate-spin" /> {progress}
            </p>
          )}

          <div className="mt-4 border-t border-slate-100 pt-4">
            {editingId === "new" && topic && (
              <div className="mb-4 rounded-lg border border-blue-300 bg-blue-50/30 p-4">
                <p className="text-sm font-semibold text-slate-900">Câu hỏi mới</p>
                <QuestionForm
                  topicId={topic.id}
                  question={null}
                  nextOrder={nextOrder}
                  onDone={(saved) => {
                    setEditingId(null);
                    if (saved) refresh();
                  }}
                />
              </div>
            )}

            {aiOpen && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {!questions.length && !form.description.trim()
                      ? "AI viết lý thuyết và câu hỏi"
                      : "AI gợi ý thêm câu hỏi"}
                  </p>
                  <label className="ml-auto flex items-center gap-1.5 text-sm text-slate-600">
                    Số câu
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={aiCount}
                      onChange={(event) => setAiCount(Math.min(20, Math.max(1, Number(event.target.value) || 1)))}
                      className="min-h-10 w-16 rounded-lg border border-slate-300 px-2 text-center text-sm"
                    />
                  </label>
                  <button type="button" disabled={busy} onClick={() => void askAi()} className={BTN_AI}>
                    {busy && !progress && <Loader2 size={14} className="animate-spin" />}
                    {candidates.length ? "Gợi ý lại" : "Gợi ý"}
                  </button>
                </div>
                {candidates.length > 0 && (
                  <>
                    <ul className="mt-3 space-y-2">
                      {candidates.map((candidate, index) => (
                        <li key={`${candidate.question}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                          <label className="flex cursor-pointer items-start gap-2">
                            <input
                              type="checkbox"
                              checked={candidate.chosen}
                              onChange={() =>
                                setCandidates((rows) =>
                                  rows.map((r, i) => (i === index ? { ...r, chosen: !r.chosen } : r)),
                                )
                              }
                              className="mt-0.5 size-4 flex-none"
                            />
                            <span>
                              <span className="font-medium text-slate-950">{candidate.question}</span>
                              <span className="mt-1 block text-slate-600">
                                {candidate.options
                                  .map((o, i) => `${LETTERS[i]}. ${o}${i === candidate.correctIndex ? " (đúng)" : ""}`)
                                  .join("   ")}
                              </span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      disabled={busy || !candidates.some((c) => c.chosen)}
                      onClick={async () => {
                        const chosen = candidates.filter((c) => c.chosen);
                        if (!topic) {
                          setPendingQuestions(chosen);
                          setCandidates([]);
                          setAiOpen(false);
                          return;
                        }
                        setBusy(true);
                        try {
                          const added = await addQuestions(topic.id, chosen, nextOrder);
                          toast.success(`Đã thêm ${added} câu hỏi.`);
                          setCandidates([]);
                          setAiOpen(false);
                        } catch (err: any) {
                          setProgress(null);
                          toast.error(getApiErrorMessage(err, "Không thể thêm câu hỏi."));
                        } finally {
                          setBusy(false);
                          refresh();
                        }
                      }}
                      className={`${BTN_PRIMARY} mt-3`}
                    >
                      <Plus size={16} />{" "}
                      {topic
                        ? `Thêm ${candidates.filter((c) => c.chosen).length} câu đã chọn`
                        : `Giữ ${candidates.filter((c) => c.chosen).length} câu để thêm khi tạo chủ đề`}
                    </button>
                  </>
                )}
              </div>
            )}

            {editingId !== "new" && (
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!topic} onClick={() => setEditingId("new")} className={BTN_SECONDARY}>
                  <Plus size={16} /> Thêm câu hỏi
                </button>
                <button type="button" onClick={() => setAiOpen((open) => !open)} className={BTN_AI}>
                  {!questions.length && !form.description.trim() ? "Soạn bằng AI" : "Thêm câu hỏi bằng AI"}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmLifecycle}
        title={published ? "Chuyển chủ đề về bản nháp?" : "Xuất bản chủ đề?"}
        description={
          published
            ? "Học viên sẽ không thấy chủ đề này cho đến khi xuất bản lại."
            : `Chủ đề ${grammarLevelLabel(form.level).toLowerCase()} sẽ hiện trong mục Ngữ pháp của học viên.`
        }
        confirmLabel={published ? "Chuyển về bản nháp" : "Xuất bản"}
        onConfirm={async () => {
          setConfirmLifecycle(false);
          if (!topic) return;
          try {
            await axiosClient.post(`/grammar/topics/${topic.id}/${published ? "unpublish" : "publish"}`);
            toast.success(published ? "Đã chuyển về bản nháp." : "Đã xuất bản.");
            refresh();
          } catch (err: any) {
            toast.error(getApiErrorMessage(err, "Không thể đổi trạng thái."));
          }
        }}
        onCancel={() => setConfirmLifecycle(false)}
      />
      {pendingDelete && topic && (
        <ConfirmDialog
          open={true}
          title="Xóa câu hỏi"
          description={`Xóa câu "${pendingDelete.question}"?`}
          confirmLabel="Xóa"
          onConfirm={async () => {
            try {
              await axiosClient.delete(`/grammar/topics/${topic.id}/questions/${pendingDelete.id}`);
              toast.success("Đã xóa câu hỏi.");
              refresh();
            } catch (err: any) {
              toast.error(getApiErrorMessage(err, "Không thể xóa câu hỏi."));
            } finally {
              setPendingDelete(null);
            }
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </main>
  );
}
