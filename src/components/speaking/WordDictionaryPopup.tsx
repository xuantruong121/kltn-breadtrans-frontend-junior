"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Loader2,
  Star,
  Volume2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
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

const POS_EN_LABELS: Record<string, string> = {
  adjective: "Adjective",
  adverb: "Adverb",
  conjunction: "Conjunction",
  determiner: "Determiner",
  interjection: "Interjection",
  noun: "Noun",
  number: "Number",
  preposition: "Preposition",
  pronoun: "Pronoun",
  verb: "Verb",
  "modal verb": "Modal verb",
};

const formatPartOfSpeech = (partOfSpeech: string | null) => {
  if (!partOfSpeech) return "Từ vựng";
  const key = partOfSpeech.toLowerCase();
  const vi = POS_LABELS[key] || partOfSpeech;
  const en = POS_EN_LABELS[key];
  return en ? `${vi} (${en})` : vi;
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
      word: local?.word || entry.word,
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

const highlightTargetWord = (
  text: string,
  targets: Array<string | undefined | null>,
): React.ReactNode => {
  if (!text) return text;

  const validTargets = Array.from(
    new Set(
      targets
        .map((t) => t?.trim())
        .filter((t): t is string => Boolean(t && t.length > 0)),
    ),
  );

  if (validTargets.length === 0) return text;

  const allVariants = new Set<string>();
  for (const target of validTargets) {
    allVariants.add(target);
    const lower = target.toLowerCase();
    // Only generate morphological inflections for single words with length >= 3
    if (!lower.includes(" ") && lower.length >= 3) {
      allVariants.add(`${lower}s`);
      allVariants.add(`${lower}es`);
      if (lower.endsWith("e")) {
        allVariants.add(`${lower}d`);
        allVariants.add(`${lower.slice(0, -1)}ing`);
      } else {
        allVariants.add(`${lower}ed`);
        allVariants.add(`${lower}ing`);
      }
      if (lower.endsWith("y") && lower.length > 2) {
        const stem = lower.slice(0, -1);
        allVariants.add(`${stem}ies`);
        allVariants.add(`${stem}ied`);
      }
      if (
        /^[a-z]+[^aeiou][aeiou][^aeiouwxy]$/.test(lower) &&
        lower.length >= 3
      ) {
        const lastChar = lower[lower.length - 1];
        allVariants.add(`${lower}${lastChar}ed`);
        allVariants.add(`${lower}${lastChar}ing`);
      }
    }
  }

  const sorted = Array.from(allVariants).sort((a, b) => b.length - a.length);
  const escaped = sorted.map((item) =>
    item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );

  const regex = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <mark
        key={`${match.index}-${match[0]}`}
        className="not-italic font-bold text-amber-950 bg-amber-200/90 px-2 py-0.5 rounded-md border border-amber-300/80 shadow-2xs"
      >
        {match[0]}
      </mark>,
    );
    lastIndex = regex.lastIndex;
    if (match[0].length === 0) {
      regex.lastIndex++;
    }
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

const resolveEntryWord = (
  entry: DictionaryEntry,
  canonical: string,
  searched: string,
): { displayWord: string; isVariant: boolean } => {
  const canonLower = canonical.trim().toLowerCase();
  const searchedLower = searched.trim().toLowerCase();

  // 1. If entry.word is explicitly defined and differs from canonicalWord
  if (entry.word && entry.word.trim().toLowerCase() !== canonLower) {
    return { displayWord: entry.word.trim(), isVariant: true };
  }

  // 2. If user searched an inflection (e.g. "updated") and this entry's examples use it
  if (searchedLower !== canonLower) {
    const escaped = searchedLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const inExample = entry.examples?.some((ex) =>
      new RegExp(`\\b${escaped}\\b`, "i").test(ex),
    );
    if (inExample) {
      return { displayWord: searched.trim(), isVariant: true };
    }
  }

  // 3. Check if example sentence has an inflected form starting with canon stem
  if (entry.examples?.[0]) {
    const escapedStem = canonLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = new RegExp(`\\b(${escapedStem}[a-zA-Z]+)\\b`, "i").exec(
      entry.examples[0],
    );
    if (m && m[1].toLowerCase() !== canonLower) {
      return { displayWord: m[1], isVariant: true };
    }
  }

  // 4. Default to entry.word or canonicalWord
  return {
    displayWord: entry.word?.trim() || canonical,
    isVariant: false,
  };
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

  // Primary entry used for top-level phonetics & audio
  const primaryEntry = entries[0];

  // Aggregate all collocations across entries
  const allCollocations = useMemo(() => {
    const map = new Map<string, { phrase: string; meaningVi: string }>();
    for (const entry of entries) {
      for (const col of entry.collocations || []) {
        if (col.phrase && !map.has(col.phrase.toLowerCase())) {
          map.set(col.phrase.toLowerCase(), col);
        }
      }
    }
    return Array.from(map.values()).slice(0, 6);
  }, [entries]);

  // Aggregate synonyms and antonyms across entries
  const allSynonyms = useMemo(() => {
    const set = new Set<string>();
    for (const entry of entries) {
      for (const syn of entry.synonyms || []) set.add(syn);
    }
    return Array.from(set).slice(0, 6);
  }, [entries]);

  const allAntonyms = useMemo(() => {
    const set = new Set<string>();
    for (const entry of entries) {
      for (const ant of entry.antonyms || []) set.add(ant);
    }
    return Array.from(set).slice(0, 6);
  }, [entries]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setEnriching(false);
      setEntries([]);
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
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
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
      toast.success(isStarred ? "Đã bỏ lưu từ vựng." : "Đã lưu từ vào sổ ôn tập.");
    } catch {
      toast.error("Không thể cập nhật từ đã lưu");
    } finally {
      setStarLoading(false);
    }
  };

  const handlePlayAudio = (entry: DictionaryEntry, accent: "US" | "UK") => {
    const url = accent === "US" ? entry.audio.us : entry.audio.uk;
    setPlayingAccent(accent);

    if (url) {
      const audio = new Audio(url.startsWith("//") ? `https:${url}` : url);
      audio.onended = () => setPlayingAccent(null);
      audio.onerror = () => setPlayingAccent(null);
      void audio.play().catch(() => setPlayingAccent(null));
      return;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(entry.word || canonicalWord);
      utterance.lang = accent === "US" ? "en-US" : "en-GB";
      utterance.onend = () => setPlayingAccent(null);
      utterance.onerror = () => setPlayingAccent(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setPlayingAccent(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 sm:p-6 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
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
        className="flex max-h-[min(88dvh,840px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all"
      >
        {/* Header Bar */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 shadow-2xs">
              <BookOpen size={16} aria-hidden="true" />
            </div>
            <h2 id="dictionary-title" className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tra từ trong bài luyện
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Star / Bookmark action */}
            {primaryEntry && (
              <button
                type="button"
                onClick={handleToggleStar}
                disabled={starLoading}
                aria-label={isStarred ? "Bỏ lưu từ vựng" : "Lưu từ vựng"}
                aria-pressed={isStarred}
                className={clsx(
                  "flex h-10 w-10 items-center justify-center rounded-xl border transition-all cursor-pointer",
                  isStarred
                    ? "border-amber-300 dark:border-amber-600/50 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shadow-2xs"
                    : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
                title={isStarred ? "Bỏ lưu từ" : "Lưu từ để ôn tập"}
              >
                {starLoading ? (
                  <Loader2 size={16} className="animate-spin text-amber-600 dark:text-amber-400" />
                ) : (
                  <Star size={17} className={clsx(isStarred && "fill-current")} />
                )}
              </button>
            )}

            {/* Close button */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Đóng bảng tra cứu"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors cursor-pointer"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Scrollable Main Content - Single continuous page without tabs */}
        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-4">
          {loading ? (
            <div
              id="dictionary-loading-status"
              role="status"
              className="flex min-h-60 flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-3"
            >
              <Loader2 className="size-8 animate-spin text-amber-600 dark:text-amber-400" />
              <p className="text-sm font-medium">Đang tra cứu “{cleanWord}”…</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center text-center px-4 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-3">
                <AlertCircle size={24} aria-hidden="true" />
              </div>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                Chưa có dữ liệu cho “{cleanWord}”
              </p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Hệ thống từ điển đang cập nhật thêm mục từ này. Bạn vẫn có thể tiếp tục bài luyện bình thường.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Word & Base Form Showcase */}
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight lowercase first-letter:uppercase">
                    {canonicalWord}
                  </h3>
                  {isInflectionMatch && (
                    <span className="inline-flex items-center rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300">
                      Dạng gốc của "{cleanWord}"
                    </span>
                  )}
                </div>
              </div>

              {/* Primary Pronunciation & Audio Action Chips (US & UK) */}
              <section aria-label="Phiên âm và phát âm" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["US", "UK"] as const).map((accent) => {
                  const ipa = accent === "US" ? primaryEntry?.ipaUs : primaryEntry?.ipaUk;
                  const isPlaying = playingAccent === accent;

                  return (
                    <button
                      key={accent}
                      type="button"
                      onClick={() => primaryEntry && handlePlayAudio(primaryEntry, accent)}
                      disabled={playingAccent !== null}
                      className={clsx(
                        "group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 cursor-pointer",
                        isPlaying
                          ? "border-amber-400 dark:border-amber-500 bg-amber-50/90 dark:bg-amber-950/50 text-amber-950 dark:text-amber-100 shadow-xs ring-2 ring-amber-400/30"
                          : "border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/40 dark:hover:bg-amber-950/30 text-slate-800 dark:text-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1 text-xs font-black tracking-wider text-slate-600 dark:text-slate-300 uppercase shadow-2xs">
                          {accent}
                        </span>
                        <span className="font-mono text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {ipa || "Chưa có IPA"}
                        </span>
                      </div>
                      <div
                        className={clsx(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all shadow-2xs",
                          isPlaying
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 group-hover:bg-amber-100/60 dark:group-hover:bg-amber-900/40"
                        )}
                      >
                        <Volume2 size={18} className={clsx(isPlaying && "animate-pulse")} />
                      </div>
                    </button>
                  );
                })}
              </section>

              {/* All Parts of Speech & Meanings - Rendered together on 1 page */}
              <section aria-label="Các từ loại và ý nghĩa" className="space-y-3.5 pt-1">
                {entries.map((entry, idx) => {
                  const definitions = hasExpandedDetails
                    ? entry.definitions?.filter((d) => d.definition).slice(0, 2) || []
                    : [];
                  const { displayWord, isVariant } = resolveEntryWord(
                    entry,
                    canonicalWord,
                    cleanWord,
                  );

                  return (
                    <div
                      key={`${entry.partOfSpeech || "pos"}-${idx}`}
                      className="rounded-2xl border border-amber-200/90 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/80 via-orange-50/25 to-white dark:from-slate-850 dark:via-slate-900 dark:to-slate-900 p-4 sm:p-5 shadow-2xs space-y-3"
                    >
                      {/* POS Header & Variant Audio (if different) */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/80 dark:border-amber-700/60 bg-white/95 dark:bg-slate-800 px-3 py-1 text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200 shadow-2xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {entries.length > 1 ? `${idx + 1}. ` : ""}
                            {formatPartOfSpeech(entry.partOfSpeech)}
                          </span>

                          {isVariant && (
                            <span className="inline-flex items-center rounded-md border border-amber-300/70 dark:border-amber-700/60 bg-amber-100/90 dark:bg-amber-950/60 px-2 py-0.5 text-[11px] sm:text-xs font-bold text-amber-900 dark:text-amber-200 shadow-2xs">
                              Dạng biến thể
                            </span>
                          )}
                        </div>

                        {/* If this variant has custom audio/IPA distinct from primary, show inline quick play */}
                        {idx > 0 && (entry.audio.us || entry.audio.uk || (entry.ipaUs && entry.ipaUs !== primaryEntry?.ipaUs)) && (
                          <button
                            type="button"
                            onClick={() => handlePlayAudio(entry, "US")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/90 dark:border-amber-800/60 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition-colors cursor-pointer shadow-2xs"
                            title="Nghe phát âm từ loại này"
                          >
                            <Volume2 size={14} className={playingAccent === "US" ? "animate-pulse text-amber-600" : ""} />
                            <span>{entry.ipaUs || "Phát âm"}</span>
                          </button>
                        )}
                      </div>

                      {/* English Word Form / Variant for this POS */}
                      <div className="flex flex-wrap items-baseline gap-2.5 pt-0.5">
                        <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight lowercase first-letter:uppercase">
                          {displayWord}
                        </span>
                        {entry.ipaUs && entry.ipaUs !== primaryEntry?.ipaUs && (
                          <span className="font-mono text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                            /{entry.ipaUs.replace(/^\/|\/$/g, "")}/
                          </span>
                        )}
                      </div>

                      {/* Vietnamese Meaning */}
                      <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 leading-snug">
                        {entry.meaningVi || "Nghĩa tiếng Việt đang được bổ sung."}
                      </p>

                      {/* Example Sentence */}
                      {entry.examples?.[0] && (
                        <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-800/80 p-3.5 sm:p-4 text-sm sm:text-base space-y-1.5">
                          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                            Ví dụ trong câu
                          </span>
                          <p className="font-medium text-slate-800 dark:text-slate-200 italic leading-relaxed text-sm sm:text-base">
                            “{highlightTargetWord(entry.examples[0], [canonicalWord, cleanWord, displayWord, entry.word])}”
                          </p>
                          {entry.exampleVi && (
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium pt-1 border-t border-slate-100 dark:border-slate-700/60">
                              → {entry.exampleVi}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Detailed Definitions (if enriched) */}
                      {definitions.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {definitions.map((def, defIdx) => (
                            <div
                              key={`${def.definition}-${defIdx}`}
                              className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-800/60 p-3 text-xs sm:text-sm leading-relaxed"
                            >
                              {def.meaningVi && def.meaningVi !== entry.meaningVi && (
                                <p className="font-bold text-slate-900 dark:text-slate-100 mb-0.5 text-sm sm:text-base">{def.meaningVi}</p>
                              )}
                              <p className="text-slate-600 dark:text-slate-300 font-medium">{def.definition}</p>
                              {def.example && (
                                <p className="mt-1 text-slate-500 dark:text-slate-400 italic">
                                  “{highlightTargetWord(def.example, [canonicalWord, cleanWord, displayWord, entry.word])}”
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>

              {/* Common Collocations */}
              {allCollocations.length > 0 && (
                <section className="space-y-2 pt-1">
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Cụm từ thường gặp (Collocations)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {allCollocations.map((item) => (
                      <span
                        key={item.phrase}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200/80 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/40 px-3 py-1.5 text-xs sm:text-sm text-sky-950 dark:text-sky-200 font-medium"
                      >
                        <strong className="font-bold text-sky-900 dark:text-sky-300">{item.phrase}</strong>
                        {item.meaningVi && (
                          <span className="text-sky-700 dark:text-sky-400 opacity-80">— {item.meaningVi}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Synonyms / Antonyms */}
              {(allSynonyms.length > 0 || allAntonyms.length > 0) && (
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {allSynonyms.length > 0 && (
                    <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 p-3.5">
                      <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                        Từ đồng nghĩa
                      </span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {allSynonyms.join(", ")}
                      </p>
                    </div>
                  )}
                  {allAntonyms.length > 0 && (
                    <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 p-3.5">
                      <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                        Từ trái nghĩa
                      </span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {allAntonyms.join(", ")}
                      </p>
                    </div>
                  )}
                </section>
              )}

              <div id="dictionary-status" role="status" aria-live="polite" className="sr-only">
                {enriching && <span>Đang cập nhật thêm nghĩa và phiên âm.</span>}
              </div>
            </div>
          )}
        </main>

        {/* Footer Action: Practice Word in Speaking */}
        {entries.length > 0 && onPracticeWord && (
          <footer className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => {
                onPracticeWord(canonicalWord);
                onClose();
              }}
              className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm sm:text-base shadow-xs shadow-amber-600/20 active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer transition-all"
            >
              <Volume2 size={18} />
              <span>Luyện phát âm từ này</span>
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};

export default WordDictionaryPopup;
