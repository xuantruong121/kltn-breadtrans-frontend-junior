"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, Star, Trash2 } from "lucide-react";
import { vocabService, VocabWord } from "@/lib/api/services/vocab.service";
import { BackButton } from "@/components/ui";

export default function SavedVocabularyPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data: words = [], isLoading, isError } = useQuery({
    queryKey: ["vocab-saved"],
    queryFn: vocabService.getSavedWords,
  });
  const removeMutation = useMutation({
    mutationFn: vocabService.removeSavedWord,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vocab-saved"] }),
  });
  const filtered = useMemo(
    () => words.filter((word) => word.word.toLowerCase().includes(search.trim().toLowerCase())),
    [words, search],
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <BackButton href="/flashcard" label="Quay lại Flashcard & Từ vựng" />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Từ vựng cá nhân</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Từ đã lưu</h1>
          <p className="mt-2 text-sm text-slate-500">Các từ bạn lưu để xem lại nhanh. Lưu từ không tự đánh dấu đã học.</p>
        </div>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm">
          <Search className="h-4 w-4" />
          <input aria-label="Tìm từ đã lưu" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm từ..." className="w-full bg-transparent outline-none sm:w-48" />
        </label>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : isError ? (
          <p className="py-12 text-center text-sm text-rose-600">Không thể tải danh sách từ đã lưu.</p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Chưa có từ nào phù hợp.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((word: VocabWord & { id: number }) => (
              <article key={word.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{word.word}</h2>
                    <p className="text-xs text-slate-500">{word.pos || "Từ vựng"}</p>
                  </div>
                  <button type="button" onClick={() => removeMutation.mutate(word.id)} disabled={removeMutation.isPending} aria-label={`Xóa ${word.word}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"><Trash2 className="h-4 w-4" /></button>
                </div>
                <p className="mt-3 text-sm text-slate-700">{word.meaning}</p>
                {word.exampleEn && <p className="mt-2 text-xs italic text-slate-500">“{word.exampleEn}”</p>}
                <div className="mt-3 flex items-center gap-2 text-amber-500"><Star className="h-4 w-4 fill-current" /><span className="text-xs text-slate-500">Đã lưu cá nhân</span></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
