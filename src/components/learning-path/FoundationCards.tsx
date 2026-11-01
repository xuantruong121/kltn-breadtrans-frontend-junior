"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, BookOpenText, Clock, Layers, RefreshCw } from "lucide-react";

import { grammarDisplayTitle } from "@/lib/catalog/displayTitles";
import type { FoundationItem } from "@/lib/learning-path/recommendation";

const KIND = {
  VOCAB_REVIEW: { label: "Ôn từ vựng", Icon: RefreshCw },
  READING_REVIEW: { label: "Ôn bài Đọc", Icon: BookOpen },
  GRAMMAR: { label: "Ngữ pháp", Icon: BookOpenText },
  VOCAB_DECK: { label: "Từ vựng", Icon: Layers },
};

function displayTitle(item: FoundationItem) {
  return item.kind === "GRAMMAR" && item.id !== null ? grammarDisplayTitle(item.id, item.title) : item.title;
}

/** Vocabulary and grammar suggestions: due words, topics not passed, decks not learned. */
export function FoundationCards({ items }: { items: FoundationItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const { label, Icon } = KIND[item.kind];
        return (
          <article
            key={`${item.kind}:${item.id ?? "due"}`}
            className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
          >
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 dark:text-blue-300">
                <Icon size={16} aria-hidden="true" />
                {label}
              </p>
              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">{displayTitle(item)}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{item.reason}</p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                <Clock size={15} aria-hidden="true" />~{item.minutes} phút
              </span>
              <Link
                href={item.route}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                Học ngay
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
