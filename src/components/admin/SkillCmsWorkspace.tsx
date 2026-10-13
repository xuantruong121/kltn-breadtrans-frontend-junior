"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  FileAudio,
  FilePlus2,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
  Volume2,
} from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";

type Domain = "listening" | "reading" | "writing";
type ListeningSegment = {
  speaker: string;
  text: string;
  translation: string;
};
type QuestionDraft = {
  id?: number;
  type: string;
  prompt: string;
  options: string;
  correctIndex: string;
  explanation: string;
  segments: ListeningSegment[];
  taskType: string;
  level: string;
  imageUrl: string;
  keywords: string;
  wordMin: string;
  wordMax: string;
  sampleSentences: string;
};

const meta: Record<Domain, { label: string; type: string }> = {
  listening: { label: "Listening / Dictation", type: "LISTENING_PRACTICE" },
  reading: { label: "Reading", type: "BILINGUAL_READING" },
  writing: { label: "Writing", type: "WRITING_EMAIL" },
};

const emptySegment = (): ListeningSegment => ({ speaker: "", text: "", translation: "" });
const emptyQuestion = (domain: Domain): QuestionDraft => ({
  type: domain === "listening" ? "DICTATION" : domain === "writing" ? "WRITING" : "MULTIPLE_CHOICE",
  prompt: "",
  options: "",
  correctIndex: "",
  explanation: "",
  segments: [emptySegment()],
  taskType: domain === "writing" ? "EMAIL" : "",
  level: "",
  imageUrl: "",
  keywords: "",
  wordMin: "",
  wordMax: "",
  sampleSentences: "",
});

function unwrap<T>(value: any): T {
  return (value?.data ?? value) as T;
}

function questionToDraft(question: any): QuestionDraft {
  const content = question?.content && typeof question.content === "object" ? question.content : {};
  const range = Array.isArray(content.wordRange) ? content.wordRange : [];
  return {
    ...emptyQuestion(question?.type === "WRITING" ? "writing" : "listening"),
    id: question.id,
    type: question.type || "MULTIPLE_CHOICE",
    prompt: String(content.prompt ?? content.text ?? content.correctAnswer ?? content.audioText ?? ""),
    options: Array.isArray(content.options) ? content.options.join("\n") : "",
    correctIndex: content.correctIndex === undefined ? "" : String(content.correctIndex),
    explanation: typeof content.explanation === "string" ? content.explanation : String(content.explanation?.vi ?? ""),
    segments: Array.isArray(content.transcriptSegments)
      ? content.transcriptSegments.map((segment: any) => ({
          speaker: String(segment?.speaker ?? segment?.speakerId ?? ""),
          text: String(segment?.text ?? ""),
          translation: String(segment?.translation ?? ""),
        }))
      : [emptySegment()],
    taskType: String(content.taskType ?? "EMAIL"),
    level: String(content.level ?? ""),
    imageUrl: String(content.imageUrl ?? ""),
    keywords: Array.isArray(content.keywords)
      ? content.keywords.join("\n")
      : Array.isArray(content.requiredKeywords)
        ? content.requiredKeywords.join("\n")
        : "",
    wordMin: range[0] === undefined ? "" : String(range[0]),
    wordMax: range[1] === undefined ? "" : String(range[1]),
    sampleSentences: Array.isArray(content.sampleSentences) ? content.sampleSentences.join("\n") : "",
  };
}

function inputClassName(): string {
  return "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
}

export default function SkillCmsWorkspace({
  domain,
  mode = "list",
}: {
  domain: Domain;
  mode?: "list" | "edit";
}) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const id = mode === "edit" ? params?.id : undefined;
  const [items, setItems] = useState<any[]>([]);
  const [item, setItem] = useState<any | null>(null);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    level: "A2",
    timeLimit: "15",
    passage: "",
    type: meta[domain].type,
  });
  const [question, setQuestion] = useState<QuestionDraft>(emptyQuestion(domain));

  const title = useMemo(
    () =>
      mode === "list"
        ? `CMS ${meta[domain].label}`
        : id
          ? `Chỉnh sửa ${meta[domain].label}`
          : `Tạo ${meta[domain].label}`,
    [domain, id, mode],
  );

  const loadList = async () => {
    setLoading(true);
    try {
      setItems(unwrap<any[]>(await axiosClient.get(`/admin/skill-content/${domain}`)));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không thể tải nội dung CMS");
    } finally {
      setLoading(false);
    }
  };

  const loadItem = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [detail, audio] = await Promise.all([
        axiosClient.get(`/admin/skill-content/${domain}/${id}`),
        domain === "listening"
          ? axiosClient.get(`/admin/skill-content/listening/${id}/audio`)
          : Promise.resolve([]),
      ]);
      const data = unwrap<any>(detail);
      setItem(data);
      setArtifacts(domain === "listening" ? unwrap<any[]>(audio) : []);
      setForm({
        title: data.title || "",
        description: data.description || "",
        level: data.level || "A2",
        timeLimit: String(data.timeLimit ?? 15),
        passage: data.passage || data.theoryContent || "",
        type: data.type || meta[domain].type,
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không thể tải nội dung");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (mode === "list" ? loadList() : loadItem());
  }, [domain, mode, id]);

  const saveContent = async () => {
    if (!form.title.trim()) {
      toast.error("Cần nhập tiêu đề");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        timeLimit: Number(form.timeLimit) || undefined,
        type: domain === "writing" ? form.type : undefined,
      };
      const saved = id
        ? await axiosClient.patch(`/admin/skill-content/${domain}/${id}`, payload)
        : await axiosClient.post(`/admin/skill-content/${domain}`, payload);
      const savedItem = unwrap<any>(saved);
      toast.success("Đã lưu bản nháp");
      router.push(`/admin/${domain}/${savedItem.id}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Lưu thất bại");
    } finally {
      setBusy(false);
    }
  };

  const saveQuestion = async () => {
    if (!id || !question.prompt.trim()) {
      toast.error("Cần nhập đề bài hoặc transcript");
      return;
    }
    setBusy(true);
    try {
      if (domain === "writing") {
        const taskType = question.taskType.trim().toUpperCase();
        const pictureTask = form.type === "WRITING_PICTURE";
        const essayTask = [
          "PROPOSAL",
          "OPINION",
          "ESSAY",
          "OPINION_ESSAY",
          "ANALYTICAL_RESPONSE",
          "ARGUMENT",
        ].includes(taskType);
        const payload = {
          type: "WRITING",
          prompt: question.prompt.trim(),
          taskType: question.taskType.trim() || undefined,
          level: question.level.trim() || undefined,
          imageUrl: pictureTask ? question.imageUrl.trim() || undefined : undefined,
          keywords: pictureTask
            ? question.keywords.split("\n").map((value) => value.trim()).filter(Boolean)
            : undefined,
          wordRange: (!pictureTask || taskType === "SENTENCE") && question.wordMin && question.wordMax
            ? [Number(question.wordMin), Number(question.wordMax)]
            : essayTask && question.wordMin && question.wordMax
              ? [Number(question.wordMin), Number(question.wordMax)]
              : undefined,
          sampleSentences: pictureTask
            ? question.sampleSentences.split("\n").map((value) => value.trim()).filter(Boolean)
            : undefined,
          explanation: question.explanation.trim() || undefined,
        };
        if (question.id) {
          await axiosClient.patch(`/admin/skill-content/writing/${id}/questions/${question.id}`, payload);
        } else {
          await axiosClient.post(`/admin/skill-content/writing/${id}/questions`, payload);
        }
      } else {
        const content: Record<string, unknown> = {
          text: question.prompt.trim(),
          prompt: question.prompt.trim(),
          explanation: question.explanation.trim() || undefined,
        };
        if (domain === "listening") {
          if (question.type === "DICTATION") content.correctAnswer = question.prompt.trim();
          if (question.type === "DIALOGUE") {
            const segments = question.segments.filter((segment) => segment.speaker.trim() && segment.text.trim());
            if (segments.length < 2) {
              toast.error("Dialogue cần ít nhất 2 lượt lời");
              return;
            }
            content.transcriptSegments = segments.map((segment) => ({
              speaker: segment.speaker.trim(),
              text: segment.text.trim(),
              ...(segment.translation.trim() ? { translation: segment.translation.trim() } : {}),
            }));
          }
        }
        if (domain === "reading" && question.options.trim()) {
          content.options = question.options.split("\n").map((value) => value.trim()).filter(Boolean);
          content.correctIndex = Number(question.correctIndex);
        }
        const payload = { type: question.type, content };
        if (question.id) {
          await axiosClient.patch(
            domain === "listening"
              ? `/admin/skill-content/listening/${id}/questions/${question.id}`
              : `/admin/skill-content/${domain}/${id}/questions/${question.id}`,
            payload,
          );
        } else {
          await axiosClient.post(
            domain === "listening"
              ? `/admin/skill-content/listening/${id}/questions`
              : `/admin/skill-content/${domain}/${id}/questions`,
            payload,
          );
        }
      }
      toast.success("Đã lưu câu hỏi");
      setQuestion(emptyQuestion(domain));
      await loadItem();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Lưu câu hỏi thất bại");
    } finally {
      setBusy(false);
    }
  };

  const removeQuestion = async (questionId: number) => {
    if (!id) return;
    setBusy(true);
    try {
      await axiosClient.delete(`/admin/skill-content/${domain}/${id}/questions/${questionId}`);
      toast.success("Đã xóa câu hỏi");
      setPendingDeleteId(null);
      await loadItem();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không thể xóa");
    } finally {
      setBusy(false);
    }
  };

  const publish = async (status: "DRAFT" | "PUBLISHED") => {
    if (!id) return;
    setBusy(true);
    try {
      const check = unwrap<any>(await axiosClient.get(`/admin/skill-content/${domain}/${id}/validate`));
      if (!check.valid) {
        toast.error(check.errors.join("\n"));
        return;
      }
      await axiosClient.post(`/admin/skill-content/${domain}/${id}/publish`, { status });
      toast.success(status === "PUBLISHED" ? "Đã xuất bản" : "Đã chuyển về bản nháp");
      await loadItem();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không thể xuất bản");
    } finally {
      setBusy(false);
    }
  };

  const refreshArtifacts = async () => {
    if (!id || domain !== "listening") return;
    setArtifacts(unwrap<any[]>(await axiosClient.get(`/admin/skill-content/listening/${id}/audio`)));
  };

  const previewArtifact = async (artifactId: number) => {
    if (!id) return;
    setBusy(true);
    try {
      const response = await axiosClient.get(
        `/admin/skill-content/listening/${id}/audio/${artifactId}/preview`,
        { responseType: "blob" },
      );
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(response as unknown as Blob));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không thể tải audio preview");
    } finally {
      setBusy(false);
    }
  };

  const audioAction = async (action: "validate" | "generate-preview" | "approve" | "publish", artifactId?: number) => {
    if (!id) return;
    setBusy(true);
    try {
      const path = artifactId
        ? `/admin/skill-content/listening/${id}/audio/${artifactId}/${action}`
        : `/admin/skill-content/listening/${id}/audio/${action}`;
      const response = await (action === "validate" || action === "generate-preview"
        ? axiosClient.post(path)
        : axiosClient.post(path));
      const result = unwrap<any>(response);
      toast.success(action === "validate" ? (result.valid ? "Transcript hợp lệ" : "Transcript chưa hợp lệ") : "Đã cập nhật audio artifact");
      await refreshArtifacts();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không thể thực hiện thao tác audio");
    } finally {
      setBusy(false);
    }
  };

  const uploadQuestionAudio = async (questionId: number, file?: File) => {
    if (!id || !file) return;
    const body = new FormData();
    body.append("file", file);
    setBusy(true);
    try {
      await axiosClient.post(`/admin/skill-content/listening/${id}/questions/${questionId}/audio-assets`, body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Đã tải audio câu hỏi lên R2");
      await loadItem();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không thể tải audio lên");
    } finally {
      setBusy(false);
    }
  };

  const generateDialogueAudio = async (questionId: number) => {
    if (!id) return;
    setBusy(true);
    try {
      await axiosClient.post(`/admin/skill-content/listening/${id}/questions/${questionId}/audio-assets/generate-dialogue`);
      toast.success("Đã sinh audio Dialogue");
      await loadItem();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không thể sinh audio Dialogue");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-slate-600" /></div>;

  if (mode === "list") {
    return (
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">Skill CMS</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">Tạo, kiểm tra và xuất bản nội dung theo đúng runtime learner.</p>
          </div>
          <button onClick={() => router.push(`/admin/${domain}/new`)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
            <FilePlus2 size={16} /> Tạo bản nháp
          </button>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((content) => (
            <article key={content.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-950">{content.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{content.description || "Chưa có mô tả"}</p>
                </div>
                <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${content.publicationStatus === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {content.publicationStatus || "DRAFT"}
                </span>
              </div>
              <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                <span>{content._count?.questions ?? content.questions?.length ?? 0} câu hỏi</span>
                <button onClick={() => router.push(`/admin/${domain}/${content.id}`)} className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-800">Mở editor</button>
              </div>
            </article>
          ))}
          {items.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Chưa có nội dung {domain}.</div>}
        </div>
      </main>
    );
  }

  const questions = item?.questions || [];
  const isWriting = domain === "writing";
  const isListening = domain === "listening";
  const writingTaskType = question.taskType.trim().toUpperCase();
  const isPictureWriting = isWriting && form.type === "WRITING_PICTURE";
  const isEssayWriting = isWriting && [
    "PROPOSAL",
    "OPINION",
    "ESSAY",
    "OPINION_ESSAY",
    "ANALYTICAL_RESPONSE",
    "ARGUMENT",
  ].includes(writingTaskType);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <button onClick={() => router.push(`/admin/${domain}`)} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16} /> Danh sách</button>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">{meta[domain].label}</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">Trạng thái: {item?.publicationStatus || "DRAFT"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void saveContent()} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold"><Save size={16} /> Lưu</button>
          <button onClick={() => void publish(item?.publicationStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED")} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"><Send size={16} /> {item?.publicationStatus === "PUBLISHED" ? "Gỡ xuất bản" : "Kiểm tra & xuất bản"}</button>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-950">Thông tin nội dung</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">Tiêu đề<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClassName()} /></label>
          <label className="text-sm font-medium">Trình độ<input value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })} className={inputClassName()} /></label>
          <label className="text-sm font-medium md:col-span-2">Mô tả<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${inputClassName()} min-h-20`} /></label>
          {isWriting && <label className="text-sm font-medium">Writing quiz type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className={inputClassName()}><option value="WRITING_PICTURE">WRITING_PICTURE</option><option value="WRITING_EMAIL">WRITING_EMAIL</option></select></label>}
          {domain === "reading" && <label className="text-sm font-medium md:col-span-2">Đoạn đọc<textarea value={form.passage} onChange={(event) => setForm({ ...form, passage: event.target.value })} className={`${inputClassName()} min-h-40`} /></label>}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="font-semibold text-slate-950">Câu hỏi</h2><p className="mt-1 text-sm text-slate-500">Dữ liệu được lưu vào đúng Question runtime hiện hành.</p></div>
          <span className="text-sm text-slate-500">{questions.length} câu</span>
        </div>
        <div className="mt-4 space-y-3">
          {questions.map((current: any, index: number) => (
            <div key={current.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-semibold text-slate-500">Câu {index + 1} · {current.type}</p><p className="mt-1 text-sm text-slate-900">{questionToDraft(current).prompt || "Chưa có nội dung"}</p></div>
                <div className="flex gap-2"><button onClick={() => setQuestion(questionToDraft(current))} className="min-h-10 rounded border border-slate-200 px-2.5 py-1 text-xs font-semibold">Sửa</button><button onClick={() => setPendingDeleteId(current.id)} className="min-h-10 rounded border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600" aria-label="Xóa câu hỏi"><Trash2 size={14} /></button></div>
              </div>
              {isListening && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Volume2 size={14} /> {current.audioAssets?.length ? `${current.audioAssets.length} bản audio` : "Chưa có audio câu hỏi"}</span>
                  <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"><Upload size={14} /> Tải audio<input type="file" accept="audio/*" className="sr-only" onChange={(event) => void uploadQuestionAudio(current.id, event.target.files?.[0])} /></label>
                  {current.type === "DIALOGUE" && <button onClick={() => void generateDialogueAudio(current.id)} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"><FileAudio size={14} /> Sinh audio Dialogue</button>}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-2">
          <label className="text-sm font-medium">Loại câu<select value={question.type} onChange={(event) => setQuestion({ ...question, type: event.target.value })} className={inputClassName()}>
            {isListening ? <><option value="DICTATION">Dictation</option><option value="DIALOGUE">Dialogue</option><option value="MULTIPLE_CHOICE">Multiple choice</option></> : isWriting ? <option value="WRITING">Writing</option> : <option value="MULTIPLE_CHOICE">Multiple choice</option>}
          </select></label>
          <label className="text-sm font-medium">{isWriting ? "Đề bài / instruction" : "Nội dung / đề bài"}<textarea value={question.prompt} onChange={(event) => setQuestion({ ...question, prompt: event.target.value })} className={`${inputClassName()} min-h-24`} /></label>

          {isWriting && <>
            <label className="text-sm font-medium">Task family<input value={question.taskType} onChange={(event) => setQuestion({ ...question, taskType: event.target.value })} placeholder={isPictureWriting ? "SENTENCE hoặc PICTURE_SENTENCE" : "EMAIL, OPINION hoặc PROPOSAL"} className={inputClassName()} /></label>
            <label className="text-sm font-medium">Level<input value={question.level} onChange={(event) => setQuestion({ ...question, level: event.target.value })} placeholder="A2, B1, B2..." className={inputClassName()} /></label>
            {isPictureWriting && <>
              <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Picture task settings</div>
              <label className="text-sm font-medium md:col-span-2">Image URL <span className="font-normal text-slate-500">(R2/S3 URL nếu task yêu cầu hình)</span><input value={question.imageUrl} onChange={(event) => setQuestion({ ...question, imageUrl: event.target.value })} className={inputClassName()} /></label>
              <label className="text-sm font-medium">Keywords<textarea value={question.keywords} onChange={(event) => setQuestion({ ...question, keywords: event.target.value })} placeholder="Mỗi keyword một dòng" className={`${inputClassName()} min-h-24`} /></label>
              <label className="text-sm font-medium">Sample sentences<textarea value={question.sampleSentences} onChange={(event) => setQuestion({ ...question, sampleSentences: event.target.value })} placeholder="Mỗi câu một dòng" className={`${inputClassName()} min-h-24`} /></label>
            </>}
            {!isPictureWriting && <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">{isEssayWriting ? "Essay / opinion constraints" : "Email / message constraints"}</div>}
            {(!isPictureWriting || writingTaskType === "SENTENCE") && <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Từ tối thiểu<input type="number" min="1" value={question.wordMin} onChange={(event) => setQuestion({ ...question, wordMin: event.target.value })} className={inputClassName()} /></label><label className="text-sm font-medium">Từ tối đa<input type="number" min="1" value={question.wordMax} onChange={(event) => setQuestion({ ...question, wordMax: event.target.value })} className={inputClassName()} /></label></div>}
          </>}

          {domain === "reading" && <><label className="text-sm font-medium">Các lựa chọn<textarea value={question.options} onChange={(event) => setQuestion({ ...question, options: event.target.value })} placeholder="Mỗi lựa chọn một dòng" className={`${inputClassName()} min-h-24`} /></label><label className="text-sm font-medium">Vị trí đáp án đúng (0-based)<input value={question.correctIndex} onChange={(event) => setQuestion({ ...question, correctIndex: event.target.value })} className={inputClassName()} /></label></>}
          {isListening && question.type === "DIALOGUE" && <div className="md:col-span-2 space-y-3"><div className="flex items-center justify-between"><label className="text-sm font-medium">Transcript turns</label><button type="button" onClick={() => setQuestion({ ...question, segments: [...question.segments, emptySegment()] })} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"><Plus size={14} /> Thêm lượt lời</button></div>{question.segments.map((segment, index) => <div key={index} className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[140px_1fr_1fr_auto]"><input value={segment.speaker} onChange={(event) => setQuestion({ ...question, segments: question.segments.map((value, i) => i === index ? { ...value, speaker: event.target.value } : value) })} placeholder="Speaker" className={inputClassName()} /><input value={segment.text} onChange={(event) => setQuestion({ ...question, segments: question.segments.map((value, i) => i === index ? { ...value, text: event.target.value } : value) })} placeholder="English text" className={inputClassName()} /><input value={segment.translation} onChange={(event) => setQuestion({ ...question, segments: question.segments.map((value, i) => i === index ? { ...value, translation: event.target.value } : value) })} placeholder="Bản dịch (tuỳ chọn)" className={inputClassName()} /><button type="button" onClick={() => setQuestion({ ...question, segments: question.segments.filter((_, i) => i !== index) })} className="min-h-10 self-end rounded-lg border border-rose-200 px-3 text-rose-600" aria-label="Xóa lượt lời"><Trash2 size={14} /></button></div>)}</div>}
          <label className="text-sm font-medium md:col-span-2">Ghi chú / giải thích<textarea value={question.explanation} onChange={(event) => setQuestion({ ...question, explanation: event.target.value })} className={`${inputClassName()} min-h-20`} /></label>
        </div>
        <button onClick={() => void saveQuestion()} disabled={busy || !id} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} /> {question.id ? "Cập nhật câu hỏi" : "Thêm câu hỏi"}</button>
      </section>

      {isListening && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-950">Production audio</h2><p className="mt-1 text-sm text-slate-500">Dùng artifact versioned hiện có: validate → preview → approve → publish.</p></div><button onClick={() => void audioAction("validate")} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"><CheckCircle2 size={14} /> Validate transcript</button></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => void audioAction("generate-preview")} disabled={busy} className="min-h-10 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Generate preview artifact</button></div><div className="mt-4 space-y-2">{artifacts.map((artifact) => <div key={artifact.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm"><div><p className="font-semibold text-slate-900">v{artifact.version} · {artifact.status}</p><p className="mt-1 text-xs text-slate-500">{artifact.durationMs ? `${Math.round(artifact.durationMs / 1000)}s` : "Chưa có duration"} · {artifact.isStale ? "stale" : "current"}</p></div><div className="flex flex-wrap gap-2">{artifact.r2Key && !artifact.isStale && <button onClick={() => void previewArtifact(artifact.id)} disabled={busy} className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Preview audio</button>}{artifact.status === "PREVIEW_READY" && <button onClick={() => void audioAction("approve", artifact.id)} disabled={busy} className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Approve</button>}{artifact.status === "APPROVED" && <button onClick={() => void audioAction("publish", artifact.id)} disabled={busy} className="min-h-10 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Publish audio</button>}</div></div>)}{artifacts.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">Chưa có production artifact.</p>}{previewUrl && <audio controls className="w-full" src={previewUrl} aria-label="Listening artifact preview">Audio preview</audio>}</div></section>}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><CheckCircle2 className="mr-2 inline-block" size={16} /> Draft không xuất hiện trên learner API; publish chỉ chạy sau preflight domain.</div>
      {pendingDeleteId !== null && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-question-title"><div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"><h2 id="delete-question-title" className="font-semibold text-slate-950">Xóa câu hỏi?</h2><p className="mt-2 text-sm text-slate-600">Thao tác chỉ được thực hiện khi nội dung chưa có lịch sử làm bài.</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setPendingDeleteId(null)} className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">Hủy</button><button onClick={() => void removeQuestion(pendingDeleteId)} disabled={busy} className="min-h-10 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white">Xóa</button></div></div></div>}
    </main>
  );
}
