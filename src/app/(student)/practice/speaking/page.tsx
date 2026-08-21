"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  Search, 
  Sparkles,
  Layers,
  Award,
  ChevronRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { speakingService } from "@/lib/api/services/speaking.service";
import { Pagination } from "@/components/ui";

const DIFFICULTY_WEIGHT: Record<string, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
};

const DIFFICULTY_LABELS: Record<string, { label: string; color: string; bg: string; border: string; text: string; icon: string }> = {
  ALL: { label: "Tất Cả", color: "purple", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", icon: "✨" },
  BEGINNER: { label: "Cơ Bản (Dễ)", color: "emerald", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: "🟢" },
  INTERMEDIATE: { label: "Trung Cấp (Vừa)", color: "amber", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "🟡" },
  ADVANCED: { label: "Nâng Cao (Khó)", color: "rose", bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", icon: "🔴" },
};

export default function SpeakingExercisesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const { data: exercises, isLoading } = useQuery<any[]>({
    queryKey: ["speaking-exercises"],
    queryFn: async () => {
      const res: any = await speakingService.getExercises();
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // Extract available unique categories
  const categories = useMemo(() => {
    if (!exercises) return [];
    const set = new Set<string>();
    exercises.forEach((ex) => {
      if (ex.category) set.add(ex.category);
    });
    return Array.from(set);
  }, [exercises]);

  // Filter & Sort from Easy to Hard
  const filteredAndSortedExercises = useMemo(() => {
    if (!exercises) return [];

    const list = exercises.filter((ex) => {
      const matchSearch =
        ex.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.targetText?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchDifficulty =
        selectedDifficulty === "ALL" ||
        ex.difficulty?.toUpperCase() === selectedDifficulty;

      const matchCategory =
        selectedCategory === "ALL" ||
        ex.category?.toUpperCase() === selectedCategory.toUpperCase();

      return matchSearch && matchDifficulty && matchCategory;
    });

    // Sort order: BEGINNER (1) -> INTERMEDIATE (2) -> ADVANCED (3) -> by ID
    return list.sort((a, b) => {
      const weightA = DIFFICULTY_WEIGHT[a.difficulty?.toUpperCase()] || 99;
      const weightB = DIFFICULTY_WEIGHT[b.difficulty?.toUpperCase()] || 99;
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      return (a.id || 0) - (b.id || 0);
    });
  }, [exercises, searchTerm, selectedDifficulty, selectedCategory]);

  // Counts for tabs
  const counts = useMemo(() => {
    if (!exercises) return { ALL: 0, BEGINNER: 0, INTERMEDIATE: 0, ADVANCED: 0 };
    return {
      ALL: exercises.length,
      BEGINNER: exercises.filter((e) => e.difficulty === "BEGINNER").length,
      INTERMEDIATE: exercises.filter((e) => e.difficulty === "INTERMEDIATE").length,
      ADVANCED: exercises.filter((e) => e.difficulty === "ADVANCED").length,
    };
  }, [exercises]);

  const totalPages = Math.ceil(filteredAndSortedExercises.length / pageSize);
  const paginatedExercises = filteredAndSortedExercises.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Back Navigation */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-black text-sm transition-colors cursor-pointer"
      >
        <ArrowLeft size={18} /> Quay lại Đảo Luyện Tập
      </button>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[2.5rem] p-6 md:p-8 text-white shadow-[0_10px_0_0_#4f46e5] relative overflow-hidden border-4 border-purple-700">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 text-white shadow-inner">
              <Mic size={36} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-200 text-purple-900 border border-purple-300/60">
                  Phát Âm AI Chấm Chuẩn Âm Vị
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black mt-1">Luyện Phát Âm Trực Tiếp</h1>
              <p className="text-purple-100 text-xs md:text-sm font-medium mt-1">
                Luyện nói tiếng Anh theo các cấp độ từ Dễ đến Khó với phản hồi tức thì
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 self-start md:self-auto">
            <Award className="text-amber-300 w-6 h-6 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-purple-200 block uppercase">Tổng Bài Tập</span>
              <span className="text-lg font-black text-white">{exercises?.length || 0} bài luyện nói</span>
            </div>
          </div>
        </div>

        {/* Ambient Glows */}
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-pink-400/20 rounded-full blur-2xl" />
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-purple-300/20 rounded-full blur-2xl" />
      </div>

      {/* Control Box: Filter Tabs, Category, and Search */}
      <div className="bg-white rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] p-6 space-y-5">
        {/* 1. Difficulty Level Tabs (Sort from Easy to Hard) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers size={18} className="text-purple-600" />
            <h2 className="text-sm font-black uppercase text-slate-700 tracking-wider">
              Cấp Độ Luyện Nói (Từ Dễ đến Khó)
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(["ALL", "BEGINNER", "INTERMEDIATE", "ADVANCED"] as const).map((diff) => {
              const info = DIFFICULTY_LABELS[diff];
              const isSelected = selectedDifficulty === diff;
              const count = counts[diff];

              return (
                <button
                  key={diff}
                  onClick={() => {
                    setSelectedDifficulty(diff);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center justify-between border-2 cursor-pointer ${
                    isSelected
                      ? "bg-purple-600 text-white border-purple-700 shadow-[0_4px_0_0_#7e22ce] translate-y-[-2px]"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-purple-50/60 hover:border-purple-200"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{info.icon}</span>
                    <span>{info.label}</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-200/80 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Search & Category Filters */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm bài tập theo tên hoặc câu tiếng Anh..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-purple-400 font-bold text-sm text-slate-800"
            />
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:border-purple-400 cursor-pointer"
              >
                <option value="ALL">📁 Tất cả chủ đề ({categories.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Exercises List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0]">
          <Loader2 className="animate-spin text-purple-600 mb-3" size={44} />
          <p className="text-slate-400 font-bold text-sm">Đang tải danh sách bài luyện nói...</p>
        </div>
      ) : filteredAndSortedExercises.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Danh sách bài tập ({filteredAndSortedExercises.length} bài phù hợp)
            </span>
            <span className="text-xs font-bold text-purple-600 flex items-center gap-1">
              <Sparkles size={14} /> Sắp xếp: Dễ &rarr; Khó
            </span>
          </div>

          <div className="flex flex-col gap-3.5">
            <AnimatePresence mode="popLayout">
              {paginatedExercises.map((exercise: any, index: number) => {
                const isCompleted = exercise.isCompleted;
                const difficulty = exercise.difficulty?.toUpperCase() || "BEGINNER";

                return (
                  <motion.div
                    key={exercise.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: index * 0.04 }}
                    whileHover={{ y: -2 }}
                    className={`p-5 md:p-6 rounded-[1.8rem] border-4 flex items-center justify-between shadow-[0_6px_0_0_#e2e8f0] cursor-pointer transition-all ${
                      isCompleted
                        ? "bg-emerald-50/60 border-emerald-300 hover:border-emerald-400 shadow-[0_6px_0_0_#a7f3d0]"
                        : "bg-white border-slate-200 hover:border-purple-300 hover:shadow-[0_6px_0_0_#e9d5ff]"
                    }`}
                    onClick={() => router.push(`/practice/speaking/${exercise.id}`)}
                  >
                    <div className="space-y-2 flex-1 pr-4">
                      {/* Tags */}
                      <div className="flex items-center flex-wrap gap-2">
                        {/* Difficulty Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase border ${
                            difficulty === "BEGINNER"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : difficulty === "INTERMEDIATE"
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-rose-100 text-rose-800 border-rose-300"
                          }`}
                        >
                          {difficulty === "BEGINNER"
                            ? "🟢 Cơ bản"
                            : difficulty === "INTERMEDIATE"
                            ? "🟡 Trung cấp"
                            : "🔴 Nâng cao"}
                        </span>

                        {/* Category Badge */}
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase border border-slate-200">
                          {exercise.category || "GENERAL"}
                        </span>

                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[11px] font-black border border-emerald-200">
                            <CheckCircle2 size={13} /> Đã hoàn thành
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-lg md:text-xl font-black text-slate-800 leading-snug group-hover:text-purple-600 transition-colors">
                        {exercise.title}
                      </h3>

                      {/* English Target Sentence Preview */}
                      {exercise.targetText && (
                        <p className="text-xs md:text-sm font-semibold text-slate-400 line-clamp-1 italic">
                          &ldquo;{exercise.targetText}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Right CTA Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-center ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                            : "bg-purple-50 text-purple-600 border-purple-200 group-hover:bg-purple-600 group-hover:text-white"
                        }`}
                      >
                        <Mic size={24} />
                      </div>
                      <ChevronRight size={18} className="text-slate-300 hidden md:block" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* 3D Standard Pagination */}
          <div className="pt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedExercises.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] text-center space-y-3">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Search size={32} />
          </div>
          <p className="text-slate-700 font-black text-base">Không tìm thấy bài luyện nói phù hợp.</p>
          <p className="text-slate-400 font-medium text-xs">
            Hãy thử tìm bằng từ khóa khác hoặc chuyển sang tab cấp độ khác nhé!
          </p>
        </div>
      )}
    </div>
  );
}

