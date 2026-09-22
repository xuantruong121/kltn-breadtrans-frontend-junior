"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Button3D } from "@/components/ui";
import { grammarService } from "@/lib/api/services/grammar.service";
import { useAuthStore } from "@/stores/authStore";
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
      const currentUserId = useAuthStore.getState().user?.id;
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["grammar-topics"] }),
        queryClient.invalidateQueries({ queryKey: ["user-stats", currentUserId] }),
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
    <section className="space-y-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
      <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Bài tập củng cố</h2>
          <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">Kết quả được chấm và lưu trên hệ thống.</p>
        </div>
        {result && (
          <span className="rounded-full border border-emerald-300 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-950/50 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            {result.correctCount}/{result.totalQuestions} câu đúng
          </span>
        )}
      </header>

      {questions.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60 p-5 text-sm font-medium text-slate-500 dark:text-slate-400">
          Chủ đề này chưa có câu hỏi. Hãy quay lại sau khi nội dung được bổ sung.
        </p>
      ) : (
        <div className="space-y-6">
          {questions.map((question, index) => {
            const questionResult = resultFor(question.id);
            return (
              <article key={question.id} className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/60 p-5">
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">Câu {index + 1}: {question.question}</p>
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = answers[String(question.id)] === optionIndex;
                    const isCorrect = questionResult?.correctOption === optionIndex;
                    const isIncorrectSelection = isSelected && questionResult && !questionResult.isCorrect;
                    const style = questionResult
                      ? isCorrect
                        ? "border-emerald-500 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"
                        : isIncorrectSelection
                          ? "border-rose-500 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
                          : "border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-500"
                      : isSelected
                        ? "border-sky-400 bg-sky-100 text-sky-800 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-200"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750";
                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        disabled={Boolean(result)}
                        onClick={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                        className={`flex min-h-11 items-center justify-between rounded-xl border p-3 text-left text-sm font-bold transition ${style} disabled:cursor-default`}
                      >
                        <span>{option}</span>
                        {questionResult && isCorrect && <CheckCircle2 size={16} aria-hidden="true" />}
                        {isIncorrectSelection && <XCircle size={16} aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
                {questionResult?.explanation && (
                  <p className="rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/40 p-3 text-xs font-bold leading-5 text-sky-800 dark:text-sky-300">
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
