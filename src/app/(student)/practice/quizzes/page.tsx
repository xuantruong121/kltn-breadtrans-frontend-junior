"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  ArrowRight,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { quizService } from "@/lib/api/services/quiz.service";
import { Pagination } from "@/components/ui";

type PaperFilter = "ALL" | "TWO_SKILL" | "FOUR_SKILL";

export default function ToeicPapersPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [searchQuery, setSearchQuery] = useState("");
  const [paperFilter, setPaperFilter] = useState<PaperFilter>("ALL");

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["toeic-papers"],
    queryFn: quizService.getToeicPapers,
  });

  const filteredQuizzes = useMemo(() => {
    if (!quizzes) return [];
    const byFormat = quizzes.filter((quiz: any) => {
      if (paperFilter === "ALL") return true;
      return quiz.bilingualContent?.examFormat === paperFilter;
    });
    if (!searchQuery.trim()) return byFormat;
    const q = searchQuery.toLowerCase().trim();
    return byFormat.filter((quiz: any) =>
      quiz.title?.toLowerCase().includes(q)
    );
  }, [quizzes, searchQuery, paperFilter]);

  const totalPages = Math.ceil((filteredQuizzes.length || 0) / pageSize);
  const paginatedQuizzes = filteredQuizzes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="max-w-5xl mx-auto pb-16 px-4 sm:px-6">
      {/* Breadcrumb & Navigation */}
      <div className="mb-6 flex items-center justify-end">
        <Link
          href="/dashboard"
          className="text-xs font-bold text-slate-500 hover:text-amber-700 transition-colors"
        >
          Trang chủ học viên
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-md mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold text-amber-50">
              <Target size={14} />
              <span>TOEIC 2 kỹ năng &amp; 4 kỹ năng</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Kho đề TOEIC
            </h1>
            <p className="text-sm text-amber-100 max-w-xl leading-relaxed">
              Chọn đề 2 kỹ năng hoặc 4 kỹ năng, làm bài theo thời gian và theo dõi kết quả luyện thi của bạn.
            </p>
          </div>

          <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-3 text-right">
            <div className="bg-white/15 px-4 py-2 rounded-2xl backdrop-blur-xs text-center">
              <div className="text-2xl font-black text-white leading-tight">
                {quizzes?.length || 0}
              </div>
              <div className="text-[11px] font-bold text-amber-100 uppercase tracking-wider">
                Đề TOEIC
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {([
            ["ALL", "Tất cả đề"],
            ["TWO_SKILL", "2 kỹ năng"],
            ["FOUR_SKILL", "4 kỹ năng"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setPaperFilter(value);
                setCurrentPage(1);
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-black transition-colors ${
                paperFilter === value
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm đề TOEIC..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-500">
        <span>{filteredQuizzes.length} đề phù hợp</span>
        <span className="inline-flex items-center gap-1.5"><Clock size={14} /> Bấm giờ theo từng đề</span>
      </div>

      {/* Quizzes List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="animate-spin text-amber-600 mb-3" size={36} />
          <p className="text-xs font-bold text-slate-500">Đang tải kho đề TOEIC...</p>
        </div>
      ) : filteredQuizzes.length > 0 ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {paginatedQuizzes.map((quiz: any, index: number) => {
              const isCompleted = quiz.isCompleted;
              const questionCount = quiz._count?.questions || quiz.questionsCount || 0;

              return (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => router.push(`/practice/quizzes/${quiz.id}`)}
                  className={`group relative rounded-2xl border p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                    isCompleted
                      ? "bg-emerald-50/40 border-emerald-200 hover:border-emerald-300 hover:shadow-md"
                      : "bg-white border-slate-200/80 hover:border-amber-400 hover:shadow-md"
                  }`}
                >
                  <div>
                    {/* Top Row: Tag & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200/60">
                        <BookOpen size={12} /> {quiz.bilingualContent?.skillLabel || "TOEIC"}
                      </span>

                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 size={13} /> Đã hoàn thành
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">
                          Chưa làm
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-2">
                      {quiz.title}
                    </h3>
                  </div>

                  {/* Bottom Row: Metadata & Button */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <BookOpen size={13} className="text-slate-400" />
                      {questionCount} câu hỏi
                    </span>

                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform">
                      {isCompleted ? "Luyện lại" : "Bắt đầu làm"}
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredQuizzes.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
            <Target size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery || paperFilter !== "ALL" ? "Không tìm thấy đề TOEIC phù hợp" : "Chưa có đề TOEIC nào"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? "Hãy thử từ khóa khác hoặc chuyển sang bộ lọc khác."
              : "Các đề TOEIC mới sẽ sớm được cập nhật trên hệ thống."}
          </p>
        </div>
      )}
    </div>
  );
}
