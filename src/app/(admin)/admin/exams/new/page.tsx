"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, FileStack } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type ExamOption = {
  variantCode: string;
  displayName: string;
  nextTitle: string;
  sections: Array<{ code: string; label: string; count: number; minutes: number }>;
  parts: Array<{ label: string; count: number }>;
};

const AI_JOB_STORAGE_KEY = "breadtrans:admin:toeic-ai-job";

const DIFFICULTIES = [
  { value: "easy", label: "Cơ bản" },
  { value: "medium", label: "Cân bằng" },
  { value: "hard", label: "Nâng cao" },
] as const;
type Difficulty = (typeof DIFFICULTIES)[number]["value"];

const STAGE_LABEL: Record<string, string> = {
  QUEUED: "Đang chờ đến lượt",
  WAITING_QUOTA: "Đang chờ hạn mức AI",
  GENERATING_TEXT: "Đang soạn nội dung",
  VALIDATING_TEXT: "Đang kiểm tra nội dung",
  GENERATING_MEDIA: "Đang tạo ảnh và audio",
  VALIDATING_MEDIA: "Đang kiểm tra ảnh và audio",
  READY_FOR_REVIEW: "Sẵn sàng để duyệt",
  READY_FOR_REVIEW_WITH_ERRORS: "Sẵn sàng để duyệt, còn nhóm chưa hoàn tất",
  PARTIALLY_APPLIED: "Đã áp dụng một phần vào bản nháp",
  APPLIED_TO_DRAFT: "Đã áp dụng vào bản nháp",
  FAILED: "Chưa tạo xong",
  CANCELLED: "Đã hủy",
};

export default function NewExamPage() {
  const router = useRouter();
  const [variantCode, setVariantCode] = useState("TOEIC_LR");
  // Empty means the suggested name; typing replaces it.
  const [typedTitle, setTypedTitle] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [authoringMode, setAuthoringMode] = useState<"MANUAL" | "AI">("MANUAL");
  const [generationMode, setGenerationMode] = useState<"FULL_EXAM" | "PART">("FULL_EXAM");
  const [part, setPart] = useState("5");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [aiJob, setAiJob] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const generationIdempotencyKey = useRef<string | null>(null);

  const { data: options = [] } = useQuery({
    queryKey: ["admin-exam-authoring-options"],
    queryFn: async () =>
      (await axiosClient.get("/admin/exams/authoring-options")) as unknown as ExamOption[],
  });
  const chosen = options.find((option) => option.variantCode === variantCode);
  const title = typedTitle ?? chosen?.nextTitle ?? "";
  const totalMinutes = chosen?.sections.reduce((sum, section) => sum + section.minutes, 0) ?? 0;

  const rememberAiJob = (job: any) => {
    setAiJob(job);
    if (!job?.id || typeof window === "undefined") return;
    window.sessionStorage.setItem(AI_JOB_STORAGE_KEY, job.id);
    window.history.replaceState(null, "", `/admin/exams/new?job=${encodeURIComponent(job.id)}`);
  };

  useEffect(() => {
    const jobId = new URLSearchParams(window.location.search).get("job") ||
      window.sessionStorage.getItem(AI_JOB_STORAGE_KEY);
    if (!jobId) return;
    void axiosClient
      .get(`/admin/exams/ai/jobs/${jobId}`)
      .then((job: any) => rememberAiJob(job))
      .catch(() => window.sessionStorage.removeItem(AI_JOB_STORAGE_KEY));
  }, []);

  const retryAiJob = async () => {
    if (!aiJob?.id) return;
    setIsSubmitting(true);
    try {
      const result: any = await axiosClient.post(
        `/admin/exams/ai/jobs/${aiJob.id}/retry`,
      );
      rememberAiJob(result);
      toast.success("Đã đưa lượt tạo đề vào hàng đợi để thử lại");
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Không thể thử lại lượt tạo đề"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCandidateWorkspace = () => {
    if (!aiJob?.id) return;
    router.push(`/admin/exams/ai/${aiJob.id}`);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (authoringMode === "MANUAL" && !title.trim()) return;
    setIsSubmitting(true);
    try {
      if (authoringMode === "AI") {
        generationIdempotencyKey.current ??= crypto.randomUUID();
        const result: any = await axiosClient.post("/admin/exams/ai/generate", {
          familyCode: "TOEIC",
          variantCode,
          mode: generationMode,
          part: generationMode === "PART" ? Number(part) : undefined,
          topic: topic.trim() || undefined,
          difficulty,
        }, { headers: { "Idempotency-Key": generationIdempotencyKey.current } });
        rememberAiJob(result);
        toast.success("Đã tạo bản nháp và đưa vào hàng đợi soạn đề");
        return;
      }
      const result: any = await axiosClient.post("/admin/exams", {
        familyCode: "TOEIC",
        variantCode,
        title: title.trim(),
        description: description.trim() || undefined,
        type: "FULL_TEST",
        difficulty,
        // A full test takes its length from the ETS template on the server.
      });
      toast.success("Đã tạo bản nháp đề");
      router.push(`/admin/exams?exam=${result?.id || ""}`);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Không thể tạo bản nháp đề"));
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!aiJob?.id || ["GENERATED", "FAILED", "CANCELLED"].includes(aiJob.status)) return;
    const timer = window.setInterval(async () => {
      try {
        const next: any = await axiosClient.get(`/admin/exams/ai/jobs/${aiJob.id}`);
        rememberAiJob(next);
      } catch {
        // The job record is durable; the next explicit refresh can recover UI.
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [aiJob?.id, aiJob?.status]);

  const fieldClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium outline-none focus:border-slate-500";

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <button
        onClick={() => router.push("/admin/exams")}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft size={16} /> Quay lại kho đề
      </button>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="border-b border-slate-100 pb-6">
          <h1 className="text-2xl font-bold text-slate-950">
            {authoringMode === "AI" ? "AI tạo đề TOEIC" : "Tạo đề TOEIC"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {authoringMode === "AI"
              ? "AI soạn nội dung theo đúng cấu trúc bên dưới. Bạn duyệt rồi mới áp dụng vào đề."
              : "Tạo bản nháp trống theo cấu trúc bên dưới, rồi soạn từng câu trong trang đề."}
          </p>
        </div>
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          <button type="button" onClick={() => setAuthoringMode("MANUAL")} className={`rounded-lg px-3 py-2 transition ${authoringMode === "MANUAL" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}>Tạo thủ công</button>
          <button type="button" onClick={() => setAuthoringMode("AI")} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 transition ${authoringMode === "AI" ? "bg-slate-950 text-white shadow-sm" : "text-slate-600"}`}><FileStack size={15} /> AI tạo đề</button>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-6">
          <div>
            <p className="text-sm font-bold text-slate-900">Loại đề</p>
            <div className="mt-3 grid gap-3">
              {options.map((option) => {
                const selected = variantCode === option.variantCode;
                return (
                  <button
                    type="button"
                    key={option.variantCode}
                    aria-pressed={selected}
                    onClick={() => {
                      setVariantCode(option.variantCode);
                      setTypedTitle(null);
                      if (option.variantCode !== "TOEIC_LR" && generationMode === "PART") {
                        setGenerationMode("FULL_EXAM");
                      }
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${selected ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900 hover:border-slate-400"}`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${selected ? "border-white bg-white text-slate-950" : "border-slate-300"}`}>
                      {selected && <Check size={14} aria-hidden="true" />}
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold">{option.displayName}</span>
                      <span className={`mt-1 block text-sm ${selected ? "text-slate-300" : "text-slate-600"}`}>
                        {option.sections.map((section) => `${section.label} ${section.count} câu`).join(" · ")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {chosen && (
            <section aria-label="Cấu trúc đề" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-bold text-slate-900">Cấu trúc đề · {totalMinutes} phút</p>
              <ul className="mt-2 space-y-1 text-slate-700">
                {chosen.sections.map((section) => (
                  <li key={section.code} className="flex justify-between gap-3">
                    <span>{section.label}</span>
                    <span className="tabular-nums">{section.count} câu · {section.minutes} phút</span>
                  </li>
                ))}
              </ul>
              {chosen.parts.length > 0 && (
                <p className="mt-2 text-slate-600">
                  {chosen.parts.map((item) => `${item.label}: ${item.count}`).join(" · ")}
                </p>
              )}
            </section>
          )}

          <label className="block text-sm font-semibold text-slate-800">
            Độ khó
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)} className={fieldClass}>
              {DIFFICULTIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          {authoringMode === "AI" && (
            <section className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-800">Chế độ tạo
                  <select value={generationMode} onChange={(event) => setGenerationMode(event.target.value as "FULL_EXAM" | "PART")} className={fieldClass}>
                    <option value="FULL_EXAM">Đề hoàn chỉnh</option>
                    <option value="PART" disabled={variantCode !== "TOEIC_LR"}>Sinh riêng một Part</option>
                  </select>
                </label>
                {generationMode === "PART" && <label className="text-sm font-semibold text-slate-800">Part
                  <select value={part} onChange={(event) => setPart(event.target.value)} className={fieldClass}>{[1,2,3,4,5,6,7].map((value) => <option key={value} value={value}>Part {value}</option>)}</select>
                </label>}
                <label className="text-sm font-semibold text-slate-800 sm:col-span-2">Chủ đề ưu tiên <span className="font-medium text-slate-600">(không bắt buộc)</span>
                  <input value={topic} onChange={(event) => setTopic(event.target.value)} className={fieldClass} placeholder="Ví dụ: giao tiếp nơi làm việc" />
                </label>
              </div>
              <p className="text-sm leading-6 text-slate-700">Không có ảnh phù hợp thì câu hỏi và đáp án vẫn được giữ, hệ thống báo danh sách ảnh để bạn tìm hoặc tải lên sau.</p>
            </section>
          )}
          {authoringMode === "MANUAL" && <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-800">
              Tên đề *
              <input
                required
                value={title}
                onChange={(e) => setTypedTitle(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Mô tả <span className="font-medium text-slate-600">(không bắt buộc)</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={fieldClass}
                placeholder="Để trống sẽ dùng lời ghi đề luyện tập"
              />
            </label>
          </div>}
          <p className="text-sm leading-6 text-slate-600">Đây là đề luyện tập mô phỏng cấu trúc TOEIC, không phải đề thi chính thức của ETS.</p>
          {aiJob && <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><p className="font-semibold text-slate-900">Tiến độ: {STAGE_LABEL[aiJob.stage] ?? "Đang xử lý"}</p><p className="mt-1 text-slate-600">{aiJob.error || (aiJob.status === "GENERATED" ? "Đề đã qua kiểm tra cấu trúc. Hãy duyệt rồi áp dụng vào bản nháp trước khi xuất bản." : "Tiến độ được lưu lại; bạn có thể rời trang rồi quay lại.")}</p>{aiJob.candidate?.available && <p className="mt-2 text-sm text-slate-600">Đã soạn {aiJob.candidate.lrBatchCount} nhóm Listening & Reading · {aiJob.candidate.speakingCount} câu Speaking · {aiJob.candidate.writingCount} câu Writing</p>}<div className="mt-3 flex flex-wrap items-center gap-3">{(aiJob.status === "FAILED" || aiJob.stage === "WAITING_QUOTA") && <button type="button" onClick={retryAiJob} disabled={isSubmitting} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? "Đang thử lại..." : "Thử lại"}</button>}{aiJob.status === "GENERATED" && <button type="button" onClick={openCandidateWorkspace} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">Duyệt đề</button>}{aiJob.exam?.id && ["APPROVED", "FAILED", "CANCELLED"].includes(aiJob.status) && <button type="button" onClick={() => router.push(`/admin/exams?exam=${aiJob.exam.id}`)} className="font-semibold text-blue-700 hover:underline">Mở bản nháp</button>}</div></section>}
          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button
              disabled={isSubmitting || (authoringMode === "MANUAL" && !title.trim())}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{" "}
              {authoringMode === "AI" ? "Tạo bản nháp bằng AI" : "Tạo bản nháp"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
