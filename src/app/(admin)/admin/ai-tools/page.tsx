"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Check,
  HelpCircle,
  Eye,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AdminAiToolsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"dictation" | "toeic" | "import">("dictation");

  // Form states
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [part, setPart] = useState(5);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // Generated TOEIC questions state
  const [generatedToeicQuestions, setGeneratedToeicQuestions] = useState<any[]>([]);
  const [createdQuizId, setCreatedQuizId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; quizId?: number } | null>(null);

  // 1. Generate Dictation Mutation
  const generateDictationMut = useMutation({
    mutationFn: async () => {
      if (!topic.trim()) throw new Error("Vui lòng nhập chủ đề cần sinh bài!");
      const res: any = await axiosClient.post("/ai/generate-dictation", { topic, count });
      return res?.data || res;
    },
    onSuccess: (data: any) => {
      const qId = data?.quizId;
      setCreatedQuizId(qId || null);
      setMessage({
        type: "success",
        text: data?.message || "Sinh bài Luyện Nghe thành công!",
        quizId: qId,
      });
      toast.success("Sinh bài Luyện Nghe và âm thanh TTS thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
    },
    onError: (err: any) => {
      setMessage({ type: "error", text: err?.message || err?.response?.data?.message || "Có lỗi xảy ra khi sinh đề." });
      toast.error(err?.message || "Không thể sinh bài luyện nghe");
    },
  });

  // 2. Generate TOEIC Questions Mutation
  const generateToeicMut = useMutation({
    mutationFn: async () => {
      if (!topic.trim()) throw new Error("Vui lòng nhập chủ đề từ vựng / ngữ cảnh!");
      const res: any = await axiosClient.post("/ai/generate-toeic-quiz", { topic, part, count });
      return res?.data || res;
    },
    onSuccess: (data: any) => {
      const questions = data?.questions || [];
      setGeneratedToeicQuestions(questions);
      setMessage({
        type: "success",
        text: `Đã sinh thành công ${questions.length} câu hỏi TOEIC Part ${part}! Bạn có thể xem trước và bấm lưu bên dưới.`,
      });
      toast.success(`Đã sinh ${questions.length} câu hỏi TOEIC!`);
    },
    onError: (err: any) => {
      setMessage({ type: "error", text: err?.message || err?.response?.data?.message || "Có lỗi xảy ra khi sinh đề." });
      toast.error(err?.message || "Lỗi khi sinh câu hỏi TOEIC");
    },
  });

  // 2b. Save Generated TOEIC Questions to DB as a new Quiz
  const saveToeicQuizMut = useMutation({
    mutationFn: async () => {
      if (generatedToeicQuestions.length === 0) return;
      // 1. Tạo Quiz
      const quizRes: any = await axiosClient.post("/quizzes", {
        title: `Đề TOEIC Part ${part}: ${topic || "Luyện tập"}`,
        description: `Tạo tự động bởi AI (Gồm ${generatedToeicQuestions.length} câu Part ${part})`,
        type: "TOEIC",
        timeLimit: Math.max(10, generatedToeicQuestions.length * 2),
      });

      const newQuizId = quizRes?.id || quizRes?.data?.id;
      if (!newQuizId) throw new Error("Không thể tạo bản ghi đề thi!");

      // 2. Thêm từng câu hỏi
      for (const q of generatedToeicQuestions) {
        await axiosClient.post(`/quizzes/${newQuizId}/questions`, {
          type: "MULTIPLE_CHOICE",
          content: {
            text: q.text || q.question,
            options: q.options || [],
            correct: q.correctAnswer || q.correct || (q.options ? q.options[0] : ""),
            explanation: q.explanation || "",
          },
        });
      }

      return newQuizId;
    },
    onSuccess: (newQuizId) => {
      setCreatedQuizId(newQuizId);
      toast.success("Đã lưu đề thi TOEIC vào Hệ thống thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Có lỗi xảy ra khi lưu đề thi vào hệ thống");
    },
  });

  // 3. Import ETS PDF Mutation
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
      setCreatedQuizId(qId || null);
      setMessage({
        type: "success",
        text: data?.message || "Import đề thi ETS thành công!",
        quizId: qId,
      });
      toast.success("AI đã bóc tách đề thi ETS và lưu vào hệ thống!");
      setPdfFile(null);
      setAudioFile(null);
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
    },
    onError: (err: any) => {
      setMessage({ type: "error", text: err?.message || err?.response?.data?.message || "Có lỗi xảy ra khi import đề." });
      toast.error(err?.message || "Có lỗi xảy ra khi import đề.");
    },
  });

  const handleSubmit = () => {
    setMessage(null);
    setCreatedQuizId(null);
    if (activeTab === "dictation") generateDictationMut.mutate();
    if (activeTab === "toeic") generateToeicMut.mutate();
    if (activeTab === "import") importEtsMut.mutate();
  };

  const isLoading =
    generateDictationMut.isPending || generateToeicMut.isPending || importEtsMut.isPending || saveToeicQuizMut.isPending;

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-8">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <div className="bg-indigo-500 p-4 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
          <Bot size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Công cụ AI Sinh Đề & Trích Xuất</h1>
          <p className="text-slate-400 font-bold text-sm mt-1">
            Tự động sinh bài Luyện Nghe, câu hỏi TOEIC và bóc tách đề thi ETS (PDF/Audio)
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* SIDEBAR TABS */}
        <div className="w-full md:w-72 shrink-0 flex flex-col gap-2">
          <button
            onClick={() => {
              setActiveTab("dictation");
              setMessage(null);
              setGeneratedToeicQuestions([]);
            }}
            className={`p-4 rounded-2xl flex items-center gap-3 font-black transition-all text-left cursor-pointer text-sm ${
              activeTab === "dictation"
                ? "bg-white text-indigo-600 shadow-[0_6px_0_0_#e0e7ff] border-2 border-indigo-100"
                : "text-slate-500 hover:bg-white/60 border-2 border-transparent"
            }`}
          >
            <Headphones size={20} className="text-indigo-500" /> Sinh bài Luyện Nghe (TTS)
          </button>

          <button
            onClick={() => {
              setActiveTab("toeic");
              setMessage(null);
            }}
            className={`p-4 rounded-2xl flex items-center gap-3 font-black transition-all text-left cursor-pointer text-sm ${
              activeTab === "toeic"
                ? "bg-white text-indigo-600 shadow-[0_6px_0_0_#e0e7ff] border-2 border-indigo-100"
                : "text-slate-500 hover:bg-white/60 border-2 border-transparent"
            }`}
          >
            <FileText size={20} className="text-indigo-500" /> Sinh câu hỏi TOEIC (Part 5/6)
          </button>

          <button
            onClick={() => {
              setActiveTab("import");
              setMessage(null);
              setGeneratedToeicQuestions([]);
            }}
            className={`p-4 rounded-2xl flex items-center gap-3 font-black transition-all text-left cursor-pointer text-sm ${
              activeTab === "import"
                ? "bg-white text-indigo-600 shadow-[0_6px_0_0_#e0e7ff] border-2 border-indigo-100"
                : "text-slate-500 hover:bg-white/60 border-2 border-transparent"
            }`}
          >
            <UploadCloud size={20} className="text-indigo-500" /> Import Đề ETS (PDF + Audio)
          </button>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 space-y-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0]"
          >
            {/* TAB 1: DICTATION */}
            {activeTab === "dictation" && (
              <>
                <h2 className="text-2xl font-black text-slate-800 mb-1">Sinh bài Luyện Nghe (Nghe Chép Chính Tả)</h2>
                <p className="text-slate-400 font-bold text-xs mb-6">
                  AI sẽ sinh đoạn hội thoại tiếng Anh theo chủ đề, tự động tạo file Audio giọng bản xứ (Azure TTS) và cắt thành các câu hỏi điền từ trong cơ sở dữ liệu.
                </p>

                <div className="space-y-4 font-bold text-sm">
                  <div>
                    <label className="block text-slate-600 mb-1.5">Chủ đề bài nghe (Topic) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="VD: Job Interview, Booking a Hotel, Customer Support..."
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-slate-800"
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
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-slate-800"
                    />
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: TOEIC */}
            {activeTab === "toeic" && (
              <>
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
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-slate-800"
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
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB 3: IMPORT ETS PDF */}
            {activeTab === "import" && (
              <>
                <h2 className="text-2xl font-black text-slate-800 mb-1">Trích xuất Đề thi ETS (PDF + Audio)</h2>
                <p className="text-slate-400 font-bold text-xs mb-6">
                  Tải lên file PDF/ảnh đề thi ETS và file Audio đính kèm. AI Gemini Multimodal sẽ tự động đọc, bóc tách câu hỏi, hình ảnh, bài đọc và đáp án lưu vào hệ thống.
                </p>

                <div className="space-y-4 font-bold text-sm">
                  <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-6 rounded-2xl text-center">
                    <UploadCloud size={40} className="text-indigo-400 mx-auto mb-2" />
                    <label className="block text-sm font-black text-slate-700 mb-2">File PDF / Hình ảnh Đề thi <span className="text-rose-500">*</span></label>
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
              </>
            )}

            {/* MESSAGE ALERT */}
            {message && (
              <div
                className={`mt-6 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 font-bold text-sm ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-2 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-2 border-rose-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {message.type === "success" ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0" /> : null}
                  <span>{message.text}</span>
                </div>

                {(message.quizId || createdQuizId) && (
                  <Link
                    href="/admin/quizzes"
                    className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl font-black text-xs hover:bg-emerald-700 transition-colors shrink-0"
                  >
                    Xem trong Quản lý đề <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            )}

            {/* ACTION BUTTON */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-8 py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-black flex items-center gap-2 shadow-[0_6px_0_0_#4338ca] active:translate-y-1 active:shadow-none transition-all cursor-pointer text-base disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                {isLoading ? "AI đang xử lý..." : "Thực thi AI"}
              </button>
            </div>
          </motion.div>

          {/* ================= PREVIEW CÂU HỎI TOEIC VỪA SINH ================= */}
          {activeTab === "toeic" && generatedToeicQuestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] space-y-6"
            >
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                    Xem Trước Kết Quả AI
                  </span>
                  <h3 className="text-2xl font-black text-slate-800 mt-1">
                    Danh Sách {generatedToeicQuestions.length} Câu Hỏi TOEIC Part {part}
                  </h3>
                </div>

                <button
                  onClick={() => saveToeicQuizMut.mutate()}
                  disabled={saveToeicQuizMut.isPending}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black flex items-center gap-2 shadow-[0_4px_0_0_#047857] active:translate-y-1 active:shadow-none transition-all cursor-pointer text-sm disabled:opacity-50"
                >
                  {saveToeicQuizMut.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {saveToeicQuizMut.isPending ? "Đang lưu..." : "💾 Lưu thành Đề thi mới"}
                </button>
              </div>

              <div className="space-y-4">
                {generatedToeicQuestions.map((q, idx) => {
                  const options = q.options || [];
                  const correct = q.correctAnswer || q.correct || "";

                  return (
                    <div
                      key={idx}
                      className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 space-y-3 font-bold"
                    >
                      <div className="flex items-start gap-2">
                        <span className="w-7 h-7 bg-indigo-500 text-white rounded-lg flex items-center justify-center font-black text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="font-black text-slate-800 text-base">
                          {q.text || q.question}
                        </h4>
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {options.map((opt: string, oIdx: number) => {
                          const isCorrect = opt === correct || (opt.length === 1 && String.fromCharCode(65 + oIdx) === correct);
                          return (
                            <div
                              key={oIdx}
                              className={`p-3 rounded-xl border-2 flex items-center gap-2 ${
                                isCorrect
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-black shadow-2xs"
                                  : "bg-white border-slate-200 text-slate-600"
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                                  isCorrect ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span>{opt}</span>
                              {isCorrect && <CheckCircle2 size={14} className="ml-auto text-emerald-600" />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 font-medium">
                          <span className="font-black text-amber-800">💡 Giải thích: </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
