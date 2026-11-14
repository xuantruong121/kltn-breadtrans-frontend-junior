"use client";

import { useMemo, useState } from "react";
import { CatalogPagination, useCatalogPage } from "@/components/practice/CatalogPagination";
import { ArrowRight, CheckCircle2, Shuffle } from "lucide-react";

import type { GrammarTopicSummary } from "@/lib/api/services/grammar.service";
import {
  GRAMMAR_CATEGORY_LABEL,
  GRAMMAR_CATEGORY_ORDER,
  grammarCategory,
  grammarDisplayTitle,
  type GrammarCategory,
} from "@/lib/catalog/displayTitles";
import {
  groupGrammarTopics,
  pickRandomGrammarTopic,
  grammarTopicStatus,
} from "@/components/reading/grammarCatalogLogic";
import { STATUS_LABEL } from "@/lib/practice/catalogFilters";

type Tab = "ALL" | GrammarCategory;

/**
 * Grammar catalog: category tabs, one section per part of grammar with its
 * real topic and question counts, and a random pick that opens a real topic.
 * Topics keep the API's authored order inside each section.
 */
export function GrammarCatalog({
  topics,
  searchTerm,
  onStart,
}: {
  topics: GrammarTopicSummary[];
  searchTerm: string;
  onStart: (topic: GrammarTopicSummary) => void;
}) {
  const [tab, setTab] = useState<Tab>("ALL");

  const visible = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return topics.filter((topic) => {
      if (tab !== "ALL" && grammarCategory(topic.id, topic.title) !== tab) return false;
      if (!q) return true;
      return [
        grammarDisplayTitle(topic.id, topic.title),
        topic.title,
        topic.description ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [topics, tab, searchTerm]);

  const paging = useCatalogPage(visible, `${tab}|${searchTerm}`);
  const sections = useMemo(() => groupGrammarTopics(paging.items), [paging.items]);
  const countByTab = useMemo(() => {
    const counts: Record<Tab, number> = {
      ALL: topics.length,
      TENSE: 0,
      WORD_CLASS: 0,
      VERB: 0,
      OTHER: 0,
    };
    for (const topic of topics) counts[grammarCategory(topic.id, topic.title)] += 1;
    return counts;
  }, [topics]);

  const startRandom = () => {
    const topic = pickRandomGrammarTopic(visible, Math.random);
    if (topic) onStart(topic);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Phân loại ngữ pháp"
        >
          {(["ALL", ...GRAMMAR_CATEGORY_ORDER] as Tab[]).map((id) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setTab(id)}
                className={`min-h-9 rounded-lg px-3.5 py-1.5 text-sm transition cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white font-semibold border border-blue-600"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {id === "ALL" ? "Tất cả" : GRAMMAR_CATEGORY_LABEL[id]}{" "}
                <span className={isActive ? "text-blue-100" : "text-slate-600 dark:text-slate-400"}>
                  ({countByTab[id]})
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={startRandom}
            aria-describedby="grammar-random-hint"
            disabled={visible.length === 0}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <Shuffle size={16} strokeWidth={2} aria-hidden="true" />
            Luyện ngẫu nhiên
          </button>
          <p
            id="grammar-random-hint"
            className="text-xs text-slate-600 dark:text-slate-400"
          >
            Mở một chủ đề ngẫu nhiên trong mục đang xem, ưu tiên chủ đề chưa
            xong.
          </p>
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-600 dark:text-slate-400">
          Không có chủ đề ngữ pháp phù hợp với từ khóa này.
        </p>
      ) : (
        sections.map((section) => (
          <section
            key={section.category}
            aria-labelledby={`grammar-${section.category}`}
            className="space-y-3"
          >
            <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
              <h2
                id={`grammar-${section.category}`}
                className="text-lg font-bold text-slate-900 dark:text-slate-100"
              >
                {GRAMMAR_CATEGORY_LABEL[section.category]}
              </h2>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {section.topics.length} chủ đề · {section.questionCount} câu hỏi
              </span>
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {section.topics.map((topic) => {
                const status = grammarTopicStatus(topic);
                const done = status === "COMPLETED";
                const title = grammarDisplayTitle(topic.id, topic.title);
                return (
                  <article
                    key={topic.id}
                    // Completed: emerald border, ground and pill, like the listening card (owner 2026-11-13).
                    className={`flex flex-col justify-between rounded-xl border border-t-4 p-4 shadow-sm ${
                      done
                        ? "border-emerald-300 border-t-emerald-500 bg-emerald-50/50 dark:border-emerald-800/70 dark:border-t-emerald-600 dark:bg-emerald-950/20"
                        : "border-slate-200 border-t-blue-500 bg-white dark:border-slate-800 dark:bg-slate-900"
                    }`}
                  >
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {title}
                      </h3>
                      <p
                        className="mt-0.5 text-xs text-slate-600 dark:text-slate-400"
                        lang="en"
                      >
                        {topic.title}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      {done ? (
                        <span className="flex min-w-0 items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300">
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                            <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
                            {STATUS_LABEL[status]}
                          </span>
                          <span className="truncate">{topic.totalQuestions} câu hỏi</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <span>{STATUS_LABEL[status]}</span>
                          <span aria-hidden="true">·</span>
                          <span>{topic.totalQuestions} câu hỏi</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onStart(topic)}
                        aria-label={`${done ? "Ôn lại" : "Học ngay"} chủ đề ${title}`}
                        className={`inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-3 text-sm font-semibold transition-colors cursor-pointer ${
                          done
                            ? "border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                            : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
                        }`}
                      >
                        {done ? "Ôn lại" : "Học ngay"}
                        <ArrowRight
                          size={14}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
      {sections.length > 0 && <CatalogPagination paging={paging} />}
    </div>
  );
}
