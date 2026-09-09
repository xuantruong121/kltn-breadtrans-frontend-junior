"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Star,
  Volume2,
  RotateCw,
  Play,
  Pause,
  ListOrdered,
  X,
  RotateCcw,
  Trophy,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { vocabService, VocabWord } from "@/lib/api/services/vocab.service";
import { BackButton } from "@/components/ui";

export default function VocabFlashcardsPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const topicId = Number(id);

  // Deck state
  const [activeWords, setActiveWords] = useState<VocabWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev

  // Mode & Drawer toggles
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  // Session stats
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set());
  const [weakWordIds, setWeakWordIds] = useState<Set<number>>(new Set());

  // Auto-play timers
  const autoPlayTimer1 = useRef<NodeJS.Timeout | null>(null);
  const autoPlayTimer2 = useRef<NodeJS.Timeout | null>(null);

  const { data: topic, isLoading } = useQuery({
    queryKey: ["vocab-topic", topicId],
    queryFn: () => vocabService.getTopicById(topicId),
    enabled: !!topicId,
  });

  // Effective words queue: uses activeWords override (e.g. weak words queue) or defaults directly to topic.words
  const words: VocabWord[] = activeWords.length > 0 ? activeWords : (topic?.words ?? []);
  const currentWord: VocabWord | undefined = words[currentIndex];

  const toggleStarMut = useMutation({
    mutationFn: ({ wordId, isStarred }: { wordId: number; isStarred: boolean }) =>
      vocabService.starWord(wordId, isStarred),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vocab-topic", topicId] }),
  });

  const toggleMasteredMut = useMutation({
    mutationFn: ({ wordId, isMastered }: { wordId: number; isMastered: boolean }) =>
      vocabService.masterWord(wordId, isMastered),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vocab-topic", topicId] });
      queryClient.invalidateQueries({ queryKey: ["vocab-topics"] });
      queryClient.invalidateQueries({ queryKey: ["myQuests"] });
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
    },
  });

  const clearAutoPlayTimers = useCallback(() => {
    if (autoPlayTimer1.current) clearTimeout(autoPlayTimer1.current);
    if (autoPlayTimer2.current) clearTimeout(autoPlayTimer2.current);
  }, []);

  const playAudio = useCallback((text: string, url?: string) => {
    if (url) {
      const audio = new Audio(url);
      audio.play().catch(() => {});
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Advance to next card or complete deck
  const handleNext = useCallback(() => {
    clearAutoPlayTimers();
    setDirection(1);
    if (currentIndex < words.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      setIsAutoPlay(false);
    }
  }, [currentIndex, words.length, clearAutoPlayTimers]);

  // Mark word as Mastered or Review Later
  const handleMark = useCallback(
    (isMastered: boolean) => {
      if (!currentWord || isCompleted) return;

      clearAutoPlayTimers();

      // Track session stats
      if (isMastered) {
        setMasteredIds((prev) => new Set(prev).add(currentWord.id));
        setWeakWordIds((prev) => {
          const updated = new Set(prev);
          updated.delete(currentWord.id);
          return updated;
        });
      } else {
        setWeakWordIds((prev) => new Set(prev).add(currentWord.id));
        setMasteredIds((prev) => {
          const updated = new Set(prev);
          updated.delete(currentWord.id);
          return updated;
        });
      }

      // Fire backend mutation
      toggleMasteredMut.mutate({ wordId: currentWord.id, isMastered });

      // Automatically advance to next card
      handleNext();
    },
    [currentWord, isCompleted, clearAutoPlayTimers, toggleMasteredMut, handleNext]
  );

  // Auto-play state machine: Card shown -> Play audio -> Wait 2.5s -> Flip -> Wait 2.8s -> Next
  useEffect(() => {
    if (!isAutoPlay || isCompleted || !currentWord) {
      clearAutoPlayTimers();
      return;
    }

    // Step 1: Play audio pronunciation on card entry
    playAudio(currentWord.word, currentWord.audioUs);

    // Step 2: Flip after 2.5s
    autoPlayTimer1.current = setTimeout(() => {
      setIsFlipped(true);

      // Step 3: Advance to next card after another 2.8s
      autoPlayTimer2.current = setTimeout(() => {
        handleNext();
      }, 2800);
    }, 2500);

    return () => clearAutoPlayTimers();
  }, [isAutoPlay, currentIndex, currentWord, isCompleted, playAudio, handleNext, clearAutoPlayTimers]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        clearAutoPlayTimers();
        setIsFlipped((prev) => !prev);
      } else if (e.key === "ArrowLeft" || e.key === "1") {
        e.preventDefault();
        handleMark(false);
      } else if (e.key === "ArrowRight" || e.key === "2") {
        e.preventDefault();
        handleMark(true);
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setIsAutoPlay((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsDrawerOpen(false);
        setShowShortcutHelp(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleMark, clearAutoPlayTimers]);

  // Restart entire deck
  const handleRestartFullDeck = () => {
    setActiveWords([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
    setMasteredIds(new Set());
    setWeakWordIds(new Set());
  };

  // Practice only weak words
  const handlePracticeWeakWords = () => {
    if (topic?.words) {
      const weak = topic.words.filter((w) => weakWordIds.has(w.id));
      if (weak.length > 0) {
        setActiveWords(weak);
        setCurrentIndex(0);
        setIsFlipped(false);
        setIsCompleted(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Loader2 className="animate-spin text-amber-500" size={48} />
      </div>
    );
  }

  if (!topic || !topic.words || topic.words.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center mt-16 space-y-4 bg-white p-8 rounded-3xl border-2 border-slate-200 shadow-sm">
        <h2 className="text-xl font-black text-slate-800">Chưa có từ vựng</h2>
        <p className="text-sm text-slate-500">Chủ đề này hiện tại chưa có từ vựng nào để học.</p>
        <div className="flex justify-center pt-2">
          <BackButton href="/flashcard" label="Quay lại danh mục" />
        </div>
      </div>
    );
  }

  if (!currentWord && !isCompleted) {
    return (
      <div className="flex justify-center items-center h-80">
        <Loader2 className="animate-spin text-amber-500" size={48} />
      </div>
    );
  }

  const progressPercent = words.length > 0
    ? Math.round(((currentIndex + (isCompleted ? 1 : 0)) / words.length) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 pt-2 space-y-6">
      {/* 1. TOP HEADER & FOCUS CONTROLS */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 backdrop-blur-md px-5 py-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton href="/flashcard" label="Thoát" />
          <div className="h-5 w-px bg-slate-200 hidden sm:block" />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-slate-900 truncate">
              {topic.title}
            </h1>
            <p className="text-[11px] font-bold text-amber-700/90 truncate">
              {topic.categoryName || "Từ vựng TOEIC"}
            </p>
          </div>
        </div>

        {/* Right Toolbar: Auto-Play, Shortcuts, Drawer Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {/* Auto-Play Button */}
          <button
            type="button"
            onClick={() => {
              clearAutoPlayTimers();
              setIsAutoPlay((prev) => !prev);
            }}
            title="Bật/Tắt tự động chuyển thẻ [P]"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer border ${
              isAutoPlay
                ? "bg-amber-500 text-white border-amber-600 shadow-sm animate-pulse"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            {isAutoPlay ? <Pause size={15} /> : <Play size={15} />}
            <span className="hidden sm:inline">Tự động chạy</span>
            <kbd className={`text-[10px] font-mono px-1 rounded ${isAutoPlay ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-600"}`}>P</kbd>
          </button>

          {/* Keyboard shortcut hint */}
          <button
            type="button"
            onClick={() => setShowShortcutHelp((prev) => !prev)}
            title="Xem phím tắt"
            className="p-2 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
          >
            <HelpCircle size={18} />
          </button>

          {/* Word List Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            title="Mở danh sách từ"
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <ListOrdered size={16} />
            <span className="hidden sm:inline">Danh sách</span>
            <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-lg text-[10px] font-black">
              {words.length}
            </span>
          </button>
        </div>
      </header>

      {/* SHORTCUT HELP MODAL */}
      <AnimatePresence>
        {showShortcutHelp && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-slate-700 space-y-2 shadow-sm"
          >
            <div className="flex items-center justify-between font-black text-amber-950">
              <span>Phím tắt hỗ trợ học nhanh:</span>
              <button onClick={() => setShowShortcutHelp(false)} className="text-slate-400 hover:text-slate-700">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-medium">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white border font-mono">Space</kbd>: Lật thẻ / Nghe lại</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white border font-mono">←</kbd> hoặc <kbd className="px-1.5 py-0.5 rounded bg-white border font-mono">1</kbd>: Nhắc học sau</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white border font-mono">→</kbd> hoặc <kbd className="px-1.5 py-0.5 rounded bg-white border font-mono">2</kbd>: Đã thuộc</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white border font-mono">P</kbd>: Tự động chạy thẻ</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. VISUAL PROGRESS BAR & COUNTER */}
      {!isCompleted && (
        <div className="space-y-1.5 px-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>
              Thẻ {currentIndex + 1} / {words.length}
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              {masteredIds.size > 0 && (
                <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                  ✓ {masteredIds.size} đã thuộc
                </span>
              )}
              {weakWordIds.size > 0 && (
                <span className="text-rose-500 font-extrabold flex items-center gap-1">
                  • {weakWordIds.size} cần ôn
                </span>
              )}
              <span className="font-extrabold text-amber-700">{progressPercent}%</span>
            </div>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/70">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* 3. MAIN FOCUS HERO CANVAS */}
      <main className="relative min-h-[460px] flex items-center justify-center">
        {isCompleted ? (
          /* DECK SUMMARY SCREEN */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-white rounded-3xl border-2 border-amber-200/80 p-8 sm:p-12 shadow-md text-center space-y-8"
          >
            <div className="size-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Trophy size={40} />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Hoàn Thành Bộ Từ Vựng!
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-2">
                Bạn đã hoàn thành lượt học cho tất cả các thẻ trong bộ từ này.
              </p>
            </div>

            {/* KPI Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <p className="text-xs font-bold text-slate-400 uppercase">Tổng số thẻ</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{words.length}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                <p className="text-xs font-bold text-emerald-700 uppercase">Đã thuộc</p>
                <p className="text-2xl font-black text-emerald-800 mt-1">{masteredIds.size}</p>
              </div>
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl">
                <p className="text-xs font-bold text-rose-700 uppercase">Cần ôn lại</p>
                <p className="text-2xl font-black text-rose-800 mt-1">{weakWordIds.size}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                <p className="text-xs font-bold text-amber-700 uppercase">Thưởng EXP</p>
                <p className="text-2xl font-black text-amber-800 mt-1">+{masteredIds.size * 5}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              {weakWordIds.size > 0 && (
                <button
                  type="button"
                  onClick={handlePracticeWeakWords}
                  className="w-full sm:w-auto px-6 py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl shadow-sm transition-transform active:scale-95 cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  <AlertCircle size={16} />
                  <span>Luyện tập từ chưa thuộc ({weakWordIds.size})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRestartFullDeck}
                className="w-full sm:w-auto px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl shadow-sm transition-transform active:scale-95 cursor-pointer text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                <span>Học lại từ đầu</span>
              </button>

              <Link href="/flashcard" className="w-full sm:w-auto">
                <button
                  type="button"
                  className="w-full px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors cursor-pointer text-sm"
                >
                  Về trang danh mục
                </button>
              </Link>
            </div>
          </motion.div>
        ) : currentWord ? (
          /* ACTIVE HERO CARD */
          <div className="w-full max-w-2xl mx-auto space-y-6">
            <div className="relative w-full min-h-[380px] sm:min-h-[420px] flex items-center justify-center perspective-[1000px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentWord.id + (isFlipped ? "-back" : "-front")}
                  initial={{ opacity: 0, rotateY: isFlipped ? -90 : 90, scale: 0.98 }}
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  exit={{ opacity: 0, rotateY: isFlipped ? 90 : -90, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  onClick={() => {
                    clearAutoPlayTimers();
                    setIsFlipped((prev) => !prev);
                  }}
                  className="w-full h-full min-h-[380px] sm:min-h-[420px] bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 rounded-3xl shadow-lg border-2 border-amber-200/80 cursor-pointer flex flex-col items-center justify-center p-8 sm:p-12 text-center relative select-none hover:border-amber-300 transition-colors"
                >
                  {/* Top Bar on Card: Part of speech + Star button */}
                  <div className="absolute top-5 left-5">
                    <span className="inline-block bg-amber-100 text-amber-900 font-black px-3 py-1 rounded-xl text-xs uppercase tracking-wider">
                      {currentWord.pos || "Từ vựng"}
                    </span>
                  </div>

                  <div className="absolute top-5 right-5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStarMut.mutate({
                          wordId: currentWord.id,
                          isStarred: !currentWord.isStarred,
                        });
                      }}
                      title="Đánh dấu yêu thích"
                      className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                        currentWord.isStarred
                          ? "bg-amber-100 text-amber-500 border border-amber-300 shadow-xs"
                          : "bg-white/80 text-slate-400 hover:bg-white hover:text-slate-600 border border-slate-200"
                      }`}
                    >
                      <Star size={18} fill={currentWord.isStarred ? "currentColor" : "none"} />
                    </button>
                  </div>

                  {!isFlipped ? (
                    /* FRONT OF CARD (English Word + Audio) */
                    <div className="space-y-4 my-auto">
                      <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight break-words max-w-full px-2">
                        {currentWord.word}
                      </h2>

                      {currentWord.ipaUs && (
                        <p className="text-base sm:text-xl text-amber-700 font-mono font-bold">
                          /{currentWord.ipaUs.replace(/\//g, "")}/
                        </p>
                      )}

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playAudio(currentWord.word, currentWord.audioUs);
                          }}
                          className="inline-flex items-center justify-center size-14 rounded-2xl bg-white text-amber-600 hover:bg-amber-500 hover:text-white border-2 border-amber-200 hover:border-amber-500 transition-all shadow-sm active:scale-95 cursor-pointer"
                          title="Nghe phát âm"
                        >
                          <Volume2 size={26} />
                        </button>
                      </div>

                      <p className="text-xs font-semibold text-slate-400 pt-4 flex items-center justify-center gap-1">
                        <RotateCw size={13} />
                        <span>Nhấp hoặc nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[10px] font-mono">Space</kbd> để xem nghĩa</span>
                      </p>
                    </div>
                  ) : (
                    /* BACK OF CARD (Vietnamese Meaning + Example) */
                    <div className="space-y-4 my-auto w-full max-w-md">
                      <div>
                        <p className="text-xs font-bold text-amber-700/80 uppercase tracking-widest mb-1">
                          Định nghĩa tiếng Việt
                        </p>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 break-words px-2">
                          {currentWord.meaning}
                        </h3>
                      </div>

                      {currentWord.exampleEn && (
                        <div className="bg-white/95 p-4 rounded-2xl border border-amber-200/80 text-left shadow-xs">
                          <p className="text-xs sm:text-sm text-slate-800 font-bold mb-1 italic">
                            "{currentWord.exampleEn}"
                          </p>
                          {currentWord.exampleVi && (
                            <p className="text-xs text-slate-500 font-medium">
                              {currentWord.exampleVi}
                            </p>
                          )}
                        </div>
                      )}

                      <p className="text-xs font-semibold text-slate-400 pt-2 flex items-center justify-center gap-1">
                        <RotateCw size={13} />
                        <span>Nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[10px] font-mono">Space</kbd> để lật lại từ tiếng Anh</span>
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 4. STREAMLINED ACTION BUTTONS */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleMark(false)}
                className="flex-1 min-h-12 py-3.5 px-4 rounded-2xl font-black text-sm bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-200 transition-all shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Nhắc học lại sau</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-rose-200/80 text-rose-800 text-[10px] font-mono">
                  ← hoặc 1
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  clearAutoPlayTimers();
                  setIsFlipped((prev) => !prev);
                }}
                className="p-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border-2 border-slate-200 transition-colors shadow-xs active:scale-95 cursor-pointer"
                title="Lật thẻ [Space]"
              >
                <RotateCw size={18} />
              </button>

              <button
                type="button"
                onClick={() => handleMark(true)}
                className="flex-1 min-h-12 py-3.5 px-4 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm shadow-emerald-600/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Đã thuộc từ này</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-emerald-700 text-emerald-100 text-[10px] font-mono">
                  → hoặc 2
                </kbd>
              </button>
            </div>
          </div>
        ) : null}
      </main>

      {/* 5. SLIDE-OVER WORD LIST DRAWER */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            />

            {/* Slide-over Drawer Panel */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-screen max-w-md bg-white shadow-2xl flex flex-col"
              >
                {/* Drawer Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Danh sách từ trong chủ đề</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Nhấp vào từ bất kỳ để chuyển nhanh tới thẻ đó
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Drawer Word List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {words.map((w, idx) => {
                    const isCurrent = idx === currentIndex && !isCompleted;
                    const isMastered = masteredIds.has(w.id) || w.isMastered;
                    const isWeak = weakWordIds.has(w.id);

                    return (
                      <button
                        key={w.id || idx}
                        type="button"
                        onClick={() => {
                          clearAutoPlayTimers();
                          setCurrentIndex(idx);
                          setIsFlipped(false);
                          setIsCompleted(false);
                          setIsDrawerOpen(false);
                        }}
                        className={`w-full p-3 rounded-2xl text-left font-bold text-xs transition-all flex items-center justify-between cursor-pointer border ${
                          isCurrent
                            ? "bg-amber-100/80 text-amber-950 border-amber-400 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="size-6 rounded-lg bg-white flex items-center justify-center font-black text-[10px] text-slate-500 border border-slate-200 shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate font-black text-sm">{w.word}</span>
                          {w.ipaUs && (
                            <span className="text-slate-400 text-xs truncate">/{w.ipaUs}/</span>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {isMastered ? (
                            <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-100 px-2 py-0.5 rounded-md">
                              Thuộc ✓
                            </span>
                          ) : isWeak ? (
                            <span className="text-rose-700 font-extrabold text-[10px] bg-rose-100 px-2 py-0.5 rounded-md">
                              Cần ôn
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Drawer Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
                  <span>Tổng cộng: {words.length} từ</span>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="font-bold text-amber-800 hover:underline"
                  >
                    Đóng
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
