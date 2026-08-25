"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Star, Volume2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { vocabService } from "@/lib/api/services/vocab.service";
import { BackButton } from "@/components/ui";

export default function VocabFlashcardsPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const topicId = Number(id);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const { data: topic, isLoading } = useQuery({
    queryKey: ["vocab-topic", topicId],
    queryFn: () => vocabService.getTopicById(topicId),
    enabled: !!topicId,
  });

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
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-junior-orange" size={48} />
      </div>
    );
  }

  if (!topic || !topic.words || topic.words.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center mt-12 space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Chưa có từ vựng</h2>
        <p className="text-slate-500">Chủ đề này hiện tại chưa có từ vựng nào.</p>
        <div className="flex justify-center">
          <BackButton href="/flashcard" label="Quay lại Flashcard & Từ vựng" />
        </div>
      </div>
    );
  }

  const words = topic.words;
  const currentWord = words[currentIndex];

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleMark = (e: React.MouseEvent, isMastered: boolean) => {
    e.stopPropagation();
    toggleMasteredMut.mutate({ wordId: currentWord.id, isMastered });
    handleNext();
  };

  const playAudio = (e: React.MouseEvent, text: string, url?: string) => {
    e.stopPropagation();
    if (url) {
      const audio = new Audio(url);
      audio.play();
    } else {
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border-4 border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <BackButton href="/flashcard" label="Quay lại Flashcard & Từ vựng" />
          <div className="h-6 w-0.5 bg-slate-200 hidden sm:block"></div>
          <div>
            <h1 className="text-xl font-black text-slate-800 line-clamp-1">{topic.title}</h1>
            <p className="text-xs font-bold text-slate-400">
              Bộ từ vựng tương tác theo chủ đề • Nhấp để lật thẻ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-amber-50 px-4 py-2 rounded-2xl border-2 border-amber-200 self-start sm:self-auto">
          <span className="text-xs font-black text-amber-900">
            Từ {currentIndex + 1} / {words.length}
          </span>
        </div>
      </div>

      {/* 2-COLUMN MAIN LAYOUT */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: ACTIVE FLASHCARD */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {isCompleted ? (
            <div className="bg-white p-12 rounded-[3rem] shadow-sm border-4 border-emerald-200 text-center space-y-6">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-inner">
                <CheckCircle2 size={48} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">Chúc Mừng Bạn!</h2>
                <p className="text-slate-500 font-medium text-base">
                  Bạn đã học xong tất cả từ vựng trong chủ đề này.
                </p>
              </div>
              <div className="pt-4 flex justify-center">
                <Link href="/flashcard">
                  <button className="px-8 py-4 bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 font-black rounded-2xl shadow-md text-base hover:scale-105 transition-transform cursor-pointer">
                    Quay lại Trang Flashcard & Từ Vựng
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border-4 border-slate-100 shadow-sm space-y-6">
              {/* Card Container */}
              <div className="relative w-full min-h-[360px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIndex + (isFlipped ? "-back" : "-front")}
                    initial={{ opacity: 0, rotateY: isFlipped ? -90 : 90 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    exit={{ opacity: 0, rotateY: isFlipped ? 90 : -90 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="w-full h-full min-h-[340px] bg-gradient-to-br from-amber-50/50 to-orange-50/30 rounded-3xl shadow-md border-4 border-amber-200/80 cursor-pointer flex flex-col items-center justify-center p-8 text-center relative select-none"
                  >
                    {/* Star Button */}
                    <div className="absolute top-5 right-5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStarMut.mutate({
                            wordId: currentWord.id,
                            isStarred: !currentWord.isStarred,
                          });
                        }}
                        className={`p-3 rounded-2xl transition-colors cursor-pointer ${
                          currentWord.isStarred
                            ? "bg-amber-100 text-amber-500 border border-amber-300"
                            : "bg-white text-slate-400 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        <Star size={20} fill={currentWord.isStarred ? "currentColor" : "none"} />
                      </button>
                    </div>

                    {!isFlipped ? (
                      // FRONT
                      <>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-800 mb-2 break-words max-w-full px-2">
                          {currentWord.word}
                        </h2>
                        {currentWord.ipaUs ? (
                          <p className="text-lg sm:text-xl text-slate-400 font-mono font-bold mb-6 break-words">
                            {currentWord.ipaUs}
                          </p>
                        ) : (
                          <div className="h-6 mb-4"></div>
                        )}

                        <button
                          onClick={(e) => playAudio(e, currentWord.word, currentWord.audioUs)}
                          className="flex items-center justify-center p-4 rounded-2xl bg-white text-amber-600 hover:bg-amber-50 border-2 border-amber-200 transition-all shadow-sm active:scale-95 cursor-pointer"
                          title="Nghe phát âm"
                        >
                          <Volume2 size={28} />
                        </button>
                        <p className="text-xs font-bold text-slate-400 mt-6">
                          👉 Nhấn vào thẻ để xem nghĩa tiếng Việt
                        </p>
                      </>
                    ) : (
                      // BACK
                      <>
                        <span className="inline-block bg-amber-100 text-amber-800 font-black px-3 py-1 rounded-xl text-xs mb-3 uppercase tracking-wider">
                          {currentWord.pos || "Từ vựng"}
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-black text-amber-900 mb-4 break-words max-w-full px-2">
                          {currentWord.meaning}
                        </h3>

                        {currentWord.exampleEn && (
                          <div className="bg-white p-4 rounded-2xl w-full border border-amber-200/60 text-left mb-4">
                            <p className="text-sm text-slate-800 font-bold mb-1 italic break-words">
                              "{currentWord.exampleEn}"
                            </p>
                            <p className="text-xs text-slate-500 font-medium break-words">
                              {currentWord.exampleVi}
                            </p>
                          </div>
                        )}

                        <p className="text-xs font-bold text-slate-400">
                          👉 Nhấn vào thẻ để quay lại từ tiếng Anh
                        </p>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  onClick={(e) => handleMark(e, false)}
                  className="flex-1 py-3.5 px-4 rounded-2xl font-black text-sm bg-rose-50 hover:bg-rose-100 text-rose-600 border-2 border-rose-200 transition-colors shadow-xs active:scale-95 cursor-pointer text-center"
                >
                  Nhắc học lại sau
                </button>
                <button
                  onClick={(e) => handleMark(e, true)}
                  className="flex-1 py-3.5 px-4 rounded-2xl font-black text-sm bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-md active:scale-95 cursor-pointer text-center"
                >
                  Đã thuộc từ này ✓
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: TOPIC WORD LIST */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border-4 border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-base">Danh Sách Từ Trong Chủ Đề</h3>
              <span className="text-xs font-bold text-slate-400">{words.length} từ</span>
            </div>

            <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
              {words.map((w: any, idx: number) => {
                const isCurrent = idx === currentIndex;
                const isWordMastered = w.isMastered;

                return (
                  <button
                    key={w.id || idx}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsFlipped(false);
                    }}
                    className={`w-full p-3 rounded-2xl text-left font-bold text-xs transition-all flex items-center justify-between cursor-pointer border-2 ${
                      isCurrent
                        ? "bg-amber-100 text-amber-900 border-amber-400 shadow-xs scale-[1.02]"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="w-5 h-5 rounded-lg bg-white flex items-center justify-center font-black text-[10px] text-slate-400 shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate font-black">{w.word}</span>
                    </div>
                    {isWordMastered && (
                      <span className="text-emerald-600 font-black text-[10px] shrink-0 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Thuộc ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gamification Reward Card */}
          <div className="bg-amber-50 border-2 border-amber-200 p-5 rounded-[2rem] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center text-2xl shadow-sm shrink-0">
              🎴
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm">Phần Thưởng Từ Vựng</p>
              <p className="text-xs font-bold text-amber-800 mt-0.5">+5 EXP mỗi từ học thuộc</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
