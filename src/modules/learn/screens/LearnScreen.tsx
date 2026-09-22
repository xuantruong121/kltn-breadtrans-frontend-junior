"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Film, 
  Music, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  BookOpen, 
  Loader2,
  Award
} from "lucide-react";
import { learnService } from "@/lib/api/services/learn.service";
import { ContentTopic } from "../types";
import { Button3D } from "@/components/ui";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";

interface TopicProgress {
  userAnswers: Record<number, number>;
  isSubmitted: boolean;
  correctCount: number;
}

export default function LearnScreen() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"movie" | "music">("movie");
  const [selectedTopic, setSelectedTopic] = useState<ContentTopic | null>(null);

  const [progressMap, setProgressMap] = useState<Record<string | number, TopicProgress>>({});
  const [resultMap, setResultMap] = useState<Record<string | number, Array<{ exerciseId: number; correctOption: number; isCorrect: boolean; explanation: string | null }>>>({});

  const { data: topics, isLoading } = useQuery<ContentTopic[]>({
    queryKey: ["content-topics", activeTab],
    queryFn: () => learnService.getContentTopics(activeTab),
  });

  const currentTopic = selectedTopic || (topics && topics.length > 0 ? topics[0] : null);

  const currentTopicId = currentTopic ? currentTopic.id : "";
  const currentProgress: TopicProgress = (currentTopicId && progressMap[currentTopicId]) || {
    userAnswers: {},
    isSubmitted: false,
    correctCount: 0,
  };

  const handleSelectOption = (exerciseId: number, optionIdx: number) => {
    if (!currentTopicId || currentProgress.isSubmitted) return;

    const nextAnswers = { ...currentProgress.userAnswers, [exerciseId]: optionIdx };
    const nextMap = {
      ...progressMap,
      [currentTopicId]: {
        ...currentProgress,
        userAnswers: nextAnswers,
      },
    };

    setProgressMap(nextMap);
  };

  const handleSubmitQuiz = async () => {
    if (!currentTopic?.exercises || currentTopic.exercises.length === 0 || !currentTopicId) return;

    try {
      const result = await learnService.submitAttempt(currentTopic.id, currentProgress.userAnswers);
      const correctCount = result.correctCount as number;

    const nextMap = {
      ...progressMap,
      [currentTopicId]: {
        userAnswers: currentProgress.userAnswers,
        isSubmitted: true,
        correctCount,
      },
    };

    setProgressMap(nextMap);
      setResultMap((previous) => ({ ...previous, [currentTopicId]: result.questionsResult }));

    if (result.rewardBanh > 0) {
      toast.success(`Chúc mừng! Bạn đã trả lời đúng ${correctCount}/${currentTopic.exercises.length} câu và nhận +${result.rewardBanh} 🍞 Bánh Mì!`, {
        icon: "🎉",
      });
      const currentUserId = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({ queryKey: ["user-stats", currentUserId] });
    } else {
      toast("Hãy xem lại video và thử lại để kiếm Bánh Mì nhé!", { icon: "💡" });
    }
    } catch { toast.error("Không thể nộp bài. Vui lòng thử lại."); }
  };

  const handleResetQuiz = (topicId?: string | number) => {
    const targetId = topicId || currentTopicId;
    if (!targetId) return;

    const nextMap = {
      ...progressMap,
      [targetId]: {
        userAnswers: {},
        isSubmitted: false,
        correctCount: 0,
      },
    };

    setProgressMap(nextMap);
    setResultMap((previous) => ({ ...previous, [targetId]: [] }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">🎬</span>
            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100">Học Qua Phim & Âm Nhạc</h1>
          </div>
          <p className="font-bold text-slate-400 dark:text-slate-400 text-sm">
            Luyện phản xạ nghe hiểu tự nhiên và mở rộng vốn từ qua các trích đoạn video thú vị
          </p>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <button
            onClick={() => {
              setActiveTab("movie");
              setSelectedTopic(null);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${
              activeTab === "movie"
                ? "bg-rose-500 text-white shadow-xs"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <Film size={18} /> Phim Hoạt Hình & Sitcom
          </button>
          <button
            onClick={() => {
              setActiveTab("music");
              setSelectedTopic(null);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${
              activeTab === "music"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <Music size={18} /> Bài Hát Tiếng Anh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-sky-500" size={48} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* MAIN PLAYER & EXERCISES (LEFT 2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {currentTopic ? (
              <>
                {/* VIDEO PLAYER */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                  <div className="relative w-full aspect-video bg-slate-900">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${currentTopic.materialLinks?.youtubeId || "jWM0ct-OLsM"}?autoplay=0&rel=0`}
                      title={currentTopic.title}
                      className="w-full h-full border-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/60 font-extrabold text-xs px-3 py-1 rounded-full border border-rose-200 uppercase">
                        {currentTopic.materialLinks?.level || "BEGINNER"}
                      </span>
                      {currentTopic.materialLinks?.duration && (
                        <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs font-bold">
                          <Clock size={14} /> {currentTopic.materialLinks.duration}
                        </span>
                      )}
                      {currentProgress.isSubmitted && (
                        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 text-xs font-black px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 size={14} /> Đã hoàn thành ({currentProgress.correctCount}/{currentTopic.exercises?.length || 0} đúng)
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">{currentTopic.title}</h2>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                      {currentTopic.materialLinks?.description || "Xem trích đoạn video và hoàn thành câu hỏi ôn tập bên dưới."}
                    </p>
                  </div>
                </div>

                {/* EXERCISES SECTION */}
                {currentTopic.exercises && currentTopic.exercises.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
                    <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                      <div className="flex items-center gap-2">
                        <Award className="text-amber-500" size={24} />
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">
                          Câu Hỏi Luyện Tập ({currentTopic.exercises.length} câu)
                        </h3>
                      </div>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-900/50">
                        +5 🍞 / câu đúng
                      </span>
                    </div>

                    <div className="space-y-6">
                      {currentTopic.exercises.map((ex, exIdx) => {
                        const selected = currentProgress.userAnswers[ex.id];
                        const isSubmitted = currentProgress.isSubmitted;
                        const serverResult = resultMap[currentTopicId]?.find((item) => item.exerciseId === ex.id);

                        return (
                          <div key={ex.id} className="space-y-3">
                            <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">
                              <span className="text-sky-500 dark:text-sky-400 font-black mr-2">Câu {exIdx + 1}:</span>
                              {ex.question}
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {ex.options.map((opt, oIdx) => {
                                const isSelected = selected === oIdx;
                                const isCorrect = serverResult?.correctOption === oIdx;

                                let btnStyle = "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-500 text-slate-700 dark:text-slate-300";
                                if (isSelected) {
                                  btnStyle = "bg-sky-100 dark:bg-sky-950/60 border-sky-400 dark:border-sky-600 text-sky-800 dark:text-sky-200 ring-2 ring-sky-300 dark:ring-sky-800";
                                }
                                if (isSubmitted) {
                                  if (isCorrect) {
                                    btnStyle = "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-400 dark:ring-emerald-800 font-black";
                                  } else if (isSelected && !isCorrect) {
                                    btnStyle = "bg-rose-100 dark:bg-rose-950/60 border-rose-400 dark:border-rose-600 text-rose-800 dark:text-rose-200";
                                  } else {
                                    btnStyle = "opacity-50 border-slate-200 dark:border-slate-800";
                                  }
                                }

                                return (
                                  <button
                                    key={oIdx}
                                    disabled={isSubmitted}
                                    onClick={() => handleSelectOption(ex.id, oIdx)}
                                    className={`p-3.5 rounded-2xl border-2 font-bold text-left text-sm transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                                  >
                                    <span>{opt}</span>
                                    {isSubmitted && isCorrect && <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}
                                    {isSubmitted && isSelected && !isCorrect && <XCircle size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>

                            {isSubmitted && serverResult?.explanation && (
                              <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/50 rounded-xl p-3 text-xs font-bold text-sky-800 dark:text-sky-300">
                                💡 Giải thích: {serverResult.explanation}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-4 border-t-2 border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                      {currentProgress.isSubmitted ? (
                        <Button3D variant="white" size="md" onClick={() => handleResetQuiz()}>
                          Làm Lại Bài
                        </Button3D>
                      ) : (
                        <Button3D variant="orange" size="md" onClick={handleSubmitQuiz}>
                          Nộp Bài & Nhận Bánh Mì 🍞
                        </Button3D>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500 font-bold">
                Chưa có bài học nào trong danh mục này.
              </div>
            )}
          </div>

          {/* PLAYLIST SIDEBAR (RIGHT 1/3) */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="text-sky-500 dark:text-sky-400" size={20} />
                Danh Sách Video ({topics?.length || 0})
              </h3>

              <div className="space-y-3">
                {topics?.map((topic) => {
                  const isSelected = currentTopic?.id === topic.id;
                  const topicProg = progressMap[topic.id];
                  const isDone = topicProg?.isSubmitted;

                  return (
                    <motion.div
                      key={topic.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        setSelectedTopic(topic);
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex gap-3.5 items-start ${
                        isSelected
                          ? "bg-sky-50 border-sky-400 dark:bg-sky-950/40 dark:border-sky-600 shadow-xs"
                          : isDone
                          ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-850 hover:border-emerald-300 dark:hover:border-emerald-700"
                          : "bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className={`relative w-16 h-12 rounded-xl overflow-hidden shrink-0 border flex items-center justify-center text-white ${
                        isDone ? "bg-emerald-600 border-emerald-400" : "bg-slate-800 border-slate-300 dark:border-slate-700"
                      }`}>
                        {isDone ? <CheckCircle2 size={20} /> : <Play size={18} className="fill-white" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                            {topic.title}
                          </h4>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-400 dark:text-slate-500">
                            {topic.materialLinks?.level || "Beginner"} • {topic.exercises?.length || 0} bài tập
                          </span>
                          {isDone && (
                            <span className="text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] bg-emerald-100 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                              Đã xong ({topicProg.correctCount}/{topic.exercises?.length || 0})
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
