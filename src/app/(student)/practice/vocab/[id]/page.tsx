"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Star, Volume2, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { vocabService } from "@/lib/api/services/vocab.service";

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
    mutationFn: ({ wordId, isStarred }: { wordId: number, isStarred: boolean }) => vocabService.starWord(wordId, isStarred),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vocab-topic", topicId] }),
  });

  const toggleMasteredMut = useMutation({
    mutationFn: ({ wordId, isMastered }: { wordId: number, isMastered: boolean }) => vocabService.masterWord(wordId, isMastered),
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
      <div className="max-w-4xl mx-auto text-center mt-12">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Oops!</h2>
        <p className="text-slate-500 mb-6">Chủ đề này chưa có từ vựng nào.</p>
        <button onClick={() => router.back()} className="btn-primary-3d px-6 py-3">Quay lại</button>
      </div>
    );
  }

  const words = topic.words;
  const currentWord = words[currentIndex];

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
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
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"
        >
          <ArrowLeft size={20} /> Quay lại
        </button>
        <div className="text-slate-500 font-bold bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
          {currentIndex + 1} / {words.length}
        </div>
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-800">{topic.title}</h1>
      </div>

      {isCompleted ? (
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3rem] shadow-xl border-4 border-green-100 text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Chúc mừng!</h2>
          <p className="text-slate-500 mb-8 text-lg">Bạn đã học xong tất cả từ vựng trong chủ đề này.</p>
          <button 
            onClick={() => router.push('/practice/vocab')}
            className="btn-primary-3d px-8 py-4 text-lg w-full"
          >
            Quay lại Đảo Luyện Tập
          </button>
        </div>
      ) : (
        <div className="relative w-full max-w-2xl mx-auto perspective-1000 h-96">
          <AnimatePresence mode="wait">
            <motion.div
            key={currentIndex + (isFlipped ? "-back" : "-front")}
            initial={{ opacity: 0, rotateY: isFlipped ? -90 : 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: isFlipped ? 90 : -90 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsFlipped(!isFlipped)}
            className="absolute inset-0 w-full h-full bg-white rounded-[3rem] shadow-xl border-4 border-slate-100 cursor-pointer flex flex-col items-center justify-center p-8 text-center"
          >
            {/* Action buttons (Star) */}
            <div className="absolute top-6 right-6 flex gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); toggleStarMut.mutate({ wordId: currentWord.id, isStarred: !currentWord.isStarred }); }}
                className={`p-3 rounded-full transition-colors ${currentWord.isStarred ? 'bg-yellow-100 text-yellow-500' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
              >
                <Star size={24} fill={currentWord.isStarred ? "currentColor" : "none"} />
              </button>
            </div>

            {!isFlipped ? (
              // FRONT OF CARD
              <>
                <h2 className="text-6xl font-extrabold text-slate-800 mb-2">{currentWord.word}</h2>
                {currentWord.ipaUs && (
                  <p className="text-2xl text-slate-400 font-medium mb-8 tracking-wide font-sans">{currentWord.ipaUs}</p>
                )}
                {!currentWord.ipaUs && <div className="h-10 mb-8"></div>}
                
                <button 
                  onClick={(e) => playAudio(e, currentWord.word, currentWord.audioUs)}
                  className="flex items-center justify-center p-4 rounded-full bg-slate-50 text-slate-500 hover:text-junior-blue hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-200 transition-all shadow-sm active:scale-95"
                >
                  <Volume2 size={32} />
                </button>
              </>
            ) : (
              // BACK OF CARD
              <>
                <h3 className="text-4xl font-bold text-junior-orange mb-4">{currentWord.meaning}</h3>
                <span className="inline-block bg-slate-100 text-slate-600 font-bold px-4 py-1 rounded-full text-sm mb-6 uppercase tracking-wider">
                  {currentWord.pos}
                </span>
                {currentWord.exampleEn && (
                  <div className="bg-slate-50 p-6 rounded-2xl w-full border border-slate-100 mt-4">
                    <p className="text-lg text-slate-700 font-medium mb-2 italic">"{currentWord.exampleEn}"</p>
                    <p className="text-slate-500">{currentWord.exampleVi}</p>
                  </div>
                )}
                <div className="flex gap-4 mt-8 w-full">
                  <button 
                    onClick={(e) => handleMark(e, false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors border border-red-200 shadow-sm active:scale-95"
                  >
                    Nhắc học lại sau
                  </button>
                  <button 
                    onClick={(e) => handleMark(e, true)}
                    className="flex-1 py-4 rounded-2xl font-bold text-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors border border-green-200 shadow-sm active:scale-95"
                  >
                    Đã thuộc
                  </button>
                </div>
              </>
            )}

            {!isFlipped && (
              <div className="absolute bottom-6 text-slate-300 font-medium text-sm">
                Nhấp để lật thẻ
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      )}
    </div>
  );
}
