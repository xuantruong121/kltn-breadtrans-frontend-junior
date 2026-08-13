"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Trophy, Target, Star, RefreshCw } from "lucide-react";
import { quizService } from "@/lib/api/services/quiz.service";
import Confetti from "react-confetti";
import { motion } from "framer-motion";

export default function SubmissionAnalyticsPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const submissionId = parseInt(params.id);
  
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowDimension, setWindowDimension] = useState({ width: 0, height: 0 });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["submission-analytics", submissionId],
    queryFn: () => quizService.getAnalytics(submissionId),
    enabled: !isNaN(submissionId),
  });

  useEffect(() => {
    setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  useEffect(() => {
    if (analytics && analytics.overallAccuracyPercent === 100) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [analytics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-junior-blue" size={48} />
      </div>
    );
  }

  if (!analytics) return <div>Không tìm thấy kết quả.</div>;

  return (
    <div className="max-w-4xl mx-auto pb-12 relative">
      {showConfetti && <Confetti width={windowDimension.width} height={windowDimension.height} />}
      
      <button 
        onClick={() => router.push('/practice')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Quay lại danh sách
      </button>

      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-3xl p-8 border-4 border-slate-200 shadow-sm text-center mb-8 relative overflow-hidden"
      >
        <div className="absolute -top-6 -right-6 text-yellow-100 opacity-50">
          <Trophy size={150} />
        </div>
        
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2 relative z-10">{analytics.quizTitle}</h1>
        <p className="text-slate-500 font-medium mb-8 relative z-10">Báo cáo kết quả bài tập</p>
        
        <div className="flex flex-wrap justify-center gap-8 relative z-10">
          <div className="flex flex-col items-center p-6 bg-blue-50 rounded-2xl border-2 border-blue-100 min-w-[200px]">
            <Target className="text-junior-blue mb-2" size={32} />
            <span className="text-sm font-bold text-slate-500 uppercase">Câu đúng</span>
            <span className="text-4xl font-black text-junior-blue">{analytics.totalCorrect} <span className="text-2xl text-blue-300">/ {analytics.totalQuestions}</span></span>
          </div>
          <div className="flex flex-col items-center p-6 bg-green-50 rounded-2xl border-2 border-green-100 min-w-[200px]">
            <Star className="text-junior-green mb-2" size={32} />
            <span className="text-sm font-bold text-slate-500 uppercase">Độ chính xác</span>
            <span className="text-4xl font-black text-junior-green">{analytics.overallAccuracyPercent}%</span>
          </div>
        </div>

        {/* Retry Button */}
        <div className="mt-8 flex justify-center">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 font-bold py-3 px-6 rounded-2xl transition-all active:scale-95 shadow-sm z-10"
          >
            <RefreshCw size={20} /> Làm lại bài thi
          </button>
        </div>
      </motion.div>

      <h2 className="text-2xl font-bold text-slate-800 mb-6">Chi tiết đáp án</h2>
      <div className="flex flex-col gap-4">
        {analytics.questions?.map((q: any, idx: number) => {
          const result = analytics.results?.find((r: any) => r.questionId === q.id);
          const isCorrect = result?.isCorrect;
          
          return (
            <motion.div 
              key={q.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-6 rounded-2xl border-4 shadow-sm ${
                isCorrect ? 'bg-white border-green-200' : 'bg-white border-red-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
                  isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">{q.content?.text || "Câu hỏi luyện nghe chép chính tả"}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Bạn đã trả lời:</span>
                      <span className={`text-base font-medium ${isCorrect ? 'text-green-600' : 'text-red-500 line-through'}`}>
                        {result?.answer || "(Bỏ trống)"}
                      </span>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Đáp án đúng:</span>
                      <span className="text-base font-bold text-junior-blue">
                        {q.content?.correct || q.content?.correctAnswer}
                      </span>
                      {q.content?.translation && (
                        <span className="block mt-2 text-sm text-slate-500 italic">
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
  );
}
