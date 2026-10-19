"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Loader2, FileStack } from "lucide-react";
import { useRouter } from "next/navigation";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";

const variants = [
  {
    value: "TOEIC_LR",
    label: "Listening & Reading",
    detail: "200 câu theo cấu trúc TOEIC L&R",
  },
  {
    value: "TOEIC_SW",
    label: "Speaking & Writing",
    detail: "11 Speaking + 8 Writing theo source nội bộ",
  },
  {
    value: "TOEIC_4_SKILLS",
    label: "4 kỹ năng",
    detail: "Listening & Reading + Speaking + Writing",
  },
];

const AI_JOB_STORAGE_KEY = "breadtrans:admin:toeic-ai-job";

export default function NewExamPage() {
  const router = useRouter();
  const [familyCode, setFamilyCode] = useState("TOEIC");
  const [variantCode, setVariantCode] = useState("TOEIC_LR");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [authoringMode, setAuthoringMode] = useState<"MANUAL" | "AI">("MANUAL");
  const [generationMode, setGenerationMode] = useState<"FULL_EXAM" | "PART">("FULL_EXAM");
  const [part, setPart] = useState("5");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [aiJob, setAiJob] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const generationIdempotencyKey = useRef<string | null>(null);

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
      toast.success("Đã đưa job AI lỗi vào hàng đợi thử lại");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Không thể thử lại job AI",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyAiCandidate = async () => {
    if (!aiJob?.id || !aiJob?.exam?.id) return;
    setIsSubmitting(true);
    try {
      const result: any = await axiosClient.post(
        `/admin/exams/ai/jobs/${aiJob.id}/apply`,
      );
      rememberAiJob(result);
      toast.success("Đã áp dụng candidate vào Draft. Hãy review, chỉnh sửa và lưu trước khi xuất bản.");
      router.push(`/admin/exams?exam=${aiJob.exam.id}`);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Không thể áp dụng candidate AI vào Draft",
      );
    } finally {
      setIsSubmitting(false);
    }
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
        toast.success("Đã tạo Draft và đưa job AI vào hàng đợi");
        return;
      }
      const result: any = await axiosClient.post("/admin/exams", {
        familyCode,
        variantCode,
        title: title.trim(),
        description: description.trim() || undefined,
        type: "PRACTICE_BY_PART",
        durationSeconds: 7200,
      });
      toast.success("Đã tạo bản nháp đề");
      router.push(`/admin/exams?exam=${result?.id || ""}`);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Không thể tạo bản nháp đề",
      );
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

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <button
        onClick={() => router.push("/admin/exams")}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft size={16} /> Quay lại kho đề
      </button>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="border-b border-slate-100 pb-6">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">
            NỘI DUNG HỌC · LUYỆN ĐỀ
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">
            {authoringMode === "AI" ? "AI tạo đề luyện" : "Tạo bản nháp đề"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Chọn kỳ thi và loại đề. Hệ thống sẽ dùng cấu trúc phù hợp; Admin
            không cần nhập mã kỹ thuật.
          </p>
        </div>
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          <button type="button" onClick={() => setAuthoringMode("MANUAL")} className={`rounded-lg px-3 py-2 transition ${authoringMode === "MANUAL" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Tạo thủ công</button>
          <button type="button" onClick={() => setAuthoringMode("AI")} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 transition ${authoringMode === "AI" ? "bg-slate-950 text-white shadow-sm" : "text-slate-500"}`}><FileStack size={15} /> AI tạo đề</button>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-6">
          <div>
            <p className="text-sm font-bold text-slate-900">1. Kỳ thi</p>
            <select
              aria-label="Kỳ thi"
              value={familyCode}
              onChange={(event) => setFamilyCode(event.target.value)}
              className="mt-3 w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="TOEIC">TOEIC · Đang hỗ trợ authoring</option>
              <option value="IELTS" disabled>
                IELTS · Coming Soon
              </option>
              <option value="VSTEP" disabled>
                VSTEP · Coming Soon
              </option>
            </select>
            <p className="mt-2 text-xs text-slate-500">
              IELTS và các kỳ thi khác sẽ hiển thị Coming soon cho tới khi có
              backend authoring tương ứng.
            </p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">2. Loại đề</p>
            <div className="mt-3 grid gap-3">
              {variants.map((variant) => {
                const selected = variantCode === variant.value;
                return (
                  <button
                    type="button"
                    key={variant.value}
                    onClick={() => {
                      setVariantCode(variant.value);
                      if (variant.value !== "TOEIC_LR" && generationMode === "PART") {
                        setGenerationMode("FULL_EXAM");
                      }
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${selected ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900 hover:border-slate-400"}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${selected ? "border-white bg-white text-slate-950" : "border-slate-300"}`}
                    >
                      {selected && <Check size={14} />}
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold">
                        {variant.label}
                      </span>
                      <span
                        className={`mt-1 block text-xs ${selected ? "text-slate-300" : "text-slate-500"}`}
                      >
                        {variant.detail}
                      </span>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                );
              })}
            </div>
          </div>
          {authoringMode === "AI" && (
            <section className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
              <div>
                <p className="font-semibold text-slate-900">Cấu hình tạo đề</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">AI chỉ tạo nội dung ứng viên. Cấu trúc, đáp án, media và Publish vẫn được backend/Admin kiểm soát.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-800">Chế độ tạo
                  <select value={generationMode} onChange={(event) => setGenerationMode(event.target.value as "FULL_EXAM" | "PART")} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-slate-500">
                    <option value="FULL_EXAM">Đề hoàn chỉnh (200 câu)</option>
                    <option value="PART" disabled={variantCode !== "TOEIC_LR"}>Sinh riêng một Part (L&R)</option>
                  </select>
                </label>
                {generationMode === "PART" && <label className="text-sm font-semibold text-slate-800">Part
                  <select value={part} onChange={(event) => setPart(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-slate-500">{[1,2,3,4,5,6,7].map((value) => <option key={value} value={value}>Part {value}</option>)}</select>
                </label>}
                <label className="text-sm font-semibold text-slate-800">Độ khó mục tiêu
                  <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-slate-500"><option value="easy">Cơ bản</option><option value="medium">Cân bằng</option><option value="hard">Nâng cao</option></select>
                </label>
                <label className="text-sm font-semibold text-slate-800">Chủ đề ưu tiên <span className="font-normal text-slate-400">(không bắt buộc)</span>
                  <input value={topic} onChange={(event) => setTopic(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-slate-500" placeholder="Ví dụ: workplace communication" />
                </label>
              </div>
              <p className="rounded-xl border border-amber-200 bg-white/80 p-3 text-xs leading-5 text-slate-600">Lưu ý: Đây là đề luyện tập tham khảo mô phỏng cấu trúc TOEIC, không phải đề thi chính thức do ETS phát hành.</p>
            </section>
          )}
          {authoringMode === "MANUAL" && <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-800">
              Tên đề *
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-slate-500"
                placeholder="Ví dụ: TOEIC Practice Set 01"
              />
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Mô tả
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-slate-500"
                placeholder="Mục tiêu hoặc phạm vi đề"
              />
            </label>
          </div>}
          {aiJob && <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><p className="font-semibold text-slate-900">Tiến độ AI: {aiJob.stage || aiJob.status}</p><p className="mt-1 text-slate-600">{aiJob.error || (aiJob.status === "GENERATED" ? "Candidate đã qua kiểm tra cấu trúc. Admin cần Apply vào Draft trước khi review, chỉnh sửa, validate và Publish thủ công." : "Job và candidate được lưu bền vững; bạn có thể quay lại trang này để tiếp tục.")}</p>{aiJob.candidate?.available && <p className="mt-2 text-xs text-slate-500">Candidate: {aiJob.candidate.lrBatchCount} batch L&R · {aiJob.candidate.speakingCount} Speaking · {aiJob.candidate.writingCount} Writing</p>}<div className="mt-3 flex flex-wrap items-center gap-3">{aiJob.status === "FAILED" && <button type="button" onClick={retryAiJob} disabled={isSubmitting} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? "Đang thử lại..." : "Thử lại job AI"}</button>}{aiJob.status === "GENERATED" && aiJob.exam?.id && <button type="button" onClick={applyAiCandidate} disabled={isSubmitting} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? "Đang Apply..." : "Apply candidate vào Draft"}</button>}{aiJob.exam?.id && ["APPROVED", "FAILED", "CANCELLED"].includes(aiJob.status) && <button type="button" onClick={() => router.push(`/admin/exams?exam=${aiJob.exam.id}`)} className="font-semibold text-blue-700 hover:underline">Mở Draft để review</button>}</div></section>}
          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button
              disabled={isSubmitting || (authoringMode === "MANUAL" && !title.trim())}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}{" "}
              {authoringMode === "AI" ? "Tạo bản nháp bằng AI" : "Tạo bản nháp"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
