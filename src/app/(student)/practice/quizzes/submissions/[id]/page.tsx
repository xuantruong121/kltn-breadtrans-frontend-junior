"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Trophy, Target, Star, RefreshCw } from "lucide-react";
import { quizService } from "@/lib/api/services/quiz.service";
import { BackButton } from "@/components/ui";
import Confetti from "react-confetti";
import { motion } from "framer-motion";

export default function SubmissionAnalyticsPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const submissionId = parseInt(params.id);
  
  const [stoppedConfetti, setStoppedConfetti] = useState(false);
  const [windowDimension, setWindowDimension] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 800,
    height: typeof window !== "undefined" ? window.innerHeight : 600,
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["submission-analytics", submissionId],
    queryFn: () => quizService.getAnalytics(submissionId),
    enabled: !isNaN(submissionId),
  });

  const isPerfect = analytics?.overallAccuracyPercent === 100;
  const showConfetti = isPerfect && !stoppedConfetti;

  useEffect(() => {
    const handleResize = () => {
      setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isPerfect) {
      const timer = setTimeout(() => setStoppedConfetti(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [isPerfect]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-junior-blue" size={48} />
      </div>
    );
  }

  if (!analytics) return <div>Không tìm thấy kết quả.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 relative">
      {showConfetti && <Confetti width={windowDimension.width} height={windowDimension.height} />}
      
      {/* TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border-4 border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <BackButton href="/practice/quizzes" label="Quay lại danh sách bài thi" />
          <div className="h-6 w-0.5 bg-slate-200 hidden sm:block"></div>
          <div>
            <h1 className="text-xl font-black text-slate-800 line-clamp-1">{analytics.quizTitle}</h1>
            <p className="text-xs font-bold text-slate-400">
              Báo cáo kết quả & phân tích chi tiết đáp án
            </p>
          </div>
        </div>

        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-2 px-4 rounded-2xl transition-all cursor-pointer text-xs self-start sm:self-auto"
        >
          <RefreshCw size={16} /> Làm lại bài thi
        </button>
      </div>

      {/* 2-COLUMN MAIN LAYOUT */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: QUESTION BREAKDOWN */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border-4 border-slate-100 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span>📝</span> Chi Tiết Từng Câu Hỏi
            </h2>

            <div className="flex flex-col gap-4">
              {analytics.questions?.map((q: any, idx: number) => {
                const result = analytics.results?.find((r: any) => r.questionId === q.id);
                const isCorrect = result?.isCorrect;
                
                return (
                  <motion.div 
                    key={q.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-5 rounded-2xl border-2 transition-all ${
                      isCorrect ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-slate-800 mb-3 break-words">
                          {q.content?.text || "Nghe đoạn âm thanh và điền câu trả lời:"}
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 bg-white rounded-xl border border-slate-200">
                            <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Bạn đã trả lời:</span>
                            <span className={`font-bold text-sm break-words block ${isCorrect ? 'text-emerald-700' : 'text-rose-600 line-through'}`}>
                              {result?.answer || "(Bỏ trống)"}
                            </span>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-200">
                            <span className="text-[10px] font-black text-sky-600 uppercase block mb-1">Đáp án chuẩn:</span>
                            <span className="font-bold text-sm text-sky-800 break-words block">
                              {q.content?.correct || q.content?.correctAnswer}
                            </span>
                            {q.content?.translation && (
                              <span className="block mt-1.5 text-xs text-slate-500 italic break-words">
                                Dịch: {q.content.translation}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SCORE OVERVIEW & ACTIONS */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Score Summary Card */}
          <motion.div 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[2rem] p-6 border-4 border-slate-100 shadow-sm text-center relative overflow-hidden space-y-4"
          >
            <div className="absolute -top-4 -right-4 text-amber-100 opacity-60 pointer-events-none">
              <Trophy size={130} />
            </div>

            <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Trophy size={32} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">Tổng Điểm Của Bạn</h2>
              <p className="text-xs font-bold text-slate-400 mt-0.5">Hoàn thành bài luyện tập xuất sắc</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200 flex flex-col items-center">
                <Target className="text-sky-600 mb-1" size={24} />
                <span className="text-[10px] font-black text-slate-500 uppercase">Câu đúng</span>
                <span className="text-2xl font-black text-sky-700">
                  {analytics.totalCorrect} <span className="text-sm text-sky-400">/{analytics.totalQuestions}</span>
                </span>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col items-center">
                <Star className="text-emerald-500 mb-1" size={24} />
                <span className="text-[10px] font-black text-slate-500 uppercase">Chính xác</span>
                <span className="text-2xl font-black text-emerald-600">
                  {analytics.overallAccuracyPercent}%
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button 
                onClick={() => router.back()}
                className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-black py-3 px-4 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer text-sm"
              >
                <RefreshCw size={18} /> Làm lại bài thi này
              </button>
              <Link href="/practice/quizzes" className="w-full">
                <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all cursor-pointer text-xs">
                  Chọn bài tập khác
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Gamification Reward Card */}
          <div className="bg-amber-50 border-2 border-amber-200 p-5 rounded-[2rem] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center text-2xl shadow-sm shrink-0">
              🍞
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm">Điểm Thưởng Đã Nhận</p>
              <p className="text-xs font-bold text-amber-800 mt-0.5">+20 EXP • Đã ghi nhận vào Nhiệm Vụ Ngày</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
