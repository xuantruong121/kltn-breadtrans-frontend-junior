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
  ClipboardPaste,
  Copy,
  Loader2,
  Lock,
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
  OPTION_LETTERS,
  grammarChecklist,
  grammarLevelLabel,
  publishBlocker,
  rationaleCount,
  youtubeIdFrom,
  type GrammarDraft,
} from "./grammarCms";
import GrammarQuestionForm from "./GrammarQuestionForm";
import GrammarPastePanel from "./GrammarPastePanel";

type Question = GrammarDraft & { id: number; order: number };

type Topic = {
  id: number;
  title: string;
  description?: string | null;
  level: string;
  videoYoutubeId?: string | null;
  keyFormula?: string | null;
  publicationStatus: "DRAFT" | "PUBLISHED";
  questions: Question[];
  /** Attempts by learners; once there is one, graded content is locked. */
  learnerAttemptCount?: number;
  locked?: boolean;
};

type TopicForm = {
  title: string;
  level: string;
  video: string;
  keyFormula: string;
  description: string;
};

type Candidate = GrammarDraft & { chosen: boolean };

const FIELD =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
const ICON_BTN =
  "inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40";
/** The server's AI limits: more questions for a whole draft than for a top-up. */
const AI_MAX = { draft: 20, suggest: 5 };
const unwrap = <T,>(value: any): T => (value?.data ?? value) as T;

const toDto = (draft: GrammarDraft) => ({
  question: draft.question,
  options: draft.options,
  correctIndex: draft.correctIndex,
  explanation: draft.explanation ?? undefined,
  optionExplanations: draft.optionExplanations ?? undefined,
});

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
  const locked = Boolean(topic?.locked);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  // A duplicated question opens as a new, unsaved copy.
  const [copyFrom, setCopyFrom] = useState<GrammarDraft | null>(null);
  const [panel, setPanel] = useState<"paste" | "ai" | null>(null);
  const [aiCount, setAiCount] = useState(5);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [editingCandidate, setEditingCandidate] = useState<number | null>(null);
  const [pendingQuestions, setPendingQuestions] = useState<GrammarDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewPick, setPreviewPick] = useState<number | null>(null);
  const [previewTab, setPreviewTab] = useState<"theory" | "questions">("theory");
  // The optional video sits folded unless the topic already has one.
  const [videoOpen, setVideoOpen] = useState(Boolean(topic?.videoYoutubeId));
  const [confirmLifecycle, setConfirmLifecycle] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Question | null>(null);
  const published = topic?.publicationStatus === "PUBLISHED";
  const aiDraftsWholeTopic = !questions.length && !form.description.trim();
  const aiMax = aiDraftsWholeTopic ? AI_MAX.draft : AI_MAX.suggest;
  const checklist = grammarChecklist({
    title: form.title,
    description: form.description,
    questions,
  });
  const doneCount = checklist.filter((item) => item.done).length;
  const blocker = published
    ? null
    : publishBlocker(checklist, dirty || pendingQuestions.length > 0);
  const previewQuestion = questions[Math.min(previewIndex, questions.length - 1)];
  const videoId = youtubeIdFrom(form.video);
  const videoInvalid = Boolean(form.video.trim()) && !videoId;

  useEffect(() => {
    if (!dirty && !pendingQuestions.length && editingId === null) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pendingQuestions.length, editingId]);

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["admin-grammar-topic-detail", topic?.id],
    });
    queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
  };

  /** One request: the server adds all of them after the last question, or none. */
  const addBatch = (topicId: number, drafts: GrammarDraft[]) =>
    axiosClient.post(`/grammar/topics/${topicId}/questions/bulk`, {
      questions: drafts.map(toDto),
    });

  /** New questions go in now, or wait for the topic to be created. */
  const addQuestions = async (drafts: GrammarDraft[]) => {
    if (!topic) {
      setPendingQuestions((current) => [...current, ...drafts]);
      toast.success(`Giữ ${drafts.length} câu; sẽ thêm khi bấm Tạo chủ đề.`);
      return true;
    }
    try {
      await addBatch(topic.id, drafts);
      toast.success(`Đã thêm ${drafts.length} câu hỏi.`);
      refresh();
      return true;
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không thể thêm câu hỏi."));
      return false;
    }
  };

  const saveQuestion = async (question: Question | null, draft: GrammarDraft) => {
    if (!topic) return false;
    try {
      if (question)
        await axiosClient.patch(
          `/grammar/topics/${topic.id}/questions/${question.id}`,
          // Locked: only the notes and the explanation may change.
          locked
            ? {
                explanation: draft.explanation ?? "",
                optionExplanations: draft.optionExplanations,
              }
            : toDto(draft),
        );
      else await addBatch(topic.id, [draft]);
      toast.success(question ? "Đã lưu câu hỏi." : "Đã thêm câu hỏi.");
      setEditingId(null);
      setCopyFrom(null);
      refresh();
      return true;
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không thể lưu câu hỏi."));
      return false;
    }
  };

  const saveTopic = async () => {
    if (!form.title.trim()) {
      toast.error("Cần nhập tên chủ đề.");
      return;
    }
    if (videoInvalid) {
      toast.error("Link video không phải YouTube. Sửa hoặc xoá trước khi lưu.");
      return;
    }
    setBusy(true);
    const dto = {
      title: form.title.trim(),
      level: form.level,
      videoYoutubeId: videoId,
      keyFormula: form.keyFormula.trim(),
      description: form.description.trim(),
    };
    try {
      if (topic) {
        await axiosClient.patch(`/grammar/topics/${topic.id}`, dto);
        if (pendingQuestions.length) await addBatch(topic.id, pendingQuestions);
        setSavedForm(form);
        setPendingQuestions([]);
        toast.success("Đã lưu chủ đề.");
        refresh();
      } else {
        const created = unwrap<{ id: number }>(
          await axiosClient.post("/grammar/topics", {
            ...dto,
            videoYoutubeId: dto.videoYoutubeId || undefined,
          }),
        );
        if (pendingQuestions.length) await addBatch(created.id, pendingQuestions);
        setSavedForm(form);
        setPendingQuestions([]);
        toast.success("Đã tạo chủ đề.");
        queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
        router.replace(`/admin/grammar/${created.id}`);
      }
    } catch (err: any) {
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
    const count = Math.min(aiCount, aiMax);
    try {
      if (aiDraftsWholeTopic) {
        const data = unwrap<any>(
          await axiosClient.post("/admin/grammar/ai/full-draft", {
            topicTitle: form.title.trim(),
            level: form.level,
            count,
          }),
        );
        setForm((current) => ({
          ...current,
          description: current.description || String(data?.description ?? ""),
          keyFormula: current.keyFormula || String(data?.keyFormula ?? ""),
        }));
        setCandidates((data?.questions ?? []).map((q: GrammarDraft) => ({ ...q, chosen: true })));
        toast.success("AI đã viết lý thuyết và gợi ý câu hỏi. Hãy xem lại.");
      } else {
        const data = unwrap<any>(
          await axiosClient.post("/admin/grammar/ai/suggest-questions", {
            topicTitle: form.title.trim(),
            level: form.level,
            theory: form.description.trim() || undefined,
            keyFormula: form.keyFormula.trim() || undefined,
            count,
          }),
        );
        setCandidates((data?.candidates ?? []).map((q: GrammarDraft) => ({ ...q, chosen: true })));
      }
      setEditingCandidate(null);
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

  const chosenCount = candidates.filter((c) => c.chosen).length;
  const pendingLabel = (count: number) =>
    topic ? `Thêm ${count} câu` : `Giữ ${count} câu để thêm khi tạo chủ đề`;
  const pickedNote =
    previewQuestion && previewPick !== null && previewPick !== previewQuestion.correctIndex
      ? previewQuestion.optionExplanations?.[previewPick]
      : null;

  return (
    <main className="space-y-6 p-6">
      <Link
        href="/admin/grammar"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
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
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void saveTopic()} disabled={busy} className={BTN_SECONDARY}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{" "}
              {topic ? "Lưu" : "Tạo chủ đề"}
            </button>
            {topic && (
              <button
                type="button"
                onClick={() => setConfirmLifecycle(true)}
                disabled={busy || Boolean(blocker)}
                title={blocker ?? undefined}
                className={BTN_SUCCESS}
              >
                <Send size={16} />
                {published ? "Chuyển về bản nháp" : "Xuất bản"}
              </button>
            )}
          </div>
          {topic && blocker && (
            <p className="max-w-md text-right text-sm text-slate-600">{blocker}</p>
          )}
        </div>
      </header>

      {locked && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Lock size={16} className="mt-0.5 flex-none" aria-hidden="true" />
          {topic?.learnerAttemptCount} lượt học viên đã làm chủ đề này. Đề bài, phương án và đáp án đã
          khoá để kết quả cũ vẫn đúng; vẫn sửa được lý do sai, giải thích và thứ tự câu, và thêm câu mới.
        </p>
      )}

      {/* Two columns from 1280px: the lesson and its questions on the left; a
          400px rail with the checklist and the learner view (24px gap). */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
        <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-start-1">
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
            <label className="text-sm font-medium text-slate-800 md:col-span-2">
              Công thức chính
              <input
                value={form.keyFormula}
                onChange={(event) => setForm({ ...form, keyFormula: event.target.value })}
                placeholder="S + have/has + V3"
                className={FIELD}
              />
            </label>
            <label className="text-sm font-medium text-slate-800 md:col-span-2">
              Lý thuyết
              {/* Grows with its text (5 lines to about 16), so a short rule
                  does not sit in a tall empty box. */}
              <textarea
                rows={5}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder={"Cách dùng, dấu hiệu nhận biết, ví dụ.\nMỗi ý một dòng."}
                className={`${FIELD} field-sizing-content max-h-96 min-h-32 leading-relaxed`}
              />
            </label>
          </div>
          <details
            open={videoOpen}
            onToggle={(event) => setVideoOpen(event.currentTarget.open)}
            className="mt-4 border-t border-slate-100 pt-4"
          >
            <summary className="cursor-pointer text-sm font-medium text-slate-800">
              Video minh hoạ (tuỳ chọn)
              {videoId && <span className="font-normal text-slate-600"> · đã gắn</span>}
            </summary>
            <p className="mt-2 text-sm text-slate-600">
              Học viên mở video trong mục &quot;Video minh hoạ&quot; dưới phần lý thuyết. Không có video thì mục
              này không hiện.
            </p>
            <label className="mt-3 block text-sm font-medium text-slate-800">
              Link YouTube hoặc mã video
              <input
                value={form.video}
                onChange={(event) => setForm({ ...form, video: event.target.value })}
                placeholder="https://youtu.be/…"
                aria-invalid={videoInvalid}
                className={`${FIELD} ${videoInvalid ? "border-rose-400" : ""}`}
              />
            </label>
            {videoInvalid && (
              <p className="mt-1 text-sm text-rose-700">Không nhận ra link YouTube.</p>
            )}
          </details>
          {pendingQuestions.length > 0 && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-sm text-slate-700">
              {pendingQuestions.length} câu hỏi sẽ được thêm khi bấm {topic ? "Lưu" : "Tạo chủ đề"}.
            </p>
          )}
        </section>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
          <section aria-labelledby="grammar-checklist-heading" className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="grammar-checklist-heading" className="font-semibold text-slate-950">
                Trước khi xuất bản
              </h2>
              <span className="text-sm tabular-nums text-slate-600">
                {doneCount}/{checklist.length}
              </span>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {checklist.map((entry) => (
                <li key={entry.label} className="flex items-center gap-2">
                  {entry.done ? (
                    <CheckCircle2 size={16} className="flex-none text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Circle size={16} className="flex-none text-slate-400" aria-hidden="true" />
                  )}
                  <span className={entry.done ? "text-slate-600" : "font-medium text-slate-900"}>
                    {entry.label}
                    {entry.optional && <span className="font-normal text-slate-600"> (nên có)</span>}
                  </span>
                  <span className="sr-only">{entry.done ? "(đã xong)" : "(chưa xong)"}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* The one learner preview: the lesson as it reads, or a question as
              it is answered. Nothing is previewed beside the form fields. */}
          <section aria-labelledby="grammar-preview-heading" className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 id="grammar-preview-heading" className="font-semibold text-slate-950">
                Xem như học viên
              </h2>
              <div role="tablist" aria-label="Nội dung xem trước" className="flex rounded-lg bg-slate-100 p-1">
                {(
                  [
                    ["theory", "Lý thuyết"],
                    ["questions", `Câu hỏi ${questions.length}`],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={previewTab === value}
                    onClick={() => setPreviewTab(value)}
                    className={`min-h-8 cursor-pointer rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
                      previewTab === value ? "bg-white text-slate-950" : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {previewTab === "theory" ? (
              <div className="mt-4 space-y-3 text-sm">
                {form.keyFormula.trim() && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-semibold text-amber-900">Công thức cốt lõi</p>
                    <p className="mt-1 font-semibold text-slate-950">{form.keyFormula}</p>
                  </div>
                )}
                <p className="whitespace-pre-line leading-relaxed text-slate-800">
                  {form.description.trim() || (
                    <span className="text-slate-600">Chưa có lý thuyết.</span>
                  )}
                </p>
                {videoId ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                    title="Video minh hoạ"
                    loading="lazy"
                    allow="encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="aspect-video w-full rounded-md border border-slate-200"
                  />
                ) : (
                  <p className="text-slate-600">Không có video minh hoạ.</p>
                )}
              </div>
            ) : !previewQuestion ? (
              <p className="mt-4 text-sm text-slate-600">Chưa có câu hỏi.</p>
            ) : (
              <div className="mt-4">
                <p className="text-sm tabular-nums text-slate-600">
                  Câu {Math.min(previewIndex, questions.length - 1) + 1}/{questions.length}
                </p>
                <p className="mt-1 font-semibold text-slate-900">{previewQuestion.question}</p>
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
                                  : "border-slate-200 text-slate-600"
                          }`}
                        >
                          <span className="mr-2 font-semibold">{OPTION_LETTERS[index]}</span>
                          {option}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {previewPick !== null && (pickedNote || previewQuestion.explanation) && (
                  <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    {pickedNote && (
                      <p>
                        <span className="font-semibold text-rose-800">Vì sao sai: </span>
                        {pickedNote}
                      </p>
                    )}
                    {previewQuestion.explanation && <p>{previewQuestion.explanation}</p>}
                  </div>
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
              </div>
            )}
          </section>
        </aside>

        <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-start-1">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-semibold text-slate-950">
              Câu hỏi <span className="font-normal tabular-nums text-slate-600">{questions.length}</span>
            </h2>
            <p className="text-sm text-slate-600">Bấm vào câu để xem như học viên.</p>
          </div>

          <ol className="mt-4 space-y-3">
            {topic && questions.length === 0 && (
              <li className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                Chưa có câu hỏi. Thêm từng câu, dán nhiều câu một lần, hoặc nhờ AI gợi ý.
              </li>
            )}
            {questions.map((question, index) => {
              const editing = editingId === question.id;
              const notes = rationaleCount(question);
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
                        setPreviewTab("questions");
                      }}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                      title="Xem như học viên"
                    >
                      <p className="font-medium text-slate-950">{question.question}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Đáp án: {OPTION_LETTERS[question.correctIndex]} ·{" "}
                        {question.options[question.correctIndex]} · Lý do sai {notes}/3
                        {!question.explanation && " · chưa có giải thích"}
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
                        onClick={() => {
                          setCopyFrom(question);
                          setEditingId("new");
                        }}
                        aria-label={`Nhân bản câu ${index + 1}`}
                        title="Nhân bản thành câu mới"
                        className={ICON_BTN}
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(question.id)}
                        disabled={editing}
                        className={BTN_SECONDARY}
                      >
                        {editing ? "Đang sửa" : "Sửa"}
                      </button>
                      {!locked && (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(question)}
                          aria-label={`Xóa câu ${index + 1}`}
                          className={BTN_DANGER}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {editing && (
                    <GrammarQuestionForm
                      formId={String(question.id)}
                      initial={question}
                      locked={locked}
                      submitLabel="Lưu câu hỏi"
                      onSubmit={(draft) => saveQuestion(question, draft)}
                      onCancel={() => setEditingId(null)}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          <div className="mt-4 border-t border-slate-100 pt-4">
            {editingId === "new" && topic && (
              <div className="mb-4 rounded-lg border border-blue-300 bg-blue-50/30 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {copyFrom ? "Câu mới (nhân bản)" : "Câu hỏi mới"}
                </p>
                <GrammarQuestionForm
                  key={copyFrom ? `copy-${copyFrom.question}` : "new"}
                  formId="new"
                  initial={copyFrom}
                  submitLabel="Thêm câu hỏi"
                  onSubmit={(draft) => saveQuestion(null, draft)}
                  onCancel={() => {
                    setEditingId(null);
                    setCopyFrom(null);
                  }}
                />
              </div>
            )}

            {panel === "paste" && (
              <GrammarPastePanel
                existingPrompts={[
                  ...questions.map((q) => q.question),
                  ...pendingQuestions.map((q) => q.question),
                ]}
                addLabel={pendingLabel}
                onAdd={async (drafts) => {
                  const added = await addQuestions(drafts);
                  if (added) setPanel(null);
                  return added;
                }}
                onClose={() => setPanel(null)}
              />
            )}

            {panel === "ai" && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {aiDraftsWholeTopic ? "AI viết lý thuyết và câu hỏi" : "AI gợi ý thêm câu hỏi"}
                  </p>
                  <label className="ml-auto flex items-center gap-1.5 text-sm text-slate-700">
                    Số câu (tối đa {aiMax})
                    <input
                      type="number"
                      min={1}
                      max={aiMax}
                      value={Math.min(aiCount, aiMax)}
                      onChange={(event) =>
                        setAiCount(Math.min(aiMax, Math.max(1, Number(event.target.value) || 1)))
                      }
                      className="min-h-10 w-16 rounded-lg border border-slate-300 px-2 text-center text-sm"
                    />
                  </label>
                  <button type="button" disabled={busy} onClick={() => void askAi()} className={BTN_AI}>
                    {busy && <Loader2 size={14} className="animate-spin" />}
                    {candidates.length ? "Gợi ý lại" : "Gợi ý"}
                  </button>
                  <button type="button" onClick={() => setPanel(null)} className={BTN_SECONDARY}>
                    Đóng
                  </button>
                </div>
                {candidates.length > 0 && (
                  <>
                    <p className="mt-3 text-sm text-slate-700">
                      Bỏ chọn câu không dùng; bấm Sửa để chỉnh trước khi thêm.
                    </p>
                    <ul className="mt-2 space-y-2">
                      {candidates.map((candidate, index) => (
                        <li key={index} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={candidate.chosen}
                              onChange={() =>
                                setCandidates((rows) =>
                                  rows.map((r, i) => (i === index ? { ...r, chosen: !r.chosen } : r)),
                                )
                              }
                              aria-label={`Chọn gợi ý ${index + 1}`}
                              className="mt-0.5 size-4 flex-none cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-slate-950">{candidate.question}</p>
                              <p className="mt-1 text-slate-700">
                                {candidate.options.map((option, i) => (
                                  <span
                                    key={i}
                                    className={`mr-3 ${i === candidate.correctIndex ? "font-semibold text-emerald-700" : ""}`}
                                  >
                                    {OPTION_LETTERS[i]}. {option}
                                  </span>
                                ))}
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                Lý do sai {rationaleCount(candidate)}/3
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditingCandidate(editingCandidate === index ? null : index)}
                              className={BTN_SECONDARY}
                            >
                              {editingCandidate === index ? "Đang sửa" : "Sửa"}
                            </button>
                          </div>
                          {editingCandidate === index && (
                            <GrammarQuestionForm
                              formId={`ai-${index}`}
                              initial={candidate}
                              submitLabel="Giữ chỉnh sửa"
                              onSubmit={(draft) => {
                                setCandidates((rows) =>
                                  rows.map((r, i) => (i === index ? { ...draft, chosen: true } : r)),
                                );
                                setEditingCandidate(null);
                              }}
                              onCancel={() => setEditingCandidate(null)}
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      disabled={busy || !chosenCount}
                      onClick={async () => {
                        setBusy(true);
                        const added = await addQuestions(
                          candidates
                            .filter((c) => c.chosen)
                            .map((c) => ({
                              question: c.question,
                              options: c.options,
                              correctIndex: c.correctIndex,
                              explanation: c.explanation,
                              optionExplanations: c.optionExplanations,
                            })),
                        );
                        setBusy(false);
                        if (added) {
                          setCandidates([]);
                          setPanel(null);
                        }
                      }}
                      className={`${BTN_PRIMARY} mt-3`}
                    >
                      <Plus size={16} /> {pendingLabel(chosenCount)} đã chọn
                    </button>
                  </>
                )}
              </div>
            )}

            {editingId !== "new" && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!topic}
                  title={topic ? undefined : "Tạo chủ đề trước"}
                  onClick={() => {
                    setCopyFrom(null);
                    setEditingId("new");
                  }}
                  className={BTN_SECONDARY}
                >
                  <Plus size={16} /> Thêm câu hỏi
                </button>
                <button
                  type="button"
                  onClick={() => setPanel(panel === "paste" ? null : "paste")}
                  aria-pressed={panel === "paste"}
                  className={BTN_SECONDARY}
                >
                  <ClipboardPaste size={16} /> Dán nhiều câu
                </button>
                <button
                  type="button"
                  onClick={() => setPanel(panel === "ai" ? null : "ai")}
                  aria-pressed={panel === "ai"}
                  className={BTN_AI}
                >
                  {aiDraftsWholeTopic ? "Soạn bằng AI" : "Thêm câu hỏi bằng AI"}
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
