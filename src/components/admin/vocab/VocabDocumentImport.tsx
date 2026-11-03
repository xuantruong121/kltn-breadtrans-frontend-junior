"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import DocumentImportButton from "@/components/admin/DocumentImportButton";
import { BTN_AI, BTN_PRIMARY, BTN_SECONDARY } from "@/components/admin/cmsButtons";
import {
  chosenWordCount,
  decksToCreate,
  toReviewDecks,
  type ReviewDeck,
} from "./vocabDocumentReview";

const unwrap = <T,>(value: any): T => (value?.data ?? value) as T;

/** Document to draft decks: the AI suggests, the admin picks, nothing is published. */
export default function VocabDocumentImport({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [decks, setDecks] = useState<ReviewDeck[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const total = decks ? chosenWordCount(decks) : 0;

  const suggest = async () => {
    setBusy(true);
    try {
      const data = unwrap<{ decks: Parameters<typeof toReviewDecks>[0] }>(
        await axiosClient.post("/admin/vocab/ai/from-document", { text }),
      );
      if (!data.decks?.length) {
        toast.error("AI không tìm được từ vựng phù hợp trong tài liệu.");
        return;
      }
      setDecks(toReviewDecks(data.decks));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể tạo gợi ý lúc này."));
    } finally {
      setBusy(false);
    }
  };

  const update = (index: number, change: (deck: ReviewDeck) => ReviewDeck) =>
    setDecks((current) =>
      (current ?? []).map((deck, i) => (i === index ? change(deck) : deck)),
    );

  const create = async () => {
    const chosen = decksToCreate(decks ?? []);
    setBusy(true);
    let done = 0;
    try {
      for (const deck of chosen) {
        const created = unwrap<{ id: number }>(
          await axiosClient.post("/admin/vocab/topics", {
            title: deck.title.trim(),
            description: deck.description.trim(),
            categoryName: "Từ tài liệu",
            isPro: false,
          }),
        );
        for (const word of deck.words) {
          setProgress(`${deck.title}: ${word.word}`);
          await axiosClient.post(`/admin/vocab/topics/${created.id}/words`, {
            word: word.word,
            meaning: word.meaning,
            pos: word.pos || "noun",
            exampleEn: word.exampleEn || undefined,
            exampleVi: word.exampleVi || undefined,
          });
        }
        done += 1;
      }
      toast.success(`Đã tạo ${done} bộ từ ở trạng thái nháp.`);
      queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });
      onClose();
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });
      toast.error(
        getApiErrorMessage(
          error,
          `Dừng lại sau khi tạo ${done} bộ từ. Hãy kiểm tra danh sách.`,
        ),
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="vocab-document-title"
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2
            id="vocab-document-title"
            className="text-base font-semibold text-slate-950"
          >
            Tạo bộ từ từ tài liệu
          </h2>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!decks ? (
            <>
              <p className="text-sm text-slate-600">
                Tải tài liệu lên, AI sẽ chia từ vựng theo chủ đề. Bạn chọn lại
                trước khi tạo; các bộ từ đều ở trạng thái nháp.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <DocumentImportButton onText={setText} disabled={busy} />
                <button
                  type="button"
                  disabled={busy || !text}
                  onClick={() => void suggest()}
                  className={BTN_AI}
                >
                  {busy && <Loader2 size={15} className="animate-spin" />}
                  Gợi ý các bộ từ
                </button>
              </div>
            </>
          ) : (
            decks.map((deck, deckIndex) => (
              <div
                key={deckIndex}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label={`Chọn bộ ${deck.title}`}
                    checked={deck.chosen}
                    onChange={(event) =>
                      update(deckIndex, (row) => ({
                        ...row,
                        chosen: event.target.checked,
                      }))
                    }
                  />
                  <input
                    aria-label="Tên bộ từ"
                    value={deck.title}
                    onChange={(event) =>
                      update(deckIndex, (row) => ({
                        ...row,
                        title: event.target.value,
                      }))
                    }
                    className="min-h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900"
                  />
                </div>
                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                  {deck.words.map((word, wordIndex) => (
                    <li key={word.word}>
                      <label className="flex items-start gap-2 rounded-lg p-1.5 text-sm hover:bg-slate-50">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={word.chosen}
                          onChange={(event) =>
                            update(deckIndex, (row) => ({
                              ...row,
                              words: row.words.map((item, i) =>
                                i === wordIndex
                                  ? { ...item, chosen: event.target.checked }
                                  : item,
                              ),
                            }))
                          }
                        />
                        <span className="min-w-0">
                          <span className="font-semibold text-slate-900">
                            {word.word}
                          </span>{" "}
                          <span className="text-slate-500">({word.pos})</span>
                          {word.known && (
                            <span className="ml-1 rounded bg-slate-100 px-1.5 text-xs text-slate-600">
                              Có trong từ điển
                            </span>
                          )}
                          <span className="block text-slate-600">
                            {word.meaning}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        {decks && (
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 p-4">
            <p className="text-sm text-slate-600">
              {progress || `${total} từ sẽ được tạo`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDecks(null)}
                className={BTN_SECONDARY}
              >
                Chọn tài liệu khác
              </button>
              <button
                type="button"
                disabled={busy || total === 0}
                onClick={() => void create()}
                className={BTN_PRIMARY}
              >
                {busy && <Loader2 size={15} className="animate-spin" />}
                Tạo bản nháp
              </button>
            </div>
          </footer>
        )}
      </section>
    </div>
  );
}
