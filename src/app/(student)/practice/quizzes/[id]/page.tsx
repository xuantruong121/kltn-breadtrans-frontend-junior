"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { use, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, CheckCircle2, ChevronRight, Volume2, Play, Square } from "lucide-react";
import { quizService, AnswerDto } from "@/lib/api/services/quiz.service";

export default function TakeQuizPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const quizId = parseInt(params.id);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [dictationResults, setDictationResults] = useState<Record<number, { isChecked: boolean, isCorrect: boolean, diff: any[] }>>({});

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

  const playAudio = (text: string, rate: number = 1) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      if (isPlaying && playbackRate === rate) {
        setIsPlaying(false);
        return;
      }
      
      setPlaybackRate(rate);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = rate;
      
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCheckDictation = () => {
    const userAnswer = answers[currentQuestion.id] || "";
    const correctAnswer = currentQuestion.content?.correctAnswer || "";
    
    // Clean strings for comparison
    const cleanString = (str: string) => str.toLowerCase().replace(/[.,!?]/g, '').trim();
    const userWords = cleanString(userAnswer).split(/\s+/).filter(Boolean);
    const correctWords = cleanString(correctAnswer).split(/\s+/).filter(Boolean);
    
    let isCorrect = true;
    const diff = userWords.map((word, idx) => {
      const correctWord = correctWords[idx];
      if (word !== correctWord) {
        isCorrect = false;
        return { word, status: 'wrong' };
      }
      return { word, status: 'correct' };
    });

    if (userWords.length !== correctWords.length) {
       isCorrect = false;
    }

    setDictationResults({
      ...dictationResults,
      [currentQuestion.id]: { isChecked: true, isCorrect, diff }
    });
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
        {currentQuestion.content?.audioUrl ? (
          <div className="mb-6 flex justify-center">
            <audio controls src={currentQuestion.content.audioUrl} className="w-full max-w-sm rounded-full" />
          </div>
        ) : currentQuestion.content?.audioText ? (
          <div className="mb-8 flex flex-col items-center gap-4 bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
            <button
              onClick={() => playAudio(currentQuestion.content.audioText, playbackRate)}
              className={`flex items-center justify-center p-6 rounded-full transition-all shadow-sm active:scale-95 border-4 ${
                isPlaying 
                  ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100' 
                  : 'bg-white text-junior-blue border-blue-100 hover:bg-blue-50'
              }`}
            >
              {isPlaying ? <Square size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-2" />}
            </button>
            <div className="flex gap-2 bg-white p-1.5 rounded-full border border-slate-200 shadow-sm">
              {[0.8, 1, 1.2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    setPlaybackRate(rate);
                    if (isPlaying) {
                      playAudio(currentQuestion.content.audioText, rate);
                    }
                  }}
                  className={`px-4 py-1.5 rounded-full font-bold text-sm transition-colors ${
                    playbackRate === rate 
                      ? 'bg-slate-800 text-white' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        ) : null}
        
        <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">
          {currentQuestion.content?.text || "Nghe và điền vào chỗ trống:"}
        </h3>

        {currentQuestion.type === 'WRITING' ? (
          <textarea
            value={answers[currentQuestion.id] || ""}
            onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
            placeholder="Nhập câu trả lời của bạn vào đây..."
            className="w-full bg-slate-50 border-4 border-slate-200 rounded-2xl p-6 text-lg font-medium text-slate-700 outline-none focus:border-junior-blue transition-colors min-h-[150px]"
          />
        ) : quiz.type === 'LISTENING_PRACTICE' ? (
          <div className="flex flex-col gap-4">
            <textarea
              value={answers[currentQuestion.id] || ""}
              onChange={(e) => {
                 setAnswers({ ...answers, [currentQuestion.id]: e.target.value });
                 // Reset check state on typing
                 if (dictationResults[currentQuestion.id]?.isChecked) {
                   setDictationResults(prev => ({ ...prev, [currentQuestion.id]: { ...prev[currentQuestion.id], isChecked: false } }));
                 }
              }}
              placeholder="Nhập câu trả lời của bạn vào đây..."
              className={`w-full bg-slate-50 border-4 rounded-2xl p-6 text-lg font-medium outline-none transition-colors min-h-[150px] ${
                dictationResults[currentQuestion.id]?.isChecked
                  ? dictationResults[currentQuestion.id].isCorrect
                    ? "border-green-400 text-green-700 bg-green-50"
                    : "border-red-400 text-slate-700"
                  : "border-slate-200 text-slate-700 focus:border-junior-blue"
              }`}
            />
            
            {dictationResults[currentQuestion.id]?.isChecked && (
              <div className="p-4 rounded-2xl bg-slate-100 border-2 border-slate-200">
                {!dictationResults[currentQuestion.id].isCorrect ? (
                  <div className="text-lg font-medium leading-relaxed">
                    <span className="text-slate-500 block mb-2 text-sm font-bold uppercase">Lỗi sai của bạn:</span>
                    {dictationResults[currentQuestion.id].diff.map((item, idx) => (
                      <span key={idx} className={`mr-2 ${item.status === 'wrong' ? 'text-red-500 underline decoration-red-500 font-bold' : 'text-slate-700'}`}>
                        {item.word}
                      </span>
                    ))}
                    {(answers[currentQuestion.id] || '').split(/\s+/).length !== (currentQuestion.content?.correctAnswer || '').split(/\s+/).length && (
                      <span className="text-orange-500 block mt-2 text-sm italic">* Lưu ý: Số lượng từ của bạn không khớp với đáp án.</span>
                    )}
                  </div>
                ) : (
                  <div className="text-lg font-medium leading-relaxed">
                    <span className="text-green-600 block mb-2 text-sm font-bold uppercase">Hoàn hảo! Đáp án chuẩn:</span>
                    <span className="text-slate-800 block mb-2">{currentQuestion.content?.correctAnswer}</span>
                    {currentQuestion.content?.translation && (
                      <span className="text-slate-500 block text-base italic">{currentQuestion.content.translation}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
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
        {quiz.type === 'LISTENING_PRACTICE' && !dictationResults[currentQuestion.id]?.isChecked ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCheckDictation}
            className="flex items-center gap-2 text-white text-xl font-bold px-8 py-4 rounded-2xl shadow-sm bg-orange-500 hover:bg-orange-600"
          >
            Kiểm tra
          </motion.button>
        ) : (
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
        )}
      </div>
    </div>
  );
}
