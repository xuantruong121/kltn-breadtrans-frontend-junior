"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, FileText, Headphones, UploadCloud, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";

export default function AdminAiToolsPage() {
  const [activeTab, setActiveTab] = useState<"dictation" | "toeic" | "import">("dictation");

  // Form states
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [part, setPart] = useState(5);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const generateDictationMut = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.post("/ai/generate-dictation", { topic, count });
      return res;
    },
    onSuccess: (data: any) => {
      setMessage({ type: "success", text: data?.message || "Sinh bài Luyện Nghe thành công!" });
    },
    onError: (err: any) => {
      setMessage({ type: "error", text: err?.response?.data?.message || "Có lỗi xảy ra khi sinh đề." });
    }
  });

  const generateToeicMut = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.post("/ai/generate-toeic-quiz", { topic, part, count });
      return res;
    },
    onSuccess: () => {
      setMessage({ type: "success", text: "Sinh câu hỏi TOEIC thành công!" });
    },
    onError: (err: any) => {
      setMessage({ type: "error", text: err?.response?.data?.message || "Có lỗi xảy ra khi sinh đề." });
    }
  });

  const importEtsMut = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (pdfFile) formData.append("pdfFile", pdfFile);
      if (audioFile) formData.append("audioFile", audioFile);
      
      const res = await axiosClient.post("/ai/import-ets-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return res;
    },
    onSuccess: (data: any) => {
      setMessage({ type: "success", text: data?.message || "Import đề thi thành công!" });
      setPdfFile(null);
      setAudioFile(null);
    },
    onError: (err: any) => {
      setMessage({ type: "error", text: err?.response?.data?.message || "Có lỗi xảy ra khi import đề." });
    }
  });

  const handleSubmit = () => {
    setMessage(null);
    if (activeTab === "dictation") generateDictationMut.mutate();
    if (activeTab === "toeic") generateToeicMut.mutate();
    if (activeTab === "import") importEtsMut.mutate();
  };

  const isLoading = generateDictationMut.isPending || generateToeicMut.isPending || importEtsMut.isPending;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-indigo-500 p-4 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
          <Bot size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Công cụ AI Gia Sư</h1>
          <p className="text-slate-500 font-medium mt-1">Sử dụng sức mạnh của AI để tự động tạo đề thi và trích xuất dữ liệu.</p>
        </div>
      </div>

      <div className="flex gap-8">
        {/* SIDEBAR TABS */}
        <div className="w-64 shrink-0 flex flex-col gap-2">
          <button 
            onClick={() => { setActiveTab("dictation"); setMessage(null); }}
            className={`p-4 rounded-2xl flex items-center gap-3 font-bold transition-all text-left ${activeTab === "dictation" ? "bg-white text-indigo-600 shadow-sm border-2 border-indigo-100" : "text-slate-500 hover:bg-white/50 border-2 border-transparent"}`}
          >
            <Headphones size={20} /> Sinh bài Luyện Nghe
          </button>
          <button 
            onClick={() => { setActiveTab("toeic"); setMessage(null); }}
            className={`p-4 rounded-2xl flex items-center gap-3 font-bold transition-all text-left ${activeTab === "toeic" ? "bg-white text-indigo-600 shadow-sm border-2 border-indigo-100" : "text-slate-500 hover:bg-white/50 border-2 border-transparent"}`}
          >
            <FileText size={20} /> Sinh câu hỏi TOEIC
          </button>
          <button 
            onClick={() => { setActiveTab("import"); setMessage(null); }}
            className={`p-4 rounded-2xl flex items-center gap-3 font-bold transition-all text-left ${activeTab === "import" ? "bg-white text-indigo-600 shadow-sm border-2 border-indigo-100" : "text-slate-500 hover:bg-white/50 border-2 border-transparent"}`}
          >
            <UploadCloud size={20} /> Import Đề ETS (PDF)
          </button>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[2rem] border-4 border-slate-100 shadow-sm"
          >
            {activeTab === "dictation" && (
              <>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Sinh bài Luyện Nghe (Nghe Chép)</h2>
                <p className="text-slate-500 mb-8">AI sẽ tự động sinh đoạn hội thoại theo chủ đề, tạo Audio giọng bản xứ và cắt thành từng câu hỏi điền từ.</p>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Chủ đề (Topic)</label>
                    <input 
                      type="text" 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="VD: Phỏng vấn xin việc, Đặt bàn nhà hàng..."
                      className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Số lượng câu thoại</label>
                    <input 
                      type="number" 
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      min={1} max={20}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === "toeic" && (
              <>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Sinh câu hỏi TOEIC</h2>
                <p className="text-slate-500 mb-8">AI sẽ sinh các câu hỏi chuẩn format TOEIC Reading (Part 5, 6).</p>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Chủ đề (Topic)</label>
                    <input 
                      type="text" 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="VD: Từ vựng văn phòng, Hợp đồng kinh tế..."
                      className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Part (5 hoặc 6)</label>
                      <select 
                        value={part}
                        onChange={(e) => setPart(Number(e.target.value))}
                        className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                      >
                        <option value={5}>Part 5 (Incomplete Sentences)</option>
                        <option value={6}>Part 6 (Text Completion)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Số lượng câu</label>
                      <input 
                        type="number" 
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                        min={1} max={20}
                        className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "import" && (
              <>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Trích xuất Đề thi ETS (PDF)</h2>
                <p className="text-slate-500 mb-8">Tải lên file PDF đề thi ETS (chứa hình ảnh, text) và file Audio. AI sẽ tự động đọc, nhận diện câu hỏi và đáp án để lưu vào hệ thống.</p>
                
                <div className="space-y-6">
                  <div className="border-2 border-dashed border-indigo-200 bg-indigo-50 p-8 rounded-2xl text-center">
                    <UploadCloud size={48} className="text-indigo-400 mx-auto mb-4" />
                    <label className="block text-sm font-bold text-slate-700 mb-2">File PDF Đề thi</label>
                    <input 
                      type="file" 
                      accept=".pdf,image/*"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 mx-auto cursor-pointer"
                    />
                  </div>

                  <div className="border-2 border-dashed border-slate-200 bg-slate-50 p-8 rounded-2xl text-center">
                    <Headphones size={48} className="text-slate-400 mx-auto mb-4" />
                    <label className="block text-sm font-bold text-slate-700 mb-2">File Audio (Tùy chọn)</label>
                    <input 
                      type="file" 
                      accept="audio/*"
                      onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 mx-auto cursor-pointer"
                    />
                  </div>
                </div>
              </>
            )}

            {message && (
              <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 font-medium ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.type === 'success' ? <CheckCircle2 size={20} /> : null}
                {message.text}
              </div>
            )}

            <div className="mt-10 flex justify-end">
              <button 
                onClick={handleSubmit}
                disabled={isLoading}
                className="btn-primary-3d px-8 py-4 bg-indigo-500 hover:bg-indigo-600 border-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm text-lg"
              >
                {isLoading ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
                {isLoading ? "AI đang xử lý..." : "Thực thi AI"}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
