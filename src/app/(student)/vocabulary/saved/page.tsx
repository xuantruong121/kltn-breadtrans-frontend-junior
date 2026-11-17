"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Bookmark, ChevronRight, Layers, Loader2, Search, Trash2, Volume2 } from "lucide-react";

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
      <nav aria-label="Đường dẫn" className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
        <Link href="/flashcard" className="hover:text-slate-950 hover:underline dark:hover:text-slate-100">
          Flashcard
        </Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page" className="text-slate-900 dark:text-slate-100">Từ đã lưu</span>
      </nav>

      <header className="mt-3 flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Từ đã lưu
          {words.length > 0 && <span className="ml-2 text-base font-normal text-slate-600 dark:text-slate-400">{words.length} từ</span>}
        </h1>
        {/* Only when there is something to review (owner 2026-11-17: no faded buttons). */}
        {!reviewing && words.length > 0 && (
          <button
            type="button"
            onClick={() => setReviewing(true)}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
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
        <p className="mt-6 text-[15px] text-slate-700 dark:text-slate-300">
          <span className="text-rose-700 dark:text-rose-400">Không tải được danh sách từ đã lưu.</span>{" "}
          <button type="button" onClick={() => void refetch()} className="cursor-pointer font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300">
            Thử lại
          </button>
        </p>
      ) : words.length === 0 ? (
        <div className="mt-6 max-w-2xl text-[15px] leading-7 text-slate-700 dark:text-slate-300">
          <p>Chưa có từ nào. Từ bạn lưu sẽ hiện ở đây, kèm phiên âm, nghĩa và câu ví dụ.</p>
          <p className="mt-4 font-semibold text-slate-900 dark:text-slate-100">Hai cách lưu từ:</p>
          <ul className="mt-2 space-y-3">
            <li className="flex gap-3">
              <Bookmark size={18} strokeWidth={2} aria-hidden="true" className="mt-1 shrink-0 text-amber-700 dark:text-amber-400" />
              <span>
                Khi tra từ trong bài <SavedLink href="/listening">Nghe</SavedLink>,{" "}
                <SavedLink href="/reading">Đọc</SavedLink> hoặc <SavedLink href="/speaking">Nói</SavedLink>: bấm nút
                lưu ở góc hộp tra từ.
              </span>
            </li>
            <li className="flex gap-3">
              <Bookmark size={18} strokeWidth={2} aria-hidden="true" className="mt-1 shrink-0 text-amber-700 dark:text-amber-400" />
              <span>
                Khi học một bộ từ trong <SavedLink href="/flashcard">Flashcard</SavedLink>: bấm &quot;Lưu từ&quot; trên thẻ.
              </span>
            </li>
          </ul>
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
            <p className="mt-5 text-[15px] text-slate-700 dark:text-slate-300">
              Không có từ nào khớp «{search.trim()}».{" "}
              <button type="button" onClick={() => setSearch("")} className="cursor-pointer font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300">
                Xoá ô tìm
              </button>
            </p>
          ) : (
            <>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div
                aria-hidden="true"
                className="hidden grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto] gap-x-6 border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400 sm:grid"
              >
                <span>Từ</span>
                <span>Nghĩa và ví dụ</span>
                <span className="text-right">Ngày lưu</span>
              </div>
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
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
                    <span className="text-xs text-slate-600 dark:text-slate-400"><span className="sm:hidden">Lưu </span>{savedDate(word.savedAt)}</span>
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
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Lưu từ không đánh dấu từ đó là đã học trong Flashcard.
            </p>
            </>
          )}
        </>
      )}
    </div>
  );
}

function SavedLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300">
      {children}
    </Link>
  );
}
