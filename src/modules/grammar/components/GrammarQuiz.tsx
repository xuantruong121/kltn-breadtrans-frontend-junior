"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, HelpCircle, Trophy } from "lucide-react";
import { GrammarQuestion } from "../types";
import { Button3D } from "@/components/ui";
import { useGamificationStore } from "@/stores/gamificationStore";

interface GrammarQuizProps {
  questions: GrammarQuestion[];
}

export const GrammarQuiz: React.FC<GrammarQuizProps> = ({ questions }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const { addBreads, addExp } = useGamificationStore();

  const handleSelect = (questionId: string, option: string) => {
    if (showResults) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleCheckAnswers = () => {
    setShowResults(true);
    let correctCount = 0;
    questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswer) correctCount++;
    });

    // Reward breads & exp
    addBreads(correctCount * 5);
    addExp(correctCount * 25);
  };

  const isAllAnswered = questions.every((q) => selectedAnswers[q.id]);

  return (
    <div className="bg-white rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] p-6 space-y-6">
      <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
        <div>
          <h3 className="text-xl font-black text-slate-800">Bài Tập Củng Cố Ngữ Pháp</h3>
          <p className="text-xs font-bold text-slate-400">Làm đúng để nhận thêm Bánh Mì 🍞</p>
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((q, index) => {
          const userAns = selectedAnswers[q.id];
          const isCorrect = userAns === q.correctAnswer;

          return (
            <div key={q.id} className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-3">
              <p className="font-extrabold text-slate-800 text-base">
                Câu {index + 1}: {q.question}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {q.options.map((opt, oIdx) => {
                  const isSelected = userAns === opt;
                  let btnStyle = "bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-100";

                  if (showResults) {
                    if (opt === q.correctAnswer) {
                      btnStyle = "bg-emerald-100 border-2 border-emerald-500 text-emerald-800 font-black";
                    } else if (isSelected && !isCorrect) {
                      btnStyle = "bg-rose-100 border-2 border-rose-500 text-rose-800 line-through font-bold";
                    } else {
                      btnStyle = "bg-slate-100 border-2 border-slate-200 text-slate-400 opacity-60";
                    }
                  } else if (isSelected) {
                    btnStyle = "bg-sky-100 border-2 border-sky-400 text-sky-800 font-black shadow-xs";
                  }

                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelect(q.id, opt)}
                      disabled={showResults}
                      className={`p-3 rounded-xl text-left font-bold text-sm transition-all cursor-pointer select-none flex items-center justify-between ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      {showResults && opt === q.correctAnswer && (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      )}
                      {showResults && isSelected && !isCorrect && (
                        <XCircle size={16} className="text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {showResults && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs font-bold text-sky-800"
                >
                  💡 <strong>Giải thích:</strong> {q.explanation}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 flex justify-end">
        {!showResults ? (
          <Button3D
            variant="orange"
            size="lg"
            onClick={handleCheckAnswers}
            disabled={!isAllAnswered}
          >
            Kiểm tra đáp án
          </Button3D>
        ) : (
          <Button3D
            variant="blue"
            size="md"
            onClick={() => {
              setSelectedAnswers({});
              setShowResults(false);
            }}
          >
            Làm lại bài tập
          </Button3D>
        )}
      </div>
    </div>
  );
};
