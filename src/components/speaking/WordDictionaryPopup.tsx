"use client";

import React, { useEffect, useState, useRef } from "react";
import { X, Volume2, Star, Loader2, BookOpen, AlertCircle } from "lucide-react";
import { vocabService, VocabWord } from "@/lib/api/services/vocab.service";
import toast from "react-hot-toast";

interface WordDictionaryPopupProps {
  word: string;
  onClose: () => void;
  onPracticeWord?: (word: string) => void;
}

export const WordDictionaryPopup: React.FC<WordDictionaryPopupProps> = ({
  word,
  onClose,
  onPracticeWord,
}) => {
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<VocabWord | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [starLoading, setStarLoading] = useState(false);
  const [playingAccent, setPlayingAccent] = useState<"US" | "UK" | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Normalize lookup word
  const cleanWord = word
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    setLoading(true);
    setNotFound(false);
    setMatch(null);
    setSavedId(null);
    setIsStarred(false);

    vocabService
      .lookupWord(cleanWord, controller.signal)
      .then((res) => {
        if (!isMounted) return;
        const externalMatches: VocabWord[] = (res.entries || []).map(
          (entry, index) => ({
            id: -(index + 1),
            word: entry.word,
            pos: entry.partOfSpeech || "",
            ipaUs: entry.ipaUs || undefined,
            ipaUk: entry.ipaUk || undefined,
            meaning: entry.meaningVi || entry.definitions[0]?.definition || "",
            exampleEn: entry.examples[0] || undefined,
            exampleVi: entry.exampleVi || entry.definitions[0]?.meaningVi || undefined,
            audioUs: entry.audio.us || undefined,
            audioUk: entry.audio.uk || undefined,
            collocations: entry.collocations,
          }),
        );
        const matches: VocabWord[] = res.matches?.length
          ? res.matches
          : externalMatches;
        if (matches.length > 0) {
          const first = matches[0];
          setMatch(first);
          setIsStarred(Boolean(res.saved || first.isStarred));
          setSavedId(res.savedId ?? null);
        } else {
          setNotFound(true);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        if (!isMounted) return;
        setNotFound(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [cleanWord]);

  // Handle Escape key and focus management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleToggleStar = async () => {
    if (!match) {
      return;
    }
    setStarLoading(true);
    try {
      if (isStarred) {
        if (savedId) await vocabService.removeSavedWord(savedId);
        setSavedId(null);
      } else {
        const saved = await vocabService.saveWord(match.word);
        setSavedId(saved.id);
      }
      setIsStarred(!isStarred);
      toast.success(
        !isStarred
          ? "Đã lưu từ vựng vào danh sách ôn tập!"
          : "Đã bỏ lưu từ vựng.",
      );
    } catch {
      toast.error("Không thể cập nhật trạng thái yêu thích");
    } finally {
      setStarLoading(false);
    }
  };

  const handlePlayAudio = (accent: "US" | "UK") => {
    if (!match) return;
    const url = accent === "US" ? match.audioUs : match.audioUk;
    if (url) {
      setPlayingAccent(accent);
      const audio = new Audio(url);
      audio.onended = () => setPlayingAccent(null);
      audio.onerror = () => {
        setPlayingAccent(null);
        toast.error("Không thể phát âm thanh từ mẫu");
      };
      audio.play().catch(() => setPlayingAccent(null));
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setPlayingAccent(accent);
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(match.word);
      utterance.lang = accent === "US" ? "en-US" : "en-GB";
      utterance.onend = () => setPlayingAccent(null);
      utterance.onerror = () => setPlayingAccent(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Tra cứu từ vựng: ${cleanWord}`}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all border border-slate-200 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800">
            <BookOpen className="h-5 w-5 text-amber-500" />
            <h3 className="text-base font-semibold">Tra cứu từ vựng</h3>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Đóng bảng tra cứu"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <p className="mt-2 text-sm">
                Đang tra cứu &quot;{cleanWord}&quot;...
              </p>
            </div>
          ) : notFound || !match ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-10 w-10 text-slate-400" />
              <p className="mt-2 text-base font-medium text-slate-700">
                Chưa có từ &quot;{cleanWord}&quot; trong từ điển
              </p>
              <p className="mt-1 text-xs text-slate-500 max-w-xs">
                Từ điển hiện lưu trữ từ vựng trọng tâm TOEIC trong hệ thống. Bạn
                vẫn có thể luyện đọc trực tiếp từ này.
              </p>
              {onPracticeWord && (
                <button
                  type="button"
                  onClick={() => {
                    onPracticeWord(cleanWord);
                    onClose();
                  }}
                  className="mt-4 rounded-xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  Luyện đọc từ &quot;{cleanWord}&quot;
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Word & POS & Star */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-slate-900 capitalize">
                      {match.word}
                    </h2>
                    {match.pos && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 uppercase">
                        {match.pos}
                      </span>
                    )}
                  </div>
                  {match.word.toLowerCase() !== cleanWord.toLowerCase() && (
                    <p className="mt-1 text-xs text-slate-500">
                      Dạng bạn chọn:{" "}
                      <span className="font-semibold">{cleanWord}</span>
                    </p>
                  )}
                  {/* IPAs */}
                  <div className="mt-1 flex items-center gap-3 text-sm text-slate-600">
                    {match.ipaUs && (
                      <span>
                        <strong className="text-slate-400">US</strong> /
                        {match.ipaUs}/
                      </span>
                    )}
                    {match.ipaUk && (
                      <span>
                        <strong className="text-slate-400">UK</strong> /
                        {match.ipaUk}/
                      </span>
                    )}
                  </div>
                </div>

                {/* Star Button */}
                <button
                  type="button"
                  onClick={handleToggleStar}
                  disabled={starLoading}
                  aria-label={
                    isStarred ? "Bỏ lưu từ vựng" : "Lưu từ vựng"
                  }
                  className={`rounded-xl p-2.5 transition-colors border ${
                    isStarred
                      ? "border-amber-300 bg-amber-50 text-amber-500 hover:bg-amber-100"
                      : "border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-amber-500"
                  }`}
                >
                  <Star
                    className={`h-5 w-5 ${isStarred ? "fill-amber-400" : ""}`}
                  />
                </button>
              </div>

              {/* Audio Pronunciation Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePlayAudio("US")}
                  disabled={playingAccent !== null}
                  aria-label="Nghe phát âm giọng Mỹ"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-amber-400"
                >
                  <Volume2
                    className={`h-4 w-4 ${playingAccent === "US" ? "text-amber-500 animate-pulse" : "text-slate-500"}`}
                  />
                  Giọng Mỹ (US)
                </button>
                <button
                  type="button"
                  onClick={() => handlePlayAudio("UK")}
                  disabled={playingAccent !== null}
                  aria-label="Nghe phát âm giọng Anh"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-amber-400"
                >
                  <Volume2
                    className={`h-4 w-4 ${playingAccent === "UK" ? "text-amber-500 animate-pulse" : "text-slate-500"}`}
                  />
                  Giọng Anh (UK)
                </button>
              </div>

              {/* Meaning */}
              <div className="rounded-xl bg-amber-50/70 p-3.5 border border-amber-100">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                  Định nghĩa tiếng Việt
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800 leading-relaxed">
                  {match.meaning}
                </p>
              </div>

              {/* Examples */}
              {(match.exampleEn || match.exampleVi) && (
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-xs space-y-1">
                  <p className="font-semibold text-slate-500 uppercase tracking-wider">
                    Ví dụ minh họa
                  </p>
                  {match.exampleEn && (
                    <p className="text-slate-700 italic leading-snug">
                      &ldquo;{match.exampleEn}&rdquo;
                    </p>
                  )}
                  {match.exampleVi && (
                    <p className="text-slate-500 leading-snug">
                      {match.exampleVi}
                    </p>
                  )}
                </div>
              )}

              {/* Action Button */}
              {onPracticeWord && (
                <button
                  type="button"
                  onClick={() => {
                    onPracticeWord(match.word);
                    onClose();
                  }}
                  className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors"
                >
                  Luyện phát âm từ này
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
