"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Layers, 
  Gamepad2, 
  ListOrdered, 
  ArrowLeft, 
  ArrowRight, 
  Shuffle, 
  CheckCircle2, 
  BookOpen, 
  Volume2
} from "lucide-react";
import { FLASHCARD_BOOKS } from "../services/flashcardData";
import { FlashcardBook, FlashcardLesson, StudyMode } from "../types";
import { FlashcardCard3D } from "../components/FlashcardCard3D";
import { FlashcardQuizView } from "../components/FlashcardQuizView";
import { Button3D } from "@/components/ui";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { gamificationService } from "@/lib/api/services/gamification.service";
import toast from "react-hot-toast";

export const FlashcardScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { addExp } = useGamificationStore();
  const queryClient = useQueryClient();

  const [selectedBook, setSelectedBook] = useState<FlashcardBook>(FLASHCARD_BOOKS[0]);
  const [selectedLesson, setSelectedLesson] = useState<FlashcardLesson>(FLASHCARD_BOOKS[0].lessons[0]);
  const [mode, setMode] = useState<StudyMode>("flashcard");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const storageKey = `breadtrans_mastered_words_${user?.id || "guest"}`;

  const [masteredWords, setMasteredWords] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`breadtrans_mastered_words_${user?.id || "guest"}`);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const words = selectedLesson.words;
  const currentWord = words[currentWordIndex];

  // Scoped count for the current lesson only
  const currentLessonMasteredCount = words.filter((w) => masteredWords.includes(w.id)).length;

  // Collect all words across books for quiz distractors
  const allWords = FLASHCARD_BOOKS.flatMap((b) => b.lessons.flatMap((l) => l.words));

  const handleNextWord = () => {
    if (currentWordIndex + 1 < words.length) {
      setCurrentWordIndex((i) => i + 1);
    } else {
      // Completed deck
      setCurrentWordIndex(0);
      addExp(15);
      toast.success("Hoàn thành vòng ôn tập bài học! +15 EXP ⭐", { id: "round-completed" });
      if (user) {
        gamificationService.recordVocabLearned(1).then(() => {
          queryClient.invalidateQueries({ queryKey: ["myQuests"] });
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        }).catch(() => {});
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

  const toggleMastered = (id: string) => {
    const isCurrentlyMastered = masteredWords.includes(id);
    const next = isCurrentlyMastered
      ? masteredWords.filter((item) => item !== id)
      : [...masteredWords, id];

    setMasteredWords(next);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    }

    if (!isCurrentlyMastered) {
      toast.success("Đã thuộc từ vựng! +5 EXP 🍞", { id: `mastered-${id}` });
      addExp(5);
      if (user) {
        gamificationService.recordVocabLearned(1).then(() => {
          queryClient.invalidateQueries({ queryKey: ["myQuests"] });
          queryClient.invalidateQueries({ queryKey: ["profile"] });
          queryClient.invalidateQueries({ queryKey: ["stats"] });
        }).catch(() => {});
      }
    }
  };

  const playAllAudio = (wordText: string) => {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(wordText);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎴</span>
            <h1 className="text-3xl font-black text-slate-800">Flashcard Từ Vựng</h1>
          </div>
          <p className="font-bold text-slate-400 text-sm">
            Học từ vựng qua hình ảnh 3D và mini game ghi nhớ đỉnh cao
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border-2 border-slate-200">
          <button
            onClick={() => setMode("flashcard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm transition-all cursor-pointer ${
              mode === "flashcard"
                ? "bg-white text-sky-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers size={18} /> Thẻ 3D
          </button>
          <button
            onClick={() => setMode("quiz")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm transition-all cursor-pointer ${
              mode === "quiz"
                ? "bg-amber-400 text-amber-900 shadow-sm border border-amber-500"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Gamepad2 size={18} /> Quiz Game
          </button>
          <button
            onClick={() => setMode("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm transition-all cursor-pointer ${
              mode === "list"
                ? "bg-white text-purple-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ListOrdered size={18} /> Danh sách
          </button>
        </div>
      </div>

      {/* BOOK & LESSON SELECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Book Selector */}
        {FLASHCARD_BOOKS.map((book) => {
          const isSelected = selectedBook.id === book.id;
          const bookWords = book.lessons.flatMap((l) => l.words);
          const bookMasteredCount = bookWords.filter((w) => masteredWords.includes(w.id)).length;
          return (
            <motion.div
              key={book.id}
              whileHover={{ y: -4 }}
              onClick={() => {
                setSelectedBook(book);
                setSelectedLesson(book.lessons[0]);
                setCurrentWordIndex(0);
              }}
              className={`p-5 rounded-3xl border-4 cursor-pointer transition-all ${
                isSelected
                  ? "bg-sky-50 border-sky-400 shadow-[0_6px_0_0_#38bdf8]"
                  : "bg-white border-slate-200 hover:border-slate-300 shadow-[0_6px_0_0_#e2e8f0]"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{book.icon}</span>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {book.category}
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-base line-clamp-1">
                    {book.name}
                  </h3>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 pt-2 border-t border-slate-100">
                <span>{book.lessons.length} Bài học</span>
                <span className={bookMasteredCount === book.totalWords ? "text-emerald-600 font-black" : ""}>
                  {bookMasteredCount}/{book.totalWords} Từ đã thuộc
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* LESSON TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {selectedBook.lessons.map((lesson) => {
          const isSelected = selectedLesson.id === lesson.id;
          const lessonMasteredCount = lesson.words.filter((w) => masteredWords.includes(w.id)).length;
          const isLessonCompleted = lessonMasteredCount === lesson.words.length;
          return (
            <button
              key={lesson.id}
              onClick={() => {
                setSelectedLesson(lesson);
                setCurrentWordIndex(0);
              }}
              className={`px-4 py-2.5 rounded-2xl font-black text-sm whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                isSelected
                  ? "bg-slate-800 text-white shadow-md border-2 border-slate-900"
                  : "bg-white text-slate-500 hover:bg-slate-100 border-2 border-slate-200"
              }`}
            >
              <span>{lesson.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-lg ${
                isSelected 
                  ? isLessonCompleted ? "bg-emerald-500 text-white font-black" : "bg-slate-700 text-slate-200" 
                  : isLessonCompleted ? "bg-emerald-100 text-emerald-700 font-black" : "bg-slate-100 text-slate-400 font-bold"
              }`}>
                {lessonMasteredCount}/{lesson.words.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* STUDY AREA BY MODE */}
      <div className="pt-2">
        {mode === "flashcard" && (
          <div className="space-y-6">
            {/* Progress Counter */}
            <div className="flex items-center justify-between max-w-lg mx-auto px-2">
              <span className="font-extrabold text-slate-400 text-sm">
                Từ vựng: <strong className="text-slate-800">{currentWordIndex + 1}</strong> / {words.length}
              </span>
              <span className={`font-extrabold text-sm flex items-center gap-1.5 ${
                currentLessonMasteredCount === words.length ? "text-emerald-600" : "text-slate-600"
              }`}>
                <CheckCircle2 size={16} className={currentLessonMasteredCount === words.length ? "text-emerald-600" : "text-slate-400"} /> 
                Đã thuộc: <strong className={currentLessonMasteredCount === words.length ? "text-emerald-600 font-black" : "text-slate-800"}>{currentLessonMasteredCount}</strong>/{words.length}
              </span>
            </div>

            {/* 3D Card */}
            <FlashcardCard3D
              key={currentWord.id}
              word={currentWord}
              isMastered={masteredWords.includes(currentWord.id)}
              onMastered={() => toggleMastered(currentWord.id)}
            />

            {/* Navigation Controls */}
            <div className="flex items-center justify-center gap-4 max-w-lg mx-auto pt-2">
              <Button3D
                variant="white"
                size="md"
                onClick={handlePrevWord}
                disabled={currentWordIndex === 0}
              >
                <ArrowLeft size={18} /> Trước
              </Button3D>

              <Button3D
                variant="yellow"
                size="md"
                onClick={handleShuffle}
                title="Ngẫu nhiên"
              >
                <Shuffle size={18} />
              </Button3D>

              <Button3D
                variant="blue"
                size="md"
                onClick={handleNextWord}
              >
                Tiếp theo <ArrowRight size={18} />
              </Button3D>
            </div>
          </div>
        )}

        {mode === "quiz" && (
          <FlashcardQuizView
            words={words}
            allWords={allWords}
            onFinish={() => setMode("flashcard")}
          />
        )}

        {mode === "list" && (
          <div className="bg-white rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] p-6 max-w-3xl mx-auto">
            <h3 className="font-black text-xl text-slate-800 mb-4 flex items-center gap-2">
              <BookOpen className="text-sky-500" /> Danh sách từ trong {selectedLesson.title}
            </h3>

            <div className="divide-y divide-slate-100">
              {words.map((w, index) => (
                <div key={w.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0 mt-1">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black text-slate-800">{w.word}</h4>
                        <span className="text-xs font-mono text-slate-400">{w.ipa}</span>
                        <span className="bg-sky-50 text-sky-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                          {w.type}
                        </span>
                      </div>
                      <p className="font-bold text-amber-800 text-sm">{w.mean}</p>
                      <p className="text-xs text-slate-400 italic mt-0.5">"{w.exampleEn}"</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => playAllAudio(w.word)}
                      className="p-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200 transition-colors"
                    >
                      <Volume2 size={18} />
                    </button>
                    <button
                      onClick={() => toggleMastered(w.id)}
                      className={`p-2.5 rounded-xl border transition-colors ${
                        masteredWords.includes(w.id)
                          ? "bg-emerald-50 text-emerald-600 border-emerald-300"
                          : "bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600"
                      }`}
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
