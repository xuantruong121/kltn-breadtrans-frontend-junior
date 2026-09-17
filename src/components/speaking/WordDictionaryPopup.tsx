"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BookOpen, Loader2, Star, Volume2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  DictionaryEntry,
  VocabLookupResponse,
  vocabService,
} from "@/lib/api/services/vocab.service";

interface WordDictionaryPopupProps {
  word: string;
  onClose: () => void;
  onPracticeWord?: (word: string) => void;
}

const POS_LABELS: Record<string, string> = {
  adjective: "Tính từ",
  adverb: "Trạng từ",
  conjunction: "Liên từ",
  determiner: "Từ hạn định",
  interjection: "Thán từ",
  noun: "Danh từ",
  number: "Số từ",
  preposition: "Giới từ",
  pronoun: "Đại từ",
  verb: "Động từ",
  "modal verb": "Động từ khuyết thiếu",
};

const normalizeEntries = (response: VocabLookupResponse): DictionaryEntry[] => {
  if (response.entries?.length) return response.entries;
  return (response.matches || []).map((match) => ({
    word: match.word,
    partOfSpeech: match.pos || null,
    ipaUs: match.ipaUs || null,
    ipaUk: match.ipaUk || null,
    meaningVi: match.meaning || null,
    definitions: [],
    examples: match.exampleEn ? [match.exampleEn] : [],
    collocations: match.collocations || [],
    synonyms: [],
    antonyms: [],
    audio: { us: match.audioUs || null, uk: match.audioUk || null },
    exampleVi: match.exampleVi || null,
  }));
};

const mergeEntries = (
  localEntries: DictionaryEntry[],
  expandedEntries: DictionaryEntry[],
): DictionaryEntry[] => {
  if (!expandedEntries.length) return localEntries;
  const merged = expandedEntries.map((entry) => {
    const local = localEntries.find(
      (candidate) =>
        candidate.partOfSpeech?.toLowerCase() ===
        entry.partOfSpeech?.toLowerCase(),
    );
    return {
      ...entry,
      meaningVi: entry.meaningVi || local?.meaningVi || null,
      exampleVi: entry.exampleVi || local?.exampleVi || null,
      collocations: entry.collocations?.length
        ? entry.collocations
        : local?.collocations || [],
    };
  });
  const expandedPos = new Set(
    expandedEntries.map((entry) => entry.partOfSpeech?.toLowerCase() || ""),
  );
  return [
    ...merged,
    ...localEntries.filter(
      (entry) => !expandedPos.has(entry.partOfSpeech?.toLowerCase() || ""),
    ),
  ];
};

export const WordDictionaryPopup: React.FC<WordDictionaryPopupProps> = ({
  word,
  onClose,
  onPracticeWord,
}) => {
  const cleanWord = useMemo(
    () =>
      word
        .trim()
        .replace(/[’‘ʼ]/g, "'")
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""),
    [word],
  );
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canonicalWord, setCanonicalWord] = useState(cleanWord);
  const [isInflectionMatch, setIsInflectionMatch] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [starLoading, setStarLoading] = useState(false);
  const [playingAccent, setPlayingAccent] = useState<"US" | "UK" | null>(null);
  const [hasExpandedDetails, setHasExpandedDetails] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const selectedEntry = entries[selectedIndex] || entries[0];

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setEnriching(false);
      setEntries([]);
      setSelectedIndex(0);
      setHasExpandedDetails(false);
      try {
        const base = await vocabService.lookupWord(
          cleanWord,
          controller.signal,
        );
        if (!mounted) return;
        const baseEntries = normalizeEntries(base);
        setEntries(baseEntries);
        setCanonicalWord(base.canonicalWord || cleanWord);
        setIsInflectionMatch(base.isInflectionMatch);
        setIsStarred(Boolean(base.saved));
        setSavedId(base.savedId ?? null);
        setLoading(false);

        if (base.source !== "LOCAL") {
          setHasExpandedDetails(baseEntries.length > 0);
          return;
        }

        setEnriching(true);
        try {
          const details = await vocabService.lookupWordDetails(
            cleanWord,
            controller.signal,
          );
          if (!mounted) return;
          const expandedEntries = normalizeEntries(details);
          setEntries((current) => mergeEntries(current, expandedEntries));
          setHasExpandedDetails(expandedEntries.length > 0);
        } finally {
          if (mounted) setEnriching(false);
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        if (mounted) {
          setLoading(false);
          setEnriching(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
      controller.abort();
      window.speechSynthesis?.cancel();
    };
  }, [cleanWord]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, []);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !modalRef.current) return;
    const focusable = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleToggleStar = async () => {
    if (!canonicalWord) return;
    setStarLoading(true);
    try {
      if (isStarred) {
        if (savedId) await vocabService.removeSavedWord(savedId);
        setSavedId(null);
      } else {
        const saved = await vocabService.saveWord(canonicalWord);
        setSavedId(saved.id);
      }
      setIsStarred((current) => !current);
      toast.success(isStarred ? "Đã bỏ lưu từ vựng." : "Đã lưu để ôn tập.");
    } catch {
      toast.error("Không thể cập nhật từ đã lưu");
    } finally {
      setStarLoading(false);
    }
  };

  const handlePlayAudio = (accent: "US" | "UK") => {
    if (!selectedEntry) return;
    const url =
      accent === "US" ? selectedEntry.audio.us : selectedEntry.audio.uk;
    setPlayingAccent(accent);
    if (url) {
      const audio = new Audio(url.startsWith("//") ? `https:${url}` : url);
      audio.onended = () => setPlayingAccent(null);
      audio.onerror = () => setPlayingAccent(null);
      void audio.play().catch(() => setPlayingAccent(null));
      return;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(canonicalWord);
      utterance.lang = accent === "US" ? "en-US" : "en-GB";
      utterance.onend = () => setPlayingAccent(null);
      utterance.onerror = () => setPlayingAccent(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setPlayingAccent(null);
    }
  };

  const definitions = hasExpandedDetails
    ? selectedEntry?.definitions
        .filter((item) => item.definition)
        .slice(0, 3) || []
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-2 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dictionary-title"
        aria-describedby="dictionary-status"
        onKeyDown={handleDialogKeyDown}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[min(90dvh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-slate-800">
            <BookOpen className="size-5 text-amber-600" aria-hidden="true" />
            <h2 id="dictionary-title" className="text-base font-semibold">
              Tra cứu từ vựng
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng tra cứu"
            className="flex size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {loading ? (
            <div
              id="dictionary-status"
              role="status"
              className="flex min-h-64 flex-col items-center justify-center text-slate-600"
            >
              <Loader2 className="size-8 animate-spin text-amber-600 motion-reduce:animate-none" />
              <p className="mt-3 text-sm">Đang tra cứu “{cleanWord}”…</p>
            </div>
          ) : !selectedEntry ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <AlertCircle
                className="size-10 text-slate-400"
                aria-hidden="true"
              />
              <p className="mt-3 text-base font-semibold text-slate-800">
                Chưa tìm thấy “{cleanWord}”
              </p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                Nguồn từ điển đang tạm thời chưa có dữ liệu cho từ này.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <section className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-3xl font-bold capitalize tracking-tight text-slate-950">
                      {canonicalWord}
                    </h3>
                    {isInflectionMatch && (
                      <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                        Dạng gốc
                      </span>
                    )}
                  </div>
                  {isInflectionMatch && (
                    <p className="mt-1 text-sm text-slate-500">
                      Dạng trong câu: <strong>{cleanWord}</strong>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleToggleStar}
                  disabled={starLoading}
                  aria-label={isStarred ? "Bỏ lưu từ vựng" : "Lưu từ vựng"}
                  aria-pressed={isStarred}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
                    isStarred
                      ? "border-amber-300 bg-amber-50 text-amber-600"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {starLoading ? (
                    <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Star
                      className={`size-5 ${isStarred ? "fill-current" : ""}`}
                    />
                  )}
                </button>
              </section>

              <section
                aria-label="Phiên âm và phát âm"
                className="grid gap-2 sm:grid-cols-2"
              >
                {(["US", "UK"] as const).map((accent) => {
                  const ipa =
                    accent === "US" ? selectedEntry.ipaUs : selectedEntry.ipaUk;
                  return (
                    <button
                      key={accent}
                      type="button"
                      onClick={() => handlePlayAudio(accent)}
                      disabled={playingAccent !== null}
                      className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-3 text-left hover:border-amber-300 hover:bg-amber-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <Volume2
                        className={`size-4 shrink-0 ${
                          playingAccent === accent
                            ? "animate-pulse text-amber-600 motion-reduce:animate-none"
                            : "text-slate-500"
                        }`}
                        aria-hidden="true"
                      />
                      <span>
                        <span className="block text-xs font-semibold text-slate-500">
                          {accent === "US" ? "Giọng Mỹ" : "Giọng Anh"}
                        </span>
                        <span className="block text-sm font-medium text-slate-800">
                          {ipa || "Chưa có phiên âm IPA"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </section>

              {entries.length > 1 && (
                <section aria-label="Chọn loại từ">
                  <p className="mb-2 text-sm font-semibold text-slate-700">
                    Loại từ và nghĩa
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {entries.map((entry, index) => (
                      <button
                        key={`${entry.partOfSpeech || "unknown"}-${index}`}
                        type="button"
                        onClick={() => setSelectedIndex(index)}
                        aria-pressed={selectedIndex === index}
                        className={`min-h-11 shrink-0 rounded-xl border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                          selectedIndex === index
                            ? "border-amber-500 bg-amber-50 text-amber-800"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {POS_LABELS[entry.partOfSpeech?.toLowerCase() || ""] ||
                          entry.partOfSpeech ||
                          "Nghĩa khác"}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Nghĩa tiếng Việt
                  </p>
                  {selectedEntry.partOfSpeech && (
                    <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-semibold text-slate-600">
                      {POS_LABELS[selectedEntry.partOfSpeech.toLowerCase()] ||
                        selectedEntry.partOfSpeech}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-base font-semibold leading-7 text-slate-900">
                  {selectedEntry.meaningVi ||
                    "Nghĩa tiếng Việt đang được bổ sung."}
                </p>
              </section>

              {definitions.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Các cách dùng phổ biến
                  </h4>
                  <ol className="mt-2 space-y-3">
                    {definitions.map((definition, index) => (
                      <li
                        key={`${definition.definition}-${index}`}
                        className="rounded-xl border border-slate-200 p-3"
                      >
                        <div className="flex gap-3">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                            {index + 1}
                          </span>
                          <div className="min-w-0 text-sm leading-6">
                            {definition.meaningVi &&
                              definition.meaningVi !==
                                selectedEntry.meaningVi && (
                                <p className="font-semibold text-slate-900">
                                  {definition.meaningVi}
                                </p>
                              )}
                            <p className="text-slate-600">
                              {definition.definition}
                            </p>
                            {definition.example && (
                              <p className="mt-1 italic text-slate-500">
                                “{definition.example}”
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {!hasExpandedDetails && selectedEntry.examples[0] && (
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ví dụ trong bài luyện
                  </p>
                  <p className="mt-2 text-sm italic leading-6 text-slate-700">
                    “{selectedEntry.examples[0]}”
                  </p>
                  {selectedEntry.exampleVi && (
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {selectedEntry.exampleVi}
                    </p>
                  )}
                </section>
              )}

              {!!selectedEntry.collocations?.length && (
                <section>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Cụm từ thường gặp
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedEntry.collocations.slice(0, 5).map((item) => (
                      <span
                        key={item.phrase}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900"
                      >
                        <strong>{item.phrase}</strong>
                        {item.meaningVi ? ` — ${item.meaningVi}` : ""}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {(selectedEntry.synonyms.length > 0 ||
                selectedEntry.antonyms.length > 0) && (
                <section className="grid gap-3 sm:grid-cols-2">
                  {selectedEntry.synonyms.length > 0 && (
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs font-semibold text-slate-500">
                        Từ đồng nghĩa
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {selectedEntry.synonyms.slice(0, 6).join(", ")}
                      </p>
                    </div>
                  )}
                  {selectedEntry.antonyms.length > 0 && (
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs font-semibold text-slate-500">
                        Từ trái nghĩa
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {selectedEntry.antonyms.slice(0, 6).join(", ")}
                      </p>
                    </div>
                  )}
                </section>
              )}

              <div
                id="dictionary-status"
                role="status"
                aria-live="polite"
                className="min-h-5 text-sm text-slate-500"
              >
                {enriching && (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    Đang bổ sung IPA và các nghĩa khác…
                  </span>
                )}
              </div>
            </div>
          )}
        </main>

        {selectedEntry && onPracticeWord && (
          <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => {
                onPracticeWord(canonicalWord);
                onClose();
              }}
              className="min-h-11 w-full rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              Luyện phát âm từ này
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};
