"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Lock } from "lucide-react";

import { PracticeCatalogFilters } from "@/components/practice/PracticeCatalogFilters";
import {
  catalogLevelLabel,
  DEFAULT_CATALOG_SORT,
  matchesDifficultyFilter,
  matchesStatusFilter,
  sortByLevel,
  type CatalogSort,
  type DifficultyFilter,
  type StatusFilter,
} from "@/lib/practice/catalogFilters";
import { LevelLockButton } from "@/components/practice/LevelLockDialog";
import { unlockPlanFor } from "@/modules/subscription/practicePlan";
import { cueWordPairs, pictureCards } from "@/lib/writing/pictureWriting";
import type { WritingTopicItem } from "@/components/writing/WritingTopicCard";

/**
 * "Viết câu theo tranh" catalog: one card per picture with its two cue words
 * and level. The pair filter lists only pairs the content really has.
 */
export function PictureWritingCatalog({
  quizzes,
  isAuthenticated,
  onOpen,
  onLocked,
  onLevelLocked,
  onGuest,
}: {
  quizzes: WritingTopicItem[];
  isAuthenticated: boolean;
  onOpen: (href: string) => void;
  onLocked: (quiz: WritingTopicItem) => void;
  onLevelLocked: (quiz: WritingTopicItem) => void;
  onGuest: (quiz: WritingTopicItem) => void;
}) {
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("ALL");
  const [sort, setSort] = useState<CatalogSort>(DEFAULT_CATALOG_SORT);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [pair, setPair] = useState("ALL");

  const cards = useMemo(() => pictureCards(quizzes), [quizzes]);
  const pairs = useMemo(() => cueWordPairs(cards), [cards]);
  const visible = useMemo(
    () =>
      sortByLevel(
        cards.filter(
          (card) =>
            matchesDifficultyFilter(card.quiz.cefrLevel ?? card.quiz.title, difficulty, card.quiz.practiceLevel) &&
            matchesStatusFilter(card.task.isGraded ? "COMPLETED" : "NOT_STARTED", status) &&
            (pair === "ALL" || card.pair === pair),
        ),
        sort,
        (card) => card.quiz.cefrLevel ?? card.quiz.title,
      ),
    [cards, difficulty, status, pair, sort],
  );

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs sm:p-5 space-y-3">
        {pairs.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="picture-pair" className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Cặp từ gợi ý:
            </label>
            <select
              id="picture-pair"
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              className="min-h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value="ALL">Tất cả cặp từ</option>
              {pairs.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}
        <PracticeCatalogFilters
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          sort={sort}
          onSortChange={setSort}
          status={status}
          onStatusChange={setStatus}
          statusOptions={isAuthenticated ? ["NOT_STARTED", "COMPLETED"] : []}
          resultCount={visible.length}
          itemNoun="tranh"
          onReset={() => {
            setDifficulty("ALL");
            setSort(DEFAULT_CATALOG_SORT);
            setStatus("ALL");
            setPair("ALL");
          }}
        />
      </section>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Không có tranh phù hợp với bộ lọc này.
        </p>
      ) : (
        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map(({ key, quiz, task, href }) => {
            const locked = Boolean(quiz.isLocked);
            const levelLocked = isAuthenticated && Boolean(quiz.isLevelLocked);
            const plan = unlockPlanFor("WRITING", quiz.requiredPlan);
            const level = catalogLevelLabel(quiz.cefrLevel ?? quiz.title, quiz.practiceLevel);
            return (
              <article
                key={key}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                {task.imageUrl && (
                  <img
                    src={task.imageUrl}
                    alt={`Tranh với từ gợi ý ${task.keywords.join(" và ")}`}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                  <div className="flex flex-wrap gap-2" lang="en">
                    {task.keywords.map((k) => (
                      <span
                        key={k}
                        className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-sm font-semibold text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {task.isGraded && (
                        <CheckCircle2 size={14} strokeWidth={2} className="text-emerald-600" aria-hidden="true" />
                      )}
                      {level}
                      {task.isGraded ? " · Đã chấm" : ""}
                    </span>
                    {levelLocked ? (
                      <LevelLockButton
                        onClick={() => onLevelLocked(quiz)}
                        ariaLabel={`Chưa mở mức của tranh với từ ${task.keywords.join(", ")}`}
                      />
                    ) : locked ? (
                      <button
                        type="button"
                        onClick={() => onLocked(quiz)}
                        aria-label={`Mở khóa tranh với từ ${task.keywords.join(", ")} bằng gói ${plan}`}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 cursor-pointer"
                      >
                        <Lock size={14} strokeWidth={2} aria-hidden="true" />
                        Mở khóa với {plan}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => (isAuthenticated ? onOpen(href) : onGuest(quiz))}
                        aria-label={`Luyện viết với tranh có từ ${task.keywords.join(", ")}`}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 cursor-pointer"
                      >
                        Luyện viết
                        <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
