"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Headphones, Lock, Volume2 } from "lucide-react";
import type { ListeningPracticeCatalogItem } from "@/lib/api/services/quiz.service";

interface ListeningExerciseCardProps {
  quiz: ListeningPracticeCatalogItem;
  isAuthenticated: boolean;
  onOpenAuthGate: (quiz: ListeningPracticeCatalogItem) => void;
  onStart?: (quiz: ListeningPracticeCatalogItem) => void;
  isLaunching?: boolean;
}

export function ListeningExerciseCard({
  quiz,
  isAuthenticated,
  onOpenAuthGate,
  onStart,
  isLaunching = false,
}: ListeningExerciseCardProps) {
  const isCompleted = quiz.isCompleted;
  const questionCount = quiz.questionCount ?? quiz._count?.questions ?? 0;
  const durationMinutes = quiz.durationMinutes ?? 12;
  const levels = Array.isArray(quiz.levels) ? quiz.levels : [];
  const topics = Array.isArray(quiz.topics) ? quiz.topics : [];
  const accents = Array.isArray(quiz.accents) ? quiz.accents : [];

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      onOpenAuthGate(quiz);
    }
  };

  return (
    <article className="group flex min-h-72 flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md sm:p-6">
      <div className="space-y-3.5">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200/80 bg-blue-50 px-2.5 py-0.5 text-[11px] font-extrabold text-blue-700">
              <Volume2 size={12} aria-hidden="true" /> Nghe hiểu
            </span>

            {levels.map((lvl) => (
              <span
                key={lvl}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700"
              >
                {lvl}
              </span>
            ))}

            {accents.length > 0 && (
              <span className="rounded-lg border border-indigo-200/60 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                {accents.join(", ")}
              </span>
            )}
          </div>

          {isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
              <CheckCircle2 size={12} aria-hidden="true" /> Đã hoàn thành
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-extrabold leading-snug text-slate-900 transition-colors group-hover:text-blue-700 sm:text-lg">
          {quiz.title}
        </h3>

        {/* Topics */}
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topics.map((topic) => (
              <span
                key={topic}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        <p className="line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm">
          {quiz.description || "Rèn luyện khả năng nghe hiểu theo ngữ cảnh qua tình huống giao tiếp thực tế."}
        </p>
      </div>

      {/* Bottom Row */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Headphones size={13} className="text-slate-400" aria-hidden="true" />
              {questionCount} câu
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={13} className="text-slate-400" aria-hidden="true" />
              {durationMinutes} phút
            </span>
          </div>

          {isAuthenticated ? (
            onStart ? (
              <button
                type="button"
                onClick={() => onStart(quiz)}
                disabled={isLaunching}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-blue-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer"
              >
                {isCompleted ? "Luyện tập lại" : "Bắt đầu bài nghe"}
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            ) : (
              <Link
                href={`/practice/quizzes/${quiz.id}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-blue-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {isCompleted ? "Luyện tập lại" : "Bắt đầu bài nghe"}
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            )
          ) : (
            <button
              type="button"
              onClick={handleCardClick}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 text-xs font-extrabold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <Lock size={12} aria-hidden="true" />
              Đăng nhập để bắt đầu
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
