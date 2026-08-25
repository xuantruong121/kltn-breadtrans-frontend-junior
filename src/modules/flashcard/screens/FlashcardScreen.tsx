"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Layers, 
  Gamepad2, 
  ListOrdered, 
  ArrowLeft, 
  ArrowRight, 
  Shuffle, 
  CheckCircle2, 
  BookOpen, 
  Volume2,
  Library,
  PlayCircle,
  Loader2,
  Search,
  Check,
  RotateCcw,
  Sparkles,
  Award,
  ChevronRight,
  ShieldCheck,
  X
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FLASHCARD_BOOKS } from "../services/flashcardData";
import { FlashcardBook, FlashcardLesson, StudyMode } from "../types";
import { FlashcardCard3D } from "../components/FlashcardCard3D";
import { FlashcardQuizView } from "../components/FlashcardQuizView";
import { Button3D } from "@/components/ui";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useAuthStore } from "@/stores/authStore";
import { gamificationService } from "@/lib/api/services/gamification.service";
import { vocabService } from "@/lib/api/services/vocab.service";
import toast from "react-hot-toast";

export const FlashcardScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { addExp } = useGamificationStore();
  const queryClient = useQueryClient();

  // Top Section Switcher: 3D Books or Backend Topic Packs
  const [topTab, setTopTab] = useState<"3d-books" | "topics">("3d-books");

  // 3D Books State
  const [selectedBook, setSelectedBook] = useState<FlashcardBook>(FLASHCARD_BOOKS[0]);
  const [selectedLesson, setSelectedLesson] = useState<FlashcardLesson>(FLASHCARD_BOOKS[0].lessons[0]);
  const [mode, setMode] = useState<StudyMode>("flashcard");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isReviewingSession, setIsReviewingSession] = useState(false);

  // Search & Filter for List Mode
  const [listSearchQuery, setListSearchQuery] = useState("");
  const [listFilter, setListFilter] = useState<"all" | "mastered" | "unmastered">("all");

  // Query Backend Topics for Tab 2
  const { data: topicsData, isLoading: isLoadingTopics } = useQuery({
    queryKey: ["vocab-topics"],
    queryFn: vocabService.getTopics,
  });
  const backendTopics = (topicsData as any)?.topics || topicsData || [];

  // LocalStorage Keys for Gamification Anti-Exploit
  const userPrefix = user?.id || "guest";
  const masteredStorageKey = `breadtrans_mastered_words_${userPrefix}`;
  const rewardedStorageKey = `breadtrans_rewarded_vocab_${userPrefix}`;
  const completedDecksStorageKey = `breadtrans_completed_decks_${userPrefix}`;

  // 1. Mastered words state (Set of word IDs)
  const [masteredWords, setMasteredWords] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(masteredStorageKey);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // 2. Words that have ALREADY granted first-time EXP (Anti-Exploit: Cannot farm repeat EXP)
  const [rewardedWords, setRewardedWords] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(rewardedStorageKey);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // 3. Lessons completed at least once
  const [completedLessons, setCompletedLessons] = useState<number[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(completedDecksStorageKey);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const words = selectedLesson.words;
  const currentWord = words[currentWordIndex] || words[0];

  // Scoped count for the current lesson only
  const currentLessonMasteredCount = words.filter((w) => masteredWords.includes(w.id)).length;
  const isLessonFullyMastered = currentLessonMasteredCount === words.length && words.length > 0;

  const isCurrentWordRewarded = currentWord && rewardedWords.includes(currentWord.id);
  const isCurrentWordMastered = currentWord && masteredWords.includes(currentWord.id);

  // Collect all words across books for quiz distractors
  const allWords = useMemo(
    () => FLASHCARD_BOOKS.flatMap((b) => b.lessons.flatMap((l) => l.words)),
    []
  );

  // Switch to a new lesson
  const handleSelectLesson = (lesson: FlashcardLesson) => {
    setSelectedLesson(lesson);
    setIsReviewingSession(false);

    // Find first unmastered word index or start from 0
    const unmasteredIdx = lesson.words.findIndex((w) => !masteredWords.includes(w.id));
    setCurrentWordIndex(unmasteredIdx >= 0 ? unmasteredIdx : 0);
  };

  // Filtered words for List Mode (Search + Status Filter)
  const filteredListWords = useMemo(() => {
    return words.filter((w) => {
      const isMastered = masteredWords.includes(w.id);
      const matchesFilter =
        listFilter === "all" ||
        (listFilter === "mastered" && isMastered) ||
        (listFilter === "unmastered" && !isMastered);

      const q = listSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        w.word.toLowerCase().includes(q) ||
        w.mean.toLowerCase().includes(q) ||
        w.ipa.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [words, masteredWords, listFilter, listSearchQuery]);

  const handleNextWord = () => {
    if (currentWordIndex + 1 < words.length) {
      setCurrentWordIndex((i) => i + 1);
    } else {
      // Completed deck cycle
      setCurrentWordIndex(0);

      const isFirstTime = !completedLessons.includes(selectedLesson.id);
      if (isFirstTime && isLessonFullyMastered) {
        const nextCompleted = [...completedLessons, selectedLesson.id];
        setCompletedLessons(nextCompleted);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(completedDecksStorageKey, JSON.stringify(nextCompleted));
          } catch {}
        }
        addExp(15);
        toast.success("Hoàn thành 100% bài học lần đầu! +15 EXP ⭐", { id: "deck-first-completed" });
      } else {
        toast.success("Đã hoàn thành vòng xem thẻ!", { id: "deck-round-completed" });
      }
    }
  };

  const handlePrevWord = () => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex((i) => i - 1);
    }
  };

  const handleShuffle = () => {
    setCurrentWordIndex(Math.floor(Math.random() * words.length));
  };

  // Learning Action 1: Mark word as Mastered (Đã thuộc) - STRICT ANTI-EXPLOIT
  const markMastered = () => {
    if (!currentWord) return;
    const wordId = currentWord.id;

    if (!masteredWords.includes(wordId)) {
      const nextMastered = [...masteredWords, wordId];
      setMasteredWords(nextMastered);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(masteredStorageKey, JSON.stringify(nextMastered));
        } catch {}
      }
    }

    // Check if word has EVER been rewarded in lifetime
    const isAlreadyRewarded = rewardedWords.includes(wordId);
    if (!isAlreadyRewarded && !isReviewingSession) {
      // First-time mastery: grant +5 EXP and record quest
      const nextRewarded = [...rewardedWords, wordId];
      setRewardedWords(nextRewarded);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(rewardedStorageKey, JSON.stringify(nextRewarded));
        } catch {}
      }

      addExp(5);
      toast.success(`Đã thuộc: "${currentWord.word}"! +5 EXP ⭐`, { id: `mastered-${wordId}` });

      if (user) {
        gamificationService.recordVocabLearned(1).then(() => {
          queryClient.invalidateQueries({ queryKey: ["myQuests"] });
          queryClient.invalidateQueries({ queryKey: ["profile"] });
          queryClient.invalidateQueries({ queryKey: ["stats"] });
        }).catch(() => {});
      }
    } else {
      // Already rewarded previously (or reviewing): 0 EXP granted
      toast.success(`Đã ghi nhớ: "${currentWord.word}"!`, { id: `mastered-${wordId}` });
    }

    // Auto advance to next word
    handleNextWord();
  };

  // Learning Action 2: Mark word as Need Review (Cần ôn lại)
  const markNeedReview = () => {
    if (!currentWord) return;
    const wordId = currentWord.id;

    if (masteredWords.includes(wordId)) {
      const nextMastered = masteredWords.filter((id) => id !== wordId);
      setMasteredWords(nextMastered);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(masteredStorageKey, JSON.stringify(nextMastered));
        } catch {}
      }
      toast(`"${currentWord.word}" đã chuyển vào mục cần ôn tập 🔄`, { id: `unmastered-${wordId}` });
    }

    // Auto advance to next word
    handleNextWord();
  };

  const playAudio = (wordText: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(wordText);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  // Find next lesson in the current book
  const currentLessonIndex = selectedBook.lessons.findIndex((l) => l.id === selectedLesson.id);
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex + 1 < selectedBook.lessons.length
      ? selectedBook.lessons[currentLessonIndex + 1]
      : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── HEADER SECTION ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎴</span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800">Flashcard & Từ Vựng</h1>
          </div>
          <p className="font-bold text-slate-400 text-xs sm:text-sm">
            Học từ vựng qua thẻ tương tác 3D, bài tập theo chủ đề và kiểm tra trắc nghiệm
          </p>
        </div>

        {/* Top Category Tab Switcher */}
        <div className="flex items-center gap-2 bg-amber-50 p-1.5 rounded-2xl border-2 border-amber-200 shrink-0">
          <button
            onClick={() => setTopTab("3d-books")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
              topTab === "3d-books"
                ? "bg-amber-400 text-amber-950 shadow-sm border border-amber-500"
                : "text-amber-800 hover:bg-amber-100"
            }`}
          >
            <BookOpen size={16} /> Sách Flashcard 3D
          </button>
          <button
            onClick={() => setTopTab("topics")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
              topTab === "topics"
                ? "bg-amber-400 text-amber-950 shadow-sm border border-amber-500"
                : "text-amber-800 hover:bg-amber-100"
            }`}
          >
            <Library size={16} /> Bộ Từ Vựng Theo Chủ Đề
          </button>
        </div>
      </div>

      {/* ── TAB 1: 3D FLASHCARD BOOKS ── */}
      {topTab === "3d-books" && (
        <div className="space-y-6">
          {/* Sub-Mode Switcher (3 Distinct Modes) */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-100 p-2 rounded-2xl border-2 border-slate-200">
            <span className="font-bold text-slate-500 text-xs sm:text-sm pl-2">
              Chế độ học tập:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode("flashcard")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                  mode === "flashcard"
                    ? "bg-white text-sky-600 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Layers size={16} /> Thẻ 3D
              </button>
              <button
                onClick={() => setMode("quiz")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                  mode === "quiz"
                    ? "bg-amber-400 text-amber-950 shadow-sm border border-amber-500"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Gamepad2 size={16} /> Quiz Game
              </button>
              <button
                onClick={() => setMode("list")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                  mode === "list"
                    ? "bg-white text-purple-600 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ListOrdered size={16} /> Danh sách tra cứu
              </button>
            </div>
          </div>

          {/* ── BOOK SELECTOR CARDS (Shown on all modes, responsive grid) ── */}
          {mode !== "quiz" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {FLASHCARD_BOOKS.map((book) => {
                const isSelected = selectedBook.id === book.id;
                const bookWords = book.lessons.flatMap((l) => l.words);
                const bookMasteredCount = bookWords.filter((w) =>
                  masteredWords.includes(w.id)
                ).length;

                return (
                  <motion.div
                    key={book.id}
                    whileHover={{ y: -3 }}
                    onClick={() => {
                      setSelectedBook(book);
                      handleSelectLesson(book.lessons[0]);
                    }}
                    className={`p-4 rounded-2xl border-4 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-sky-50 border-sky-400 shadow-[0_4px_0_0_#38bdf8]"
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-[0_4px_0_0_#e2e8f0]"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-2xl">{book.icon}</span>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                          {book.category}
                        </span>
                        <h3 className="font-extrabold text-slate-800 text-sm truncate">
                          {book.name}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-1.5 border-t border-slate-100">
                      <span>{book.lessons.length} Bài học</span>
                      <span
                        className={
                          bookMasteredCount === book.totalWords
                            ? "text-emerald-600 font-black"
                            : ""
                        }
                      >
                        {bookMasteredCount}/{book.totalWords} Đã thuộc
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ── LESSON PILL BAR (Interactive tabs for all 3 modes) ── */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2 px-1">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={14} className="text-amber-500" /> {selectedBook.name} &bull; Danh sách bài học:
              </span>
              <span className="text-xs font-bold text-slate-400">
                {selectedBook.lessons.length} bài
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {selectedBook.lessons.map((lesson) => {
                const isSelected = selectedLesson.id === lesson.id;
                const lessonMasteredCount = lesson.words.filter((w) =>
                  masteredWords.includes(w.id)
                ).length;
                const isLessonCompleted = lessonMasteredCount === lesson.words.length && lesson.words.length > 0;

                return (
                  <button
                    key={lesson.id}
                    onClick={() => handleSelectLesson(lesson)}
                    className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 flex items-center gap-2 cursor-pointer shrink-0 ${
                      isSelected
                        ? "bg-amber-400 border-amber-500 text-amber-950 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {isLessonCompleted ? (
                      <CheckCircle2 size={15} className="text-emerald-700" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                    {lesson.title}
                    <span className="text-[11px] opacity-75 font-semibold">
                      ({lessonMasteredCount}/{lesson.words.length})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── CONTENT AREA BASED ON ACTIVE MODE ── */}
          <div>
            {/* 1. FLASHCARD 3D STUDY MODE */}
            {mode === "flashcard" && (
              <div>
                {/* Check if lesson is fully mastered and not in manual review session */}
                {isLessonFullyMastered && !isReviewingSession ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-xl mx-auto bg-white rounded-[2.5rem] border-4 border-emerald-300 shadow-[0_12px_0_0_#a7f3d0] p-6 sm:p-8 text-center my-4"
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-300 mx-auto flex items-center justify-center mb-4 shadow-inner">
                      <CheckCircle2 size={44} className="text-emerald-500" />
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-1">
                      Đã Thuộc Toàn Bộ Bài Học!
                    </h2>
                    <p className="font-bold text-slate-400 text-xs sm:text-sm mb-4">
                      Bạn đã hoàn thành xuất sắc{" "}
                      <span className="text-emerald-600 font-black">
                        {words.length}/{words.length} từ vựng
                      </span>{" "}
                      của {selectedLesson.title}!
                    </p>

                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 mb-6 flex items-center justify-around">
                      <div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase">
                          Trạng Thái
                        </span>
                        <p className="text-xl font-black text-emerald-800">100% Thuộc</p>
                      </div>
                      <div className="w-px h-10 bg-emerald-200" />
                      <div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase">
                          Số Từ
                        </span>
                        <p className="text-xl font-black text-emerald-800">
                          {words.length} / {words.length}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button3D
                        variant="yellow"
                        size="md"
                        onClick={() => setMode("quiz")}
                        className="flex-1 flex items-center justify-center gap-2 font-black"
                      >
                        <Gamepad2 size={18} /> Làm Quiz Kiểm Tra Ngay
                      </Button3D>

                      <Button3D
                        variant="white"
                        size="md"
                        onClick={() => {
                          setIsReviewingSession(true);
                          setCurrentWordIndex(0);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 font-bold"
                      >
                        <RotateCcw size={18} /> Ôn tập lại thẻ 3D
                      </Button3D>

                      {nextLesson && (
                        <Button3D
                          variant="blue"
                          size="md"
                          onClick={() => handleSelectLesson(nextLesson)}
                          className="flex-1 flex items-center justify-center gap-2 font-black"
                        >
                          Bài tiếp <ChevronRight size={18} />
                        </Button3D>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  /* Standard Learning & Flipping Deck */
                  <div className="flex flex-col items-center space-y-5 pt-2">
                    {/* Review Session Banner if applicable */}
                    {isReviewingSession && (
                      <div className="flex items-center justify-between w-full max-w-lg bg-amber-50 border-2 border-amber-300 px-4 py-2 rounded-2xl text-xs font-bold text-amber-900 shadow-xs">
                        <div className="flex items-center gap-2">
                          <RotateCcw size={15} className="text-amber-600" />
                          <span>Chế độ ôn tập bài học &bull; Không tính lại EXP</span>
                        </div>
                        <button
                          onClick={() => setIsReviewingSession(false)}
                          className="text-amber-700 hover:text-amber-950 underline font-black cursor-pointer"
                        >
                          Thoát
                        </button>
                      </div>
                    )}

                    {/* Progress bar */}
                    <div className="w-full max-w-md bg-slate-200 rounded-full h-3 overflow-hidden border-2 border-slate-300">
                      <div
                        className="bg-amber-400 h-full transition-all duration-300"
                        style={{
                          width: `${((currentWordIndex + 1) / words.length) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between w-full max-w-md text-xs font-bold text-slate-400 px-2">
                      <span>
                        Từ {currentWordIndex + 1} / {words.length}
                      </span>
                      <span className="text-emerald-600 font-extrabold">
                        {currentLessonMasteredCount}/{words.length} Đã thuộc
                      </span>
                    </div>

                    {/* 3D Flashcard */}
                    <FlashcardCard3D
                      key={currentWord?.id}
                      word={currentWord}
                      isMastered={masteredWords.includes(currentWord?.id)}
                    />

                    {/* Anki/Quizlet Standard Learning Decision Controls */}
                    <div className="flex flex-col items-center gap-3 w-full max-w-lg">
                      <div className="grid grid-cols-2 gap-3 w-full">
                        <Button3D
                          variant="white"
                          size="md"
                          onClick={markNeedReview}
                          className="w-full flex items-center justify-center gap-2 text-slate-600 font-bold border-2 border-slate-200 hover:bg-slate-50 cursor-pointer"
                        >
                          <RotateCcw size={18} className="text-amber-500" /> Cần ôn lại
                        </Button3D>

                        <Button3D
                          variant="green"
                          size="md"
                          onClick={markMastered}
                          className="w-full flex items-center justify-center gap-2 font-black shadow-[0_4px_0_0_#047857] cursor-pointer"
                        >
                          <CheckCircle2 size={18} />
                          {isCurrentWordRewarded || isReviewingSession
                            ? isCurrentWordMastered
                              ? "Đã nhớ ✓"
                              : "Đánh dấu nhớ"
                            : "Đã thuộc (+5 EXP)"}
                        </Button3D>
                      </div>

                      {/* Browse Controls (Prev, Shuffle, Next - Squircles with Clear Icons) */}
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={handlePrevWord}
                          disabled={currentWordIndex === 0}
                          className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-300 shadow-[0_4px_0_0_#cbd5e1] flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                          title="Từ trước đó"
                        >
                          <ArrowLeft size={20} />
                        </button>

                        <button
                          onClick={handleShuffle}
                          className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-300 shadow-[0_4px_0_0_#cbd5e1] flex items-center justify-center text-slate-600 hover:bg-slate-50 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                          title="Trộn từ ngẫu nhiên"
                        >
                          <Shuffle size={18} />
                        </button>

                        <button
                          onClick={handleNextWord}
                          className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-300 shadow-[0_4px_0_0_#cbd5e1] flex items-center justify-center text-slate-600 hover:bg-slate-50 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                          title="Từ tiếp theo"
                        >
                          <ArrowRight size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. QUIZ GAME MODE (With Lesson info & Anti-Exploit High Score) */}
            {mode === "quiz" && (
              <FlashcardQuizView
                lessonId={selectedLesson.id}
                lessonTitle={`${selectedBook.name} - ${selectedLesson.title}`}
                words={words}
                allWords={allWords}
                onFinish={() => setMode("flashcard")}
              />
            )}

            {/* 3. VOCABULARY LIST / DICTIONARY MODE (Pure Reference, 0 Gamification) */}
            {mode === "list" && (
              <div className="bg-white rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] p-5 sm:p-7 max-w-4xl mx-auto space-y-5">
                {/* List Header & Search Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-black text-lg sm:text-xl text-slate-800 flex items-center gap-2">
                      <BookOpen className="text-sky-500" size={20} /> Danh Sách Tra Cứu: {selectedLesson.title}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">
                      Chế độ đọc lướt và nghe phát âm nhanh ({filteredListWords.length}/{words.length} từ)
                    </p>
                  </div>

                  {/* Filter Chips */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                    <button
                      onClick={() => setListFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        listFilter === "all"
                          ? "bg-white text-slate-800 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Tất cả ({words.length})
                    </button>
                    <button
                      onClick={() => setListFilter("mastered")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        listFilter === "mastered"
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Đã thuộc ({currentLessonMasteredCount})
                    </button>
                    <button
                      onClick={() => setListFilter("unmastered")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        listFilter === "unmastered"
                          ? "bg-amber-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Cần ôn ({words.length - currentLessonMasteredCount})
                    </button>
                  </div>
                </div>

                {/* Search input */}
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={listSearchQuery}
                    onChange={(e) => setListSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm từ tiếng Anh hoặc nghĩa tiếng Việt..."
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-sky-400 focus:bg-white transition-all"
                  />
                </div>

                {/* Words Table / List Cards */}
                {filteredListWords.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {filteredListWords.map((w, index) => {
                      const isMastered = masteredWords.includes(w.id);
                      const originalIdx = words.findIndex((item) => item.id === w.id);

                      return (
                        <div
                          key={w.id}
                          className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 p-3 rounded-2xl transition-colors"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs shrink-0 mt-0.5 border border-slate-200">
                              {originalIdx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base sm:text-lg font-black text-slate-800">
                                  {w.word}
                                </h4>
                                <span className="text-xs font-mono text-slate-400 font-bold">
                                  {w.ipa}
                                </span>
                                <span className="bg-sky-50 text-sky-600 border border-sky-200 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                                  {w.type}
                                </span>
                                {isMastered && (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-black">
                                    Đã thuộc
                                  </span>
                                )}
                              </div>
                              <p className="font-black text-amber-950 text-base sm:text-lg mt-0.5">
                                {w.mean}
                              </p>
                              {w.exampleEn && (
                                <div className="mt-2 bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 max-w-2xl">
                                  <p className="text-sm sm:text-base font-bold text-slate-800 italic leading-relaxed">
                                    "{w.exampleEn}"
                                  </p>
                                  {w.exampleVi && (
                                    <p className="text-xs sm:text-sm font-semibold text-amber-900 mt-1 leading-normal">
                                      &rarr; {w.exampleVi}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {/* Fast Audio speaker */}
                            <button
                              onClick={() => playAudio(w.word)}
                              className="p-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200 transition-colors cursor-pointer"
                              title="Nghe phát âm"
                            >
                              <Volume2 size={16} />
                            </button>

                            {/* Jump to 3D Flashcard */}
                            <button
                              onClick={() => {
                                setCurrentWordIndex(originalIdx >= 0 ? originalIdx : 0);
                                setIsReviewingSession(true);
                                setMode("flashcard");
                              }}
                              className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-extrabold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="Luyện thẻ 3D"
                            >
                              <Layers size={14} /> Thẻ 3D
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 font-bold">
                    Không tìm thấy từ vựng nào khớp với tìm kiếm.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: BACKEND TOPIC VOCABULARY PACKS ── */}
      {topTab === "topics" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 rounded-[2rem] text-white shadow-lg flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-black">Bộ Từ Vựng Theo Chủ Đề Hệ Thống</h2>
              <p className="text-amber-100 text-sm font-medium mt-1">
                Luyện tập từ vựng chuyên sâu theo từng ngữ cảnh giao tiếp và đề thi
              </p>
            </div>
            <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl font-black text-sm">
              {backendTopics.length} Chủ đề
            </span>
          </div>

          {isLoadingTopics ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin text-amber-500" size={48} />
            </div>
          ) : backendTopics && backendTopics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {backendTopics.map((topic: any, index: number) => {
                const isCompleted = topic.learnedCount >= topic.totalWords && topic.totalWords > 0;
                const progressPercent = topic.totalWords > 0 ? Math.round((topic.learnedCount / topic.totalWords) * 100) : 0;
                
                return (
                  <motion.div
                    key={topic.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -6 }}
                    className={`bg-white rounded-[2rem] border-4 overflow-hidden shadow-sm flex flex-col relative ${
                      isCompleted ? "border-emerald-400" : "border-slate-200"
                    }`}
                  >
                    {isCompleted && (
                      <div className="absolute top-4 right-4 z-10 bg-emerald-500 text-white p-2 rounded-full shadow-lg" title="Đã hoàn thành">
                        <CheckCircle2 size={20} />
                      </div>
                    )}

                    <div className="h-44 bg-gradient-to-br from-amber-100 to-orange-100 relative overflow-hidden flex items-center justify-center">
                      {topic.imageUrl ? (
                        <img 
                          src={topic.imageUrl} 
                          alt={topic.title} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-amber-500/40">
                          <Library size={64} />
                        </div>
                      )}
                      <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs text-amber-900 px-3 py-1 rounded-xl text-xs font-black shadow-xs">
                        {topic.totalWords || 0} Từ vựng
                      </span>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{topic.title}</h3>
                        <p className="text-slate-500 text-sm font-medium line-clamp-2 mb-4">
                          {topic.description || "Luyện tập từ vựng tương tác và làm bài tập trắc nghiệm."}
                        </p>
                      </div>

                      <div>
                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                            <span>Tiến độ học</span>
                            <span>{topic.learnedCount || 0}/{topic.totalWords || 0} từ ({progressPercent}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                            <div 
                              className={`h-full transition-all duration-500 ${isCompleted ? "bg-emerald-500" : "bg-amber-400"}`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        <Link href={`/practice/vocab/${topic.id}`}>
                          <button className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-amber-950 shadow-md transition-all cursor-pointer">
                            <PlayCircle size={18} /> Bắt đầu học ngay
                          </button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-[2rem] border-4 border-slate-200 text-center">
              <p className="text-slate-400 font-bold">Chưa có bộ từ vựng nào.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
