"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  FileText,
  Headphones,
  UploadCloud,
  Loader2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Save,
  BookOpen,
  Layers,
  Trash2,
  FileUp,
  Type,
  Activity,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";
import Link from "next/link";
import toast from "react-hot-toast";

interface SmartGeneratedPayload {
  documentSummary?: string;
  quizQuestions: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    difficulty?: string;
  }>;
  flashcards: Array<{
    term: string;
    pos?: string;
    ipa?: string;
    meaning: string;
    example: string;
  }>;
  assignment: {
    title: string;
    description: string;
    instructions: string;
    estimatedTimeMinutes?: number;
  };
}

export default function AdminAiToolsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"smart" | "dictation" | "toeic" | "import">("smart");

  // ================= SMART GENERATOR STATE =================
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [quizCount, setQuizCount] = useState(5);
  const [flashcardCount, setFlashcardCount] = useState(8);
  const [includeAssignment, setIncludeAssignment] = useState(true);

  // Job & Processing State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [smartResult, setSmartResult] = useState<SmartGeneratedPayload | null>(null);
  const [reviewTab, setReviewTab] = useState<"quiz" | "flashcard" | "assignment">("quiz");

  // Review Edit State
  const [editedQuizTitle, setEditedQuizTitle] = useState("");
  const [editedQuestions, setEditedQuestions] = useState<any[]>([]);
  const [editedVocabTopicTitle, setEditedVocabTopicTitle] = useState("");
  const [editedFlashcards, setEditedFlashcards] = useState<any[]>([]);
  const [editedAssignmentTitle, setEditedAssignmentTitle] = useState("");
  const [editedAssignmentDesc, setEditedAssignmentDesc] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<number | "">("");

  // Publish Selection
  const [pubQuiz, setPubQuiz] = useState(true);
  const [pubFlashcards, setPubFlashcards] = useState(true);
  const [pubAssignment, setPubAssignment] = useState(true);

  // Publish Success Result
  const [publishResult, setPublishResult] = useState<{
    quizId?: number;
    vocabTopicId?: number;
    assignmentId?: number;
  } | null>(null);

  // ================= OLD TABS STATE =================
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [part, setPart] = useState(5);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [generatedToeicQuestions, setGeneratedToeicQuestions] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; quizId?: number } | null>(null);

  // 1. Quota Query
  const { data: quotaData, refetch: refetchQuota } = useQuery({
    queryKey: ["ai-quota-status"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/admin/ai-generator/quota-status");
      return res?.data || res;
    },
    refetchInterval: 15000,
  });

  // 2. Classes Query (For assignment target)
  const { data: classesData } = useQuery({
    queryKey: ["all-classes"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/class");
      return res?.data || res || [];
    },
  });
  const classesList: any[] = useMemo(
    () => (Array.isArray(classesData) ? classesData : []),
    [classesData]
  );

  // ================= SMART GENERATOR MUTATIONS =================
  // Upload & Start Job
  const startSmartJobMut = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (inputMode === "file") {
        if (!uploadedFile) throw new Error("Vui lòng chọn file PDF hoặc DOCX!");
        formData.append("file", uploadedFile);
      } else {
        if (!rawText.trim() || rawText.trim().length < 50) {
          throw new Error("Vui lòng nhập văn bản tối thiểu 50 ký tự!");
        }
        formData.append("text", rawText.trim());
      }
      formData.append("quizCount", String(quizCount));
      formData.append("flashcardCount", String(flashcardCount));

      const res: any = await axiosClient.post("/admin/ai-generator/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res?.data || res;
    },
    onSuccess: (data: any) => {
      const jId = data?.jobId;
      setActiveJobId(jId);
      setJobStatus({ status: "queued", progress: 10, message: "Đang xếp hàng xử lý..." });
      setSmartResult(null);
      setPublishResult(null);
      toast.success("Đã gửi tài liệu! Gemini AI đang phân tích...");
      refetchQuota();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Không thể khởi tạo tiến trình AI");
    },
  });

  // Polling Job Status
  useEffect(() => {
    if (!activeJobId) return;

    const interval = setInterval(async () => {
      try {
        const res: any = await axiosClient.get(`/admin/ai-generator/${activeJobId}/status`);
        const statusData = res?.data || res;
        setJobStatus(statusData);

        if (statusData?.status === "done") {
          clearInterval(interval);
          // Fetch result
          const resultRes: any = await axiosClient.get(`/admin/ai-generator/${activeJobId}/result`);
          const resultData: SmartGeneratedPayload = resultRes?.data || resultRes;
          setSmartResult(resultData);

          // Populate edit fields
          setEditedQuizTitle(`Đề Trắc Nghiệm: ${uploadedFile?.name.replace(/\.[^/.]+$/, "") || "Tài Liệu Bài Giảng"}`);
          setEditedQuestions(resultData.quizQuestions || []);
          setEditedVocabTopicTitle(`Từ Vựng: ${uploadedFile?.name.replace(/\.[^/.]+$/, "") || "Bài Học Mới"}`);
          setEditedFlashcards(resultData.flashcards || []);
          setEditedAssignmentTitle(resultData.assignment?.title || "Bài tập củng cố kiến thức");
          setEditedAssignmentDesc(
            `${resultData.assignment?.description || ""}\n\n${resultData.assignment?.instructions || ""}`
          );

          if (classesList.length > 0) {
            setSelectedClassId(classesList[0].id);
          }

          toast.success("AI đã hoàn thành sinh bộ trắc nghiệm, flashcard và bài tập!");
          refetchQuota();
        } else if (statusData?.status === "failed") {
          clearInterval(interval);
          toast.error(statusData?.error || "Tiến trình AI xử lý thất bại!");
        }
      } catch (err: any) {
        console.error("Polling error:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJobId, uploadedFile, classesList, refetchQuota]);

  // Publish Approved Content Mutation
  const publishContentMut = useMutation({
    mutationFn: async () => {
      if (!activeJobId) throw new Error("Không tìm thấy mã tiến trình!");

      const payload = {
        quizTitle: editedQuizTitle,
        quizQuestions: editedQuestions,
        vocabTopicTitle: editedVocabTopicTitle,
        flashcards: editedFlashcards,
        assignmentTitle: editedAssignmentTitle,
        assignmentDescription: editedAssignmentDesc,
        targetClassId: selectedClassId ? Number(selectedClassId) : undefined,
        publishQuiz: pubQuiz,
        publishFlashcards: pubFlashcards,
        publishAssignment: pubAssignment && Boolean(selectedClassId),
      };

      const res: any = await axiosClient.post(`/admin/ai-generator/${activeJobId}/publish`, payload);
      return res?.data || res;
    },
    onSuccess: (data: any) => {
      setPublishResult({
        quizId: data?.quizId,
        vocabTopicId: data?.vocabTopicId,
        assignmentId: data?.assignmentId,
      });
      toast.success(data?.message || "Đã phê duyệt và xuất bản vào Hệ thống thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-vocab"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Lỗi khi lưu dữ liệu vào hệ thống");
    },
  });

  // ================= OLD MUTATIONS =================
  const generateDictationMut = useMutation({
    mutationFn: async () => {
      if (!topic.trim()) throw new Error("Vui lòng nhập chủ đề cần sinh bài!");
      const res: any = await axiosClient.post("/ai/generate-dictation", { topic, count });
      return res?.data || res;
    },
    onSuccess: (data: any) => {
      const qId = data?.quizId;
      setMessage({ type: "success", text: data?.message || "Sinh bài Luyện Nghe thành công!", quizId: qId });
      toast.success("Sinh bài Luyện Nghe và âm thanh TTS thành công!");
      refetchQuota();
    },
    onError: (err: any) => {
      setMessage({ type: "error", text: err?.message || "Có lỗi xảy ra khi sinh đề." });
      toast.error(err?.message || "Không thể sinh bài luyện nghe");
    },
  });

  const generateToeicMut = useMutation({
    mutationFn: async () => {
      if (!topic.trim()) throw new Error("Vui lòng nhập chủ đề từ vựng / ngữ cảnh!");
      const res: any = await axiosClient.post("/ai/generate-toeic-quiz", { topic, part, count });
      return res?.data || res;
    },
    onSuccess: (data: any) => {
      const questions = data?.questions || [];
      setGeneratedToeicQuestions(questions);
      setMessage({ type: "success", text: `Đã sinh thành công ${questions.length} câu hỏi TOEIC Part ${part}!` });
      toast.success(`Đã sinh ${questions.length} câu hỏi TOEIC!`);
      refetchQuota();
    },
    onError: (err: any) => {
      setMessage({ type: "error", text: err?.message || "Có lỗi xảy ra khi sinh đề." });
      toast.error(err?.message || "Lỗi khi sinh câu hỏi TOEIC");
    },
  });

  const importEtsMut = useMutation({
    mutationFn: async () => {
      if (!pdfFile) throw new Error("Vui lòng chọn file PDF hoặc hình ảnh đề thi!");
      const formData = new FormData();
      formData.append("pdfFile", pdfFile);
      if (audioFile) formData.append("audioFile", audioFile);

      const res: any = await axiosClient.post("/ai/import-ets-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res?.data || res;
    },
    onSuccess: (data: any) => {
      const qId = data?.quizId;
      setMessage({ type: "success", text: data?.message || "Import đề thi ETS thành công!", quizId: qId });
      toast.success("AI đã bóc tách đề thi ETS!");
      setPdfFile(null);
      setAudioFile(null);
      refetchQuota();
    },
    onError: (err: any) => {
      setMessage({ type: "error", text: err?.message || "Có lỗi xảy ra khi import đề." });
      toast.error(err?.message || "Có lỗi xảy ra khi import đề.");
    },
  });

  const isSmartLoading = Boolean(
    startSmartJobMut.isPending || (activeJobId && jobStatus?.status === "processing")
  );

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-8">
      {/* ================= HEADER & QUOTA WIDGET ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-linear-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl border-4 border-indigo-500/20">
        <div className="flex items-center gap-5">
          <div className="bg-indigo-500 p-4 rounded-3xl text-white shadow-lg shadow-indigo-500/30 ring-4 ring-white/10">
            <Bot size={36} />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-500/30 text-indigo-200 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 border border-indigo-400/30">
              <Sparkles size={14} className="text-amber-300 animate-pulse" /> AI Educational Assistant
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">AI Smart Generator</h1>
            <p className="text-indigo-200 font-semibold text-sm mt-1">
              Tự động hóa soạn câu hỏi trắc nghiệm, flashcard và bài tập từ tài liệu PDF/Word
            </p>
          </div>
        </div>

        {/* REDIS QUOTA TRACKER */}
        <div className="bg-white/10 backdrop-blur-md p-5 rounded-3xl border-2 border-white/15 min-w-[280px] space-y-3">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="flex items-center gap-1.5 text-indigo-200">
              <Activity size={14} className="text-emerald-400" /> Quota Gemini (RPD)
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                quotaData?.isNearLimit
                  ? "bg-rose-500/80 text-white"
                  : "bg-emerald-500/30 text-emerald-300 border border-emerald-400/30"
              }`}
            >
              {quotaData?.isNearLimit ? "Cảnh báo 80%" : "🟢 Ổn định"}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{quotaData?.used || 0}</span>
              <span className="text-xs text-indigo-300 font-bold">/ {quotaData?.limit || 500} requests</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (quotaData?.percentage || 0) > 80
                    ? "bg-rose-500"
                    : (quotaData?.percentage || 0) > 50
                    ? "bg-amber-400"
                    : "bg-linear-to-r from-emerald-400 to-indigo-400"
                }`}
                style={{ width: `${Math.min(100, quotaData?.percentage || 0)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300">
            <span>Model: {quotaData?.modelName || "gemini-3.1-flash-lite"}</span>
            <span>Còn {quotaData?.remaining ?? 500} lượt</span>
          </div>
        </div>
      </div>

      {/* ================= MAIN TABS ================= */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* SIDEBAR TABS */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-3">
          <button
            onClick={() => setActiveTab("smart")}
            className={`p-5 rounded-3xl flex items-center gap-3.5 font-black transition-all text-left cursor-pointer text-sm ${
              activeTab === "smart"
                ? "bg-indigo-600 text-white shadow-[0_8px_0_0_#4338ca] scale-[1.02]"
                : "bg-white text-slate-600 hover:bg-slate-50 border-2 border-slate-200"
            }`}
          >
            <div className={`p-2.5 rounded-2xl ${activeTab === "smart" ? "bg-white/20" : "bg-indigo-50 text-indigo-600"}`}>
              <Sparkles size={20} />
            </div>
            <div>
              <div className="text-base font-black">AI Smart Generator</div>
              <div className={`text-xs font-semibold mt-0.5 ${activeTab === "smart" ? "text-indigo-200" : "text-slate-400"}`}>
                Từ PDF/DOCX &rarr; Quiz + Flashcard
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("dictation")}
            className={`p-5 rounded-3xl flex items-center gap-3.5 font-black transition-all text-left cursor-pointer text-sm ${
              activeTab === "dictation"
                ? "bg-indigo-600 text-white shadow-[0_8px_0_0_#4338ca] scale-[1.02]"
                : "bg-white text-slate-600 hover:bg-slate-50 border-2 border-slate-200"
            }`}
          >
            <div className={`p-2.5 rounded-2xl ${activeTab === "dictation" ? "bg-white/20" : "bg-indigo-50 text-indigo-600"}`}>
              <Headphones size={20} />
            </div>
            <div>
              <div className="text-base font-black">Sinh Luyện Nghe TTS</div>
              <div className={`text-xs font-semibold mt-0.5 ${activeTab === "dictation" ? "text-indigo-200" : "text-slate-400"}`}>
                Chép chính tả & Azure Audio
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("toeic")}
            className={`p-5 rounded-3xl flex items-center gap-3.5 font-black transition-all text-left cursor-pointer text-sm ${
              activeTab === "toeic"
                ? "bg-indigo-600 text-white shadow-[0_8px_0_0_#4338ca] scale-[1.02]"
                : "bg-white text-slate-600 hover:bg-slate-50 border-2 border-slate-200"
            }`}
          >
            <div className={`p-2.5 rounded-2xl ${activeTab === "toeic" ? "bg-white/20" : "bg-indigo-50 text-indigo-600"}`}>
              <FileText size={20} />
            </div>
            <div>
              <div className="text-base font-black">Sinh Câu Hỏi TOEIC</div>
              <div className={`text-xs font-semibold mt-0.5 ${activeTab === "toeic" ? "text-indigo-200" : "text-slate-400"}`}>
                Part 5 & Part 6 ngữ pháp
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("import")}
            className={`p-5 rounded-3xl flex items-center gap-3.5 font-black transition-all text-left cursor-pointer text-sm ${
              activeTab === "import"
                ? "bg-indigo-600 text-white shadow-[0_8px_0_0_#4338ca] scale-[1.02]"
                : "bg-white text-slate-600 hover:bg-slate-50 border-2 border-slate-200"
            }`}
          >
            <div className={`p-2.5 rounded-2xl ${activeTab === "import" ? "bg-white/20" : "bg-indigo-50 text-indigo-600"}`}>
              <UploadCloud size={20} />
            </div>
            <div>
              <div className="text-base font-black">Import Đề ETS</div>
              <div className={`text-xs font-semibold mt-0.5 ${activeTab === "import" ? "text-indigo-200" : "text-slate-400"}`}>
                Bóc tách đề thi PDF nguyên bản
              </div>
            </div>
          </button>
        </div>

        {/* WORKSPACE CONTENT */}
        <div className="flex-1 space-y-8">
          {/* ================= TAB 1: AI SMART GENERATOR ================= */}
          {activeTab === "smart" && (
            <div className="space-y-8">
              {/* UPLOAD & CONFIG CARD */}
              <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] space-y-6">
                <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">Tải Lên Tài Liệu Giáo Trình</h2>
                    <p className="text-slate-400 font-bold text-xs mt-1">
                      Hỗ trợ file PDF (slide bài giảng, bài đọc), file Word .DOCX hoặc dán văn bản trực tiếp
                    </p>
                  </div>

                  {/* Mode switcher */}
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl font-black text-xs">
                    <button
                      onClick={() => setInputMode("file")}
                      className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                        inputMode === "file" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                      }`}
                    >
                      <FileUp size={16} /> File PDF / Word
                    </button>
                    <button
                      onClick={() => setInputMode("text")}
                      className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                        inputMode === "text" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                      }`}
                    >
                      <Type size={16} /> Nhập Văn Bản
                    </button>
                  </div>
                </div>

                {/* FILE DROPZONE OR TEXTAREA */}
                {inputMode === "file" ? (
                  <div className="border-3 border-dashed border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 transition-colors p-8 rounded-3xl text-center relative group">
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,text/plain"
                      onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <UploadCloud size={32} />
                      </div>
                      {uploadedFile ? (
                        <div className="space-y-1">
                          <p className="text-base font-black text-slate-800">{uploadedFile.name}</p>
                          <p className="text-xs font-bold text-slate-400">
                            {(uploadedFile.size / 1024).toFixed(1)} KB — Bấm để chọn file khác
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-base font-black text-slate-700">Kéo thả file vào đây hoặc bấm để duyệt</p>
                          <p className="text-xs font-bold text-slate-400">Định dạng hỗ trợ: PDF, DOCX (Tối đa 25MB)</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="Dán nội dung bài đọc tiếng Anh, đoạn văn bản bài học hoặc tóm tắt chủ đề vào đây (Tối thiểu 50 ký tự)..."
                      rows={6}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white text-slate-800 font-bold text-sm"
                    />
                    <div className="text-right text-xs font-bold text-slate-400">
                      Độ dài: {rawText.length} ký tự
                    </div>
                  </div>
                )}

                {/* GENERATION PARAMETERS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 font-bold text-sm">
                  <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 space-y-2">
                    <label className="block text-slate-600 text-xs uppercase font-black">
                      Số Câu Trắc Nghiệm
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={1}
                        max={15}
                        value={quizCount}
                        onChange={(e) => setQuizCount(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                      <span className="text-indigo-600 font-black text-base w-8 text-right">{quizCount}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 space-y-2">
                    <label className="block text-slate-600 text-xs uppercase font-black">
                      Số Từ Flashcard
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={flashcardCount}
                        onChange={(e) => setFlashcardCount(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                      <span className="text-indigo-600 font-black text-base w-8 text-right">{flashcardCount}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-slate-800 font-black text-xs uppercase">Sinh Bài Tập Về Nhà</div>
                      <div className="text-slate-400 font-bold text-[11px]">Kèm theo bài luận ngắn</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeAssignment}
                      onChange={(e) => setIncludeAssignment(e.target.checked)}
                      className="w-6 h-6 rounded-lg accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* ACTION BUTTON & STATUS */}
                <div className="flex items-center justify-between pt-4 border-t-2 border-slate-100">
                  <div className="text-xs font-bold text-slate-400">
                    Sử dụng model <span className="font-black text-slate-700">{quotaData?.modelName || "gemini-3.1-flash-lite"}</span> (Retry 3x backoff)
                  </div>

                  <button
                    onClick={() => startSmartJobMut.mutate()}
                    disabled={isSmartLoading}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black flex items-center gap-2.5 shadow-[0_6px_0_0_#4338ca] active:translate-y-1 active:shadow-none transition-all cursor-pointer text-base disabled:opacity-50"
                  >
                    {isSmartLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} className="text-amber-300" />}
                    {isSmartLoading ? "Đang xử lý tài liệu..." : "✨ Bắt Đầu Sinh Nội Dung"}
                  </button>
                </div>

                {/* PROCESSING STEPPER / PROGRESS */}
                {activeJobId && jobStatus?.status === "processing" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-indigo-50 border-2 border-indigo-200 p-6 rounded-3xl space-y-4 font-bold"
                  >
                    <div className="flex items-center justify-between text-indigo-900 text-sm font-black">
                      <span className="flex items-center gap-2">
                        <Loader2 className="animate-spin text-indigo-600" size={18} /> {jobStatus.message || "Đang phân tích..."}
                      </span>
                      <span>{jobStatus.progress || 35}%</span>
                    </div>

                    <div className="w-full h-3 bg-indigo-200/60 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-indigo-600 rounded-full"
                        initial={{ width: "10%" }}
                        animate={{ width: `${jobStatus.progress || 35}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-black text-indigo-700">
                      <div className="bg-white/80 py-2 rounded-xl border border-indigo-200">1. Trích xuất Text ✓</div>
                      <div className="bg-indigo-600 text-white py-2 rounded-xl shadow-xs">2. Gemini AI Phân tích</div>
                      <div className="bg-white/50 py-2 rounded-xl text-indigo-400">3. Xuất Bản Dữ Liệu</div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* ================= REVIEW & APPROVAL WORKSPACE ================= */}
              {smartResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-4">
                    <div>
                      <span className="text-xs font-black uppercase text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                        ✓ AI Xử Lý Xong — Chờ Admin Phê Duyệt
                      </span>
                      <h3 className="text-2xl font-black text-slate-800 mt-2">
                        Không Gian Duyệt & Chỉnh Sửa Nội Dung
                      </h3>
                    </div>

                    {/* Sub tabs */}
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl font-black text-xs">
                      <button
                        onClick={() => setReviewTab("quiz")}
                        className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                          reviewTab === "quiz" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                        }`}
                      >
                        <FileText size={16} /> ❓ Trắc Nghiệm ({editedQuestions.length})
                      </button>
                      <button
                        onClick={() => setReviewTab("flashcard")}
                        className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                          reviewTab === "flashcard" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                        }`}
                      >
                        <Layers size={16} /> 🗂️ Flashcard ({editedFlashcards.length})
                      </button>
                      <button
                        onClick={() => setReviewTab("assignment")}
                        className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                          reviewTab === "assignment" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                        }`}
                      >
                        <BookOpen size={16} /> 📝 Bài Tập
                      </button>
                    </div>
                  </div>

                  {/* SUMMARY BADGE */}
                  {smartResult.documentSummary && (
                    <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-2xl text-xs font-bold text-indigo-900">
                      <span className="font-black text-indigo-700 uppercase mr-1">💡 Tóm tắt tài liệu:</span>
                      {smartResult.documentSummary}
                    </div>
                  )}

                  {/* SUB-TAB 1: QUIZ QUESTIONS REVIEW */}
                  {reviewTab === "quiz" && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-slate-600 font-bold text-xs uppercase mb-1.5">
                          Tiêu Đề Đề Thi Trắc Nghiệm
                        </label>
                        <input
                          type="text"
                          value={editedQuizTitle}
                          onChange={(e) => setEditedQuizTitle(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800"
                        />
                      </div>

                      <div className="space-y-4">
                        {editedQuestions.map((q, qIdx) => (
                          <div
                            key={qIdx}
                            className="bg-slate-50 border-2 border-slate-200 p-6 rounded-3xl space-y-4 relative"
                          >
                            <div className="flex items-center justify-between">
                              <span className="bg-indigo-600 text-white px-3 py-1 rounded-xl font-black text-xs">
                                Câu {qIdx + 1}
                              </span>
                              <button
                                onClick={() =>
                                  setEditedQuestions(editedQuestions.filter((_, idx) => idx !== qIdx))
                                }
                                className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                              >
                                <Trash2 size={16} /> Xóa câu này
                              </button>
                            </div>

                            {/* Question text edit */}
                            <div>
                              <label className="block text-slate-500 font-bold text-xs mb-1">Nội dung câu hỏi</label>
                              <input
                                type="text"
                                value={q.question}
                                onChange={(e) => {
                                  const updated = [...editedQuestions];
                                  updated[qIdx].question = e.target.value;
                                  setEditedQuestions(updated);
                                }}
                                className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500"
                              />
                            </div>

                            {/* Options edit */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {q.options.map((opt: string, oIdx: number) => {
                                const isCorrect = q.correctIndex === oIdx;
                                return (
                                  <div
                                    key={oIdx}
                                    className={`p-3 rounded-2xl border-2 flex items-center gap-2 ${
                                      isCorrect ? "bg-emerald-50 border-emerald-300" : "bg-white border-slate-200"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`correct_${qIdx}`}
                                      checked={isCorrect}
                                      onChange={() => {
                                        const updated = [...editedQuestions];
                                        updated[qIdx].correctIndex = oIdx;
                                        setEditedQuestions(updated);
                                      }}
                                      className="w-4 h-4 accent-emerald-600 cursor-pointer"
                                    />
                                    <span className="font-black text-xs text-slate-500 w-5">
                                      {String.fromCharCode(65 + oIdx)}.
                                    </span>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const updated = [...editedQuestions];
                                        updated[qIdx].options[oIdx] = e.target.value;
                                        setEditedQuestions(updated);
                                      }}
                                      className="w-full bg-transparent outline-none font-bold text-xs text-slate-800"
                                    />
                                    {isCorrect && (
                                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">
                                        Đáp án đúng
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Explanation edit */}
                            <div>
                              <label className="block text-slate-500 font-bold text-xs mb-1">Giải thích đáp án</label>
                              <input
                                type="text"
                                value={q.explanation}
                                onChange={(e) => {
                                  const updated = [...editedQuestions];
                                  updated[qIdx].explanation = e.target.value;
                                  setEditedQuestions(updated);
                                }}
                                className="w-full px-4 py-2 bg-amber-50/50 border border-amber-200 rounded-xl font-medium text-xs text-amber-900 outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: FLASHCARDS REVIEW */}
                  {reviewTab === "flashcard" && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-slate-600 font-bold text-xs uppercase mb-1.5">
                          Tiêu Đề Bộ Từ Vựng Flashcard
                        </label>
                        <input
                          type="text"
                          value={editedVocabTopicTitle}
                          onChange={(e) => setEditedVocabTopicTitle(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {editedFlashcards.map((fc, fIdx) => (
                          <div
                            key={fIdx}
                            className="bg-slate-50 border-2 border-slate-200 p-5 rounded-3xl space-y-3 relative font-bold text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-lg font-black text-[11px]">
                                #{fIdx + 1}
                              </span>
                              <button
                                onClick={() =>
                                  setEditedFlashcards(editedFlashcards.filter((_, idx) => idx !== fIdx))
                                }
                                className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-2">
                                <label className="block text-slate-400 text-[10px] mb-0.5">Từ vựng (Term)</label>
                                <input
                                  type="text"
                                  value={fc.term}
                                  onChange={(e) => {
                                    const updated = [...editedFlashcards];
                                    updated[fIdx].term = e.target.value;
                                    setEditedFlashcards(updated);
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-black text-slate-800"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-400 text-[10px] mb-0.5">Loại từ (POS)</label>
                                <input
                                  type="text"
                                  value={fc.pos || "noun"}
                                  onChange={(e) => {
                                    const updated = [...editedFlashcards];
                                    updated[fIdx].pos = e.target.value;
                                    setEditedFlashcards(updated);
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-slate-400 text-[10px] mb-0.5">Phiên âm IPA</label>
                              <input
                                type="text"
                                value={fc.ipa || ""}
                                onChange={(e) => {
                                  const updated = [...editedFlashcards];
                                  updated[fIdx].ipa = e.target.value;
                                  setEditedFlashcards(updated);
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-indigo-600 font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-400 text-[10px] mb-0.5">Nghĩa tiếng Việt</label>
                              <input
                                type="text"
                                value={fc.meaning}
                                onChange={(e) => {
                                  const updated = [...editedFlashcards];
                                  updated[fIdx].meaning = e.target.value;
                                  setEditedFlashcards(updated);
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-400 text-[10px] mb-0.5">Ví dụ minh họa</label>
                              <input
                                type="text"
                                value={fc.example}
                                onChange={(e) => {
                                  const updated = [...editedFlashcards];
                                  updated[fIdx].example = e.target.value;
                                  setEditedFlashcards(updated);
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 italic"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 3: ASSIGNMENT REVIEW */}
                  {reviewTab === "assignment" && (
                    <div className="space-y-6 font-bold text-sm">
                      <div className="bg-indigo-50 border-2 border-indigo-200 p-6 rounded-3xl space-y-4">
                        <div>
                          <label className="block text-indigo-900 font-black text-xs uppercase mb-1.5">
                            Giao Vào Lớp Học Nào?
                          </label>
                          <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl outline-none focus:border-indigo-500 text-slate-800 font-bold"
                          >
                            <option value="">-- Chọn lớp học đích --</option>
                            {classesList.map((c: any) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.code || `Lớp #${c.id}`})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-indigo-900 font-black text-xs uppercase mb-1.5">
                            Tiêu Đề Bài Tập Về Nhà
                          </label>
                          <input
                            type="text"
                            value={editedAssignmentTitle}
                            onChange={(e) => setEditedAssignmentTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-indigo-900 font-black text-xs uppercase mb-1.5">
                            Nội Dung Hướng Dẫn Chi Tiết
                          </label>
                          <textarea
                            value={editedAssignmentDesc}
                            onChange={(e) => setEditedAssignmentDesc(e.target.value)}
                            rows={5}
                            className="w-full p-4 bg-white border-2 border-indigo-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ================= ACTION & PUBLISH BAR ================= */}
                  <div className="pt-6 border-t-2 border-slate-100 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      {/* Checkboxes */}
                      <div className="flex items-center gap-6 font-bold text-xs text-slate-700">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pubQuiz}
                            onChange={(e) => setPubQuiz(e.target.checked)}
                            className="w-5 h-5 rounded accent-indigo-600"
                          />
                          Lưu Đề Thi ({editedQuestions.length} câu)
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pubFlashcards}
                            onChange={(e) => setPubFlashcards(e.target.checked)}
                            className="w-5 h-5 rounded accent-indigo-600"
                          />
                          Lưu Flashcard ({editedFlashcards.length} từ)
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pubAssignment}
                            onChange={(e) => setPubAssignment(e.target.checked)}
                            className="w-5 h-5 rounded accent-indigo-600"
                          />
                          Giao Bài Tập Cho Lớp
                        </label>
                      </div>

                      {/* Submit button */}
                      <button
                        onClick={() => publishContentMut.mutate()}
                        disabled={publishContentMut.isPending}
                        className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black flex items-center gap-2 shadow-[0_6px_0_0_#047857] active:translate-y-1 active:shadow-none transition-all cursor-pointer text-base disabled:opacity-50"
                      >
                        {publishContentMut.isPending ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <Save size={20} />
                        )}
                        {publishContentMut.isPending ? "Đang lưu..." : "💾 Phê Duyệt & Xuất Bản Vào Hệ Thống"}
                      </button>
                    </div>

                    {/* SUCCESS MODAL / BANNER */}
                    {publishResult && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 bg-emerald-50 border-3 border-emerald-300 rounded-3xl text-emerald-900 font-bold space-y-3"
                      >
                        <div className="flex items-center gap-2 text-base font-black text-emerald-800">
                          <CheckCircle2 size={24} className="text-emerald-600" />
                          Xuất Bản Thành Công Vào Cơ Sở Dữ Liệu!
                        </div>
                        <p className="text-xs">
                          Tất cả nội dung bạn phê duyệt đã được lưu vào hệ thống an toàn. Học sinh và giáo viên đã có thể thấy ngay lập tức:
                        </p>

                        <div className="flex flex-wrap gap-3 pt-2">
                          {publishResult.quizId && (
                            <Link
                              href="/admin/quizzes"
                              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-emerald-700 shadow-sm"
                            >
                              Xem Đề Thi Mới (#{publishResult.quizId}) <ArrowRight size={14} />
                            </Link>
                          )}
                          {publishResult.vocabTopicId && (
                            <Link
                              href="/admin/vocab"
                              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-indigo-700 shadow-sm"
                            >
                              Xem Bộ Flashcard Mới (#{publishResult.vocabTopicId}) <ArrowRight size={14} />
                            </Link>
                          )}
                          {publishResult.assignmentId && (
                            <Link
                              href="/teacher/assignments"
                              className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-amber-700 shadow-sm"
                            >
                              Xem Bài Tập Đã Giao (#{publishResult.assignmentId}) <ArrowRight size={14} />
                            </Link>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* ================= TAB 2: DICTATION ================= */}
          {activeTab === "dictation" && (
            <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] space-y-6">
              <h2 className="text-2xl font-black text-slate-800 mb-1">Sinh bài Luyện Nghe (Nghe Chép Chính Tả)</h2>
              <p className="text-slate-400 font-bold text-xs mb-6">
                AI sẽ sinh đoạn hội thoại tiếng Anh theo chủ đề, tự động tạo file Audio giọng bản xứ (Azure TTS) và tạo thành các câu hỏi điền từ trong cơ sở dữ liệu.
              </p>

              <div className="space-y-4 font-bold text-sm">
                <div>
                  <label className="block text-slate-600 mb-1.5">Chủ đề bài nghe (Topic) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="VD: Job Interview, Booking a Hotel, Customer Support..."
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5">Số lượng câu thoại</label>
                  <input
                    type="number"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    min={1}
                    max={15}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-slate-800 font-bold"
                  />
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-2xl flex items-center justify-between text-sm font-bold ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border-2 border-emerald-200" : "bg-rose-50 text-rose-800 border-2 border-rose-200"}`}>
                  <span>{message.text}</span>
                  {message.quizId && (
                    <Link href="/admin/quizzes" className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black">
                      Xem Đề <ArrowRight size={12} className="inline ml-1" />
                    </Link>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t-2 border-slate-100">
                <button
                  onClick={() => generateDictationMut.mutate()}
                  disabled={generateDictationMut.isPending}
                  className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black flex items-center gap-2 shadow-[0_6px_0_0_#4338ca] active:translate-y-1 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                >
                  {generateDictationMut.isPending ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  {generateDictationMut.isPending ? "Đang sinh bài nghe..." : "Thực Thi AI"}
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 3: TOEIC ================= */}
          {activeTab === "toeic" && (
            <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] space-y-6">
              <h2 className="text-2xl font-black text-slate-800 mb-1">Sinh Câu Hỏi TOEIC Reading</h2>
              <p className="text-slate-400 font-bold text-xs mb-6">
                AI sẽ sinh bộ câu hỏi trắc nghiệm kèm 4 đáp án A, B, C, D và lời giải thích ngữ pháp chi tiết theo chủ đề bạn chỉ định.
              </p>

              <div className="space-y-4 font-bold text-sm">
                <div>
                  <label className="block text-slate-600 mb-1.5">Chủ đề từ vựng / ngữ cảnh (Topic) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="VD: Marketing Campaign, Office Equipment, Business Contract..."
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-slate-800 font-bold"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 mb-1.5">Part</label>
                    <select
                      value={part}
                      onChange={(e) => setPart(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-slate-800 font-bold"
                    >
                      <option value={5}>Part 5 (Incomplete Sentences)</option>
                      <option value={6}>Part 6 (Text Completion)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1.5">Số lượng câu</label>
                    <input
                      type="number"
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      min={1}
                      max={20}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-slate-800 font-bold"
                    />
                  </div>
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-2xl flex items-center justify-between text-sm font-bold ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border-2 border-emerald-200" : "bg-rose-50 text-rose-800 border-2 border-rose-200"}`}>
                  <span>{message.text}</span>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t-2 border-slate-100">
                <button
                  onClick={() => generateToeicMut.mutate()}
                  disabled={generateToeicMut.isPending}
                  className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black flex items-center gap-2 shadow-[0_6px_0_0_#4338ca] active:translate-y-1 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                >
                  {generateToeicMut.isPending ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  {generateToeicMut.isPending ? "Đang sinh câu hỏi..." : "Thực Thi AI"}
                </button>
              </div>

              {/* TOEIC PREVIEW */}
              {generatedToeicQuestions.length > 0 && (
                <div className="pt-6 border-t-2 border-slate-200 space-y-4">
                  <h3 className="text-xl font-black text-slate-800">Danh Sách {generatedToeicQuestions.length} Câu Hỏi Vừa Sinh</h3>
                  <div className="space-y-3">
                    {generatedToeicQuestions.map((q, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 font-bold text-xs space-y-2">
                        <div className="text-sm font-black text-slate-800">{idx + 1}. {q.text || q.question}</div>
                        <div className="grid grid-cols-2 gap-2 text-slate-600">
                          {q.options?.map((opt: string, oIdx: number) => (
                            <div key={oIdx} className="bg-white p-2 rounded-lg border border-slate-200">
                              {String.fromCharCode(65 + oIdx)}. {opt}
                            </div>
                          ))}
                        </div>
                        {q.explanation && <div className="text-amber-800 bg-amber-50 p-2 rounded-lg">💡 {q.explanation}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 4: IMPORT ETS ================= */}
          {activeTab === "import" && (
            <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] space-y-6">
              <h2 className="text-2xl font-black text-slate-800 mb-1">Trích xuất Đề thi ETS (PDF + Audio)</h2>
              <p className="text-slate-400 font-bold text-xs mb-6">
                Tải lên file PDF đề thi ETS và file Audio đính kèm. AI Gemini sẽ tự động bóc tách câu hỏi và lưu vào hệ thống.
              </p>

              <div className="space-y-4 font-bold text-sm">
                <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-6 rounded-2xl text-center">
                  <UploadCloud size={40} className="text-indigo-400 mx-auto mb-2" />
                  <label className="block text-sm font-black text-slate-700 mb-2">File PDF Đề thi <span className="text-rose-500">*</span></label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 mx-auto cursor-pointer"
                  />
                </div>

                <div className="border-2 border-dashed border-slate-200 bg-slate-50 p-6 rounded-2xl text-center">
                  <Headphones size={40} className="text-slate-400 mx-auto mb-2" />
                  <label className="block text-sm font-black text-slate-700 mb-2">File Audio Nghe (Tùy chọn)</label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 mx-auto cursor-pointer"
                  />
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-2xl flex items-center justify-between text-sm font-bold ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border-2 border-emerald-200" : "bg-rose-50 text-rose-800 border-2 border-rose-200"}`}>
                  <span>{message.text}</span>
                  {message.quizId && (
                    <Link href="/admin/quizzes" className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black">
                      Xem Trong Quản Lý Đề <ArrowRight size={12} className="inline ml-1" />
                    </Link>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t-2 border-slate-100">
                <button
                  onClick={() => importEtsMut.mutate()}
                  disabled={importEtsMut.isPending}
                  className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black flex items-center gap-2 shadow-[0_6px_0_0_#4338ca] active:translate-y-1 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                >
                  {importEtsMut.isPending ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  {importEtsMut.isPending ? "Đang import đề..." : "Import Đề ETS"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
