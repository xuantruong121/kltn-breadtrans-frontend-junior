"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToeicStore } from "@/stores/toeicStore";
import { Clock, Send, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";

export default function ToeicExamPage(props: { params: Promise<{ examId: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptId = parseInt(searchParams.get("attemptId") || "0");
  
  const { answers, timeRemaining, setAttempt, setAnswer, syncWithServer, submitAttempt } = useToeicStore();
  const [exam, setExam] = useState<any>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize store and sync timer
  useEffect(() => {
    if (attemptId) {
      setAttempt(attemptId, 7200);
      syncWithServer();
      
      const interval = setInterval(() => {
        syncWithServer(); // Periodic sync to correct timer and ensure saving
      }, 30000); // every 30s
      
      return () => clearInterval(interval);
    }
  }, [attemptId, setAttempt, syncWithServer]);

  // Fallback load mock exam if backend fails
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await axiosClient.get(`/toeic/exams/${params.examId}`);
        setExam(res);
      } catch (err) {
        // Mock data
        setExam({
          id: parseInt(params.examId),
          title: "Mock TOEIC Test",
          groups: [
            {
              part: 1,
              questions: Array.from({length: 10}).map((_, i) => ({
                id: i+1, questionNumber: i+1, text: `Phần nghe hình ảnh số ${i+1}`, options: ["A", "B", "C", "D"]
              }))
            },
            {
              part: 5,
              questions: Array.from({length: 30}).map((_, i) => ({
                id: i+101, questionNumber: i+101, text: `Điền vào chỗ trống câu ${i+101}`, options: ["Word 1", "Word 2", "Word 3", "Word 4"]
              }))
            }
          ]
        });
      }
    };
    fetchExam();
  }, [params.examId]);

  const handleSubmit = async () => {
    if (!confirm("Bạn có chắc chắn muốn nộp bài không?")) return;
    setIsSubmitting(true);
    await submitAttempt();
    router.push(`/toeic/result/${attemptId}`);
  };

  if (!exam) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

  // Flatten all questions for easy navigation
  const allQuestions = exam.groups.flatMap((g: any) => g.questions);
  const currentQ = allQuestions[currentQuestionIdx];

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col h-full min-h-[600px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-lg">{exam.title}</h2>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-mono text-xl bg-slate-800 px-4 py-2 rounded-lg text-orange-400 font-bold">
            <Clock size={20} /> {formatTime(timeRemaining || 7200)}
          </div>
          <button 
            onClick={handleSubmit}
            data-testid="btn-submit-exam"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} 
            Nộp Bài
          </button>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Question Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {currentQ ? (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6 flex items-center gap-3">
                <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-bold">
                  Câu hỏi {currentQ.questionNumber}
                </span>
                {/* Normally we'd show group/part info here */}
              </div>
              <h3 className="text-xl font-medium text-slate-800 mb-8">{currentQ.text}</h3>
              
              <div className="space-y-3">
                {currentQ.options.map((opt: string, idx: number) => {
                  const isSelected = answers[currentQ.id] === idx;
                  return (
                    <button
                      key={idx}
                      data-testid={`option-${currentQ.id}-${idx}`}
                      onClick={() => setAnswer(currentQ.id, idx)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected 
                          ? "border-blue-500 bg-blue-50 text-blue-800" 
                          : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="font-bold mr-3">{String.fromCharCode(65 + idx)}.</span> 
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between mt-12">
                <button 
                  onClick={() => setCurrentQuestionIdx(Math.max(0, currentQuestionIdx - 1))}
                  disabled={currentQuestionIdx === 0}
                  className="flex items-center gap-2 font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30"
                >
                  <ChevronLeft size={20} /> Câu trước
                </button>
                <button 
                  onClick={() => setCurrentQuestionIdx(Math.min(allQuestions.length - 1, currentQuestionIdx + 1))}
                  data-testid="btn-next-question"
                  disabled={currentQuestionIdx === allQuestions.length - 1}
                  className="flex items-center gap-2 font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30"
                >
                  Câu tiếp theo <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ) : (
            <p>Đang tải câu hỏi...</p>
          )}
        </div>

        {/* Right: Navigator */}
        <div className="w-80 bg-slate-50 border-l border-slate-200 p-4 flex flex-col shrink-0">
          <h3 className="font-bold text-slate-700 mb-4">Bảng câu hỏi</h3>
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-5 gap-2">
              {allQuestions.map((q: any, i: number) => {
                const isAnswered = answers[q.id] !== undefined;
                const isCurrent = i === currentQuestionIdx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIdx(i)}
                    className={`h-10 rounded-lg text-sm font-bold border-2 transition-colors flex items-center justify-center ${
                      isCurrent ? "border-blue-500 bg-white text-blue-600" :
                      isAnswered ? "border-green-500 bg-green-500 text-white" :
                      "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {q.questionNumber}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
