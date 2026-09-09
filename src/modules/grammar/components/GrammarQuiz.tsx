"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Button3D } from "@/components/ui";
import { grammarService } from "@/lib/api/services/grammar.service";
import { GrammarAttemptResult, GrammarQuestion } from "../types";

interface GrammarQuizProps {
  topicId: number;
  questions: GrammarQuestion[];
}

export const GrammarQuiz: React.FC<GrammarQuizProps> = ({ topicId, questions }) => {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<GrammarAttemptResult | null>(null);

  const submitAttempt = useMutation({
    mutationFn: () => grammarService.submitAttempt(topicId, answers),
    onSuccess: (data) => {
      setResult(data);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["grammar-topics"] }),
        queryClient.invalidateQueries({ queryKey: ["user-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["daily-quests"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
      ]);
      toast.success(
        data.rewardBanh || data.rewardXP
          ? `Kết quả: ${data.correctCount}/${data.totalQuestions}. Bạn nhận ${data.rewardBanh} Bánh Mì và ${data.rewardXP} EXP.`
          : `Kết quả: ${data.correctCount}/${data.totalQuestions}. Hãy luyện lại để cải thiện nhé.`,
      );
    },
    onError: () => toast.error("Không thể nộp bài lúc này. Vui lòng thử lại."),
  });

  const reset = () => {
    setAnswers({});
    setResult(null);
  };

  const isAllAnswered = questions.length > 0 && questions.every((question) => answers[String(question.id)] !== undefined);
  const resultFor = (questionId: number) => result?.questionsResult.find((item) => item.questionId === questionId);

  return (
    <section className="space-y-6 rounded-[2rem] border-4 border-slate-200 bg-white p-6 shadow-[0_8px_0_0_#e2e8f0]">
      <header className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Bài tập củng cố</h2>
          <p className="mt-1 text-xs font-bold text-slate-400">Kết quả được chấm và lưu trên hệ thống.</p>
        </div>
        {result && (
          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
            {result.correctCount}/{result.totalQuestions} câu đúng
          </span>
        )}
      </header>

      {questions.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-medium text-slate-500">
          Chủ đề này chưa có câu hỏi. Hãy quay lại sau khi nội dung được bổ sung.
        </p>
      ) : (
        <div className="space-y-6">
          {questions.map((question, index) => {
            const questionResult = resultFor(question.id);
            return (
              <article key={question.id} className="space-y-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-5">
                <p className="text-base font-extrabold text-slate-800">Câu {index + 1}: {question.question}</p>
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = answers[String(question.id)] === optionIndex;
                    const isCorrect = questionResult?.correctOption === optionIndex;
                    const isIncorrectSelection = isSelected && questionResult && !questionResult.isCorrect;
                    const style = questionResult
                      ? isCorrect
                        ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                        : isIncorrectSelection
                          ? "border-rose-500 bg-rose-100 text-rose-800"
                          : "border-slate-200 bg-slate-100 text-slate-400"
                      : isSelected
                        ? "border-sky-400 bg-sky-100 text-sky-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100";
                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        disabled={Boolean(result)}
                        onClick={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                        className={`flex min-h-11 items-center justify-between rounded-xl border-2 p-3 text-left text-sm font-bold transition ${style} disabled:cursor-default`}
                      >
                        <span>{option}</span>
                        {questionResult && isCorrect && <CheckCircle2 size={16} aria-hidden="true" />}
                        {isIncorrectSelection && <XCircle size={16} aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
                {questionResult?.explanation && (
                  <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs font-bold leading-5 text-sky-800">
                    <strong>Giải thích:</strong> {questionResult.explanation}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {questions.length > 0 && (
        <div className="flex justify-end">
          {result ? (
            <Button3D variant="blue" size="md" onClick={reset}>Làm lại bài tập</Button3D>
          ) : (
            <Button3D variant="orange" size="lg" onClick={() => submitAttempt.mutate()} disabled={!isAllAnswered || submitAttempt.isPending}>
              {submitAttempt.isPending ? "Đang chấm..." : "Nộp bài và xem kết quả"}
            </Button3D>
          )}
        </div>
      )}
    </section>
  );
};
