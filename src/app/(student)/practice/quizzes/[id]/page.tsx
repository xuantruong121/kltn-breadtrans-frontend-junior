"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { use, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, CheckCircle2, ChevronRight, Volume2 } from "lucide-react";
import { quizService, AnswerDto } from "@/lib/api/services/quiz.service";

export default function TakeQuizPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const quizId = parseInt(params.id);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentStep, setCurrentStep] = useState(0);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => quizService.getQuizById(quizId),
    enabled: !isNaN(quizId),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: AnswerDto[]) => quizService.submitQuiz(quizId, payload),
    onSuccess: (data) => {
      // Redirect to analytics page
      router.push(`/practice/quizzes/submissions/${data.id}`);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="animate-spin text-junior-blue" size={48} />
      </div>
    );
  }

  if (!quiz) return <div>Không tìm thấy bài tập</div>;

  const questions = quiz.questions || [];
  const currentQuestion = questions[currentStep];

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit
      const payload: AnswerDto[] = Object.keys(answers).map(qId => ({
        questionId: parseInt(qId),
        answer: answers[parseInt(qId)]
      }));
      submitMutation.mutate(payload);
    }
  };

  const isLastStep = currentStep === questions.length - 1;

  if (questions.length === 0) {
    return <div className="text-center p-12">Đề thi này chưa có câu hỏi nào.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Thoát bài thi
      </button>

      {/* Progress */}
      <div className="bg-white p-6 rounded-2xl border-4 border-slate-200 mb-6 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{quiz.title}</h2>
          <p className="text-slate-500 font-medium text-sm">Câu {currentStep + 1} / {questions.length}</p>
        </div>
        <div className="w-1/2 bg-slate-100 h-4 rounded-full overflow-hidden">
           <motion.div 
             className="bg-junior-blue h-full"
             initial={{ width: 0 }}
             animate={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
           />
        </div>
      </div>

      {/* Question Card */}
      <motion.div 
        key={currentQuestion.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white p-8 rounded-3xl border-4 border-sky-100 shadow-md mb-6"
      >
        {/* Render Audio if present in content */}
        {currentQuestion.content?.audioUrl && (
          <div className="mb-6 flex justify-center">
            <audio controls src={currentQuestion.content.audioUrl} className="w-full max-w-sm rounded-full" />
          </div>
        )}
        
        <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">
          {currentQuestion.content?.text || "Nghe và điền vào chỗ trống:"}
        </h3>

        {currentQuestion.type === 'WRITING' || quiz.type === 'LISTENING_PRACTICE' ? (
          <textarea
            value={answers[currentQuestion.id] || ""}
            onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
            placeholder="Nhập câu trả lời của bạn vào đây..."
            className="w-full bg-slate-50 border-4 border-slate-200 rounded-2xl p-6 text-lg font-medium text-slate-700 outline-none focus:border-junior-blue transition-colors min-h-[150px]"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Render options for multiple choice */}
             {(currentQuestion.content?.options || ["A", "B", "C", "D"]).map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setAnswers({ ...answers, [currentQuestion.id]: opt })}
                  className={`p-4 rounded-xl border-4 font-bold text-left transition-all ${
                    answers[currentQuestion.id] === opt 
                      ? "border-junior-blue bg-sky-50 text-junior-blue" 
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {opt}
                </button>
             ))}
          </div>
        )}
      </motion.div>

      {/* Actions */}
      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleNext}
          disabled={submitMutation.isPending}
          className={`flex items-center gap-2 text-white text-xl font-bold px-8 py-4 rounded-2xl shadow-sm ${
            isLastStep ? "bg-junior-green btn-green-3d" : "bg-junior-blue btn-blue-3d"
          }`}
        >
          {submitMutation.isPending ? (
            <Loader2 className="animate-spin" size={24} />
          ) : isLastStep ? (
            <>Nộp bài <CheckCircle2 size={24} strokeWidth={3} /></>
          ) : (
            <>Tiếp theo <ChevronRight size={24} strokeWidth={3} /></>
          )}
        </motion.button>
      </div>
    </div>
  );
}
