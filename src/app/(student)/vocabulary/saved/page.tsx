"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Layers, Loader2, Search, Trash2, Volume2 } from "lucide-react";

import { BackButton } from "@/components/ui";
import type { SavedWord } from "@/lib/api/services/vocab.service";
import { filterSavedWords, sortSavedWords, type SavedWordSort } from "@/lib/vocab/savedWords";
import { SavedWordReview } from "@/modules/vocab/components/SavedWordReview";
import { useSavedWords } from "@/modules/vocab/hooks/useSavedWords";
import { playWordAudio } from "@/modules/vocab/utils/audio";

const ipa = (value?: string | null) => (value ? `/${value.replace(/^\/|\/$/g, "")}/` : null);
const savedDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

/**
 * The learner's saved words as a short dictionary list (owner 2026-11-16):
 * listen, read the meaning and an example, search by word or meaning, remove
 * with an undo, and review them as flip cards.
 */
export default function SavedVocabularyPage() {
  const { words, isLoading, isError, refetch, save, remove } = useSavedWords();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SavedWordSort>("newest");
  const [reviewing, setReviewing] = useState(false);
  const shown = useMemo(() => sortSavedWords(filterSavedWords(words, search), sort), [words, search, sort]);

  const handleRemove = async (word: SavedWord) => {
    try {
      await remove(word.id);
    } catch {
      toast.error("Không xoá được từ này. Hãy thử lại.");
      return;
    }
    toast(
      (t) => (
        <span className="flex items-center gap-3 text-sm">
          Đã xoá «{word.word}»
          <button
            type="button"
            className="cursor-pointer font-semibold text-amber-700 hover:underline dark:text-amber-400"
            onClick={() => {
              toast.dismiss(t.id);
              save(word.word).catch(() => toast.error("Không lưu lại được từ này."));
            }}
          >
            Hoàn tác
          </button>
        </span>
      ),
      { duration: 6000 },
    );
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <BackButton href="/flashcard" label="Quay lại Flashcard & Từ vựng" />

      <header className="mt-6 flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Từ đã lưu
            {words.length > 0 && <span className="ml-2 text-base font-normal text-slate-600 dark:text-slate-400">{words.length} từ</span>}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Lưu từ khi tra trong bài nghe, nói, đọc hoặc trên thẻ Flashcard. Lưu từ không đánh dấu từ đó là đã học.
          </p>
        </div>
        {!reviewing && (
          <button
            type="button"
            onClick={() => setReviewing(true)}
            disabled={words.length === 0}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Layers size={16} aria-hidden="true" /> Ôn từ đã lưu
          </button>
        )}
      </header>

      {reviewing && words.length > 0 ? (
        <SavedWordReview words={words} onExit={() => setReviewing(false)} />
      ) : isLoading ? (
        <div className="flex min-h-48 items-center justify-center text-slate-600 dark:text-slate-400">
          <Loader2 className="size-6 animate-spin" aria-label="Đang tải" />
        </div>
      ) : isError ? (
        <div className="mt-6 rounded-xl border border-slate-200 p-8 text-center dark:border-slate-800">
          <p className="text-sm text-rose-700 dark:text-rose-400">Không tải được danh sách từ đã lưu.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Thử lại
          </button>
        </div>
      ) : words.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
          <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">Bạn chưa lưu từ nào.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
            Bấm biểu tượng dấu lưu khi tra từ trong bài nghe, nói, đọc, hoặc trên thẻ Flashcard khi học một bộ từ.
          </p>
          <Link
            href="/flashcard"
            className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Mở Flashcard
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex min-h-11 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm focus-within:ring-2 focus-within:ring-amber-500 dark:border-slate-700 dark:bg-slate-900 sm:max-w-sm">
              <Search className="size-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <input
                aria-label="Tìm theo từ hoặc nghĩa"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo từ hoặc nghĩa"
                className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              Sắp xếp
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SavedWordSort)}
                className="min-h-11 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="newest">Mới lưu nhất</option>
                <option value="az">A–Z</option>
              </select>
            </label>
          </div>

          {shown.length === 0 ? (
            <p className="mt-6 rounded-xl border border-slate-200 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
              Không có từ nào khớp «{search.trim()}».
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {shown.map((word) => (
                <li key={word.id} className="grid gap-x-6 gap-y-2 p-4 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto] sm:p-5">
                  <div className="min-w-0">
                    <p className="break-words text-lg font-semibold text-slate-900 dark:text-slate-100">{word.word}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      {ipa(word.ipaUs) && <span className="font-mono text-slate-600 dark:text-slate-400">{ipa(word.ipaUs)}</span>}
                      <span className="flex items-center gap-1">
                        {(["us", "uk"] as const).map((accent) => (
                          <button
                            key={accent}
                            type="button"
                            onClick={() =>
                              void playWordAudio(
                                word.canonicalWord || word.word,
                                (accent === "us" ? word.audioUs : word.audioUk) ?? undefined,
                                accent,
                              )
                            }
                            aria-label={`Nghe ${word.word} giọng ${accent === "us" ? "Mỹ" : "Anh"}`}
                            className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Volume2 size={13} aria-hidden="true" />
                            {accent.toUpperCase()}
                          </button>
                        ))}
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[15px] text-slate-900 dark:text-slate-100">
                      {word.pos && word.pos !== "unknown" && (
                        <span className="mr-2 text-sm italic text-slate-600 dark:text-slate-400">{word.pos}</span>
                      )}
                      {word.meaning || "Chưa có nghĩa"}
                    </p>
                    {word.exampleEn && <p className="mt-1.5 text-sm italic text-slate-700 dark:text-slate-300">{word.exampleEn}</p>}
                    {word.exampleVi && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{word.exampleVi}</p>}
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Lưu {savedDate(word.savedAt)}</span>
                    <button
                      type="button"
                      onClick={() => void handleRemove(word)}
                      aria-label={`Xoá ${word.word} khỏi Từ đã lưu`}
                      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
