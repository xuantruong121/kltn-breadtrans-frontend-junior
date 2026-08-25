"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, BookOpen, Clock, ChevronRight, ListChecks } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { readingService } from "@/lib/api/services/reading.service";
import { BackButton } from "@/components/ui";

export default function ReadingTopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = Number(params.id);

  const { data: topic, isLoading } = useQuery({
    queryKey: ["reading-topic", topicId],
    queryFn: () => readingService.getTopicById(topicId),
    enabled: !!topicId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-junior-green" size={48} />
      </div>
    );
  }

  // Handle both possible structures (depending on if Axios interceptor formats it or raw response)
  const actualTopic = (topic as any)?.data || topic;

  if (!actualTopic) {
    return (
      <div className="text-center mt-12 text-slate-500 font-medium">
        Không tìm thấy chủ đề.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border-4 border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <BackButton href="/practice/reading" label="Quay lại danh sách chủ đề" />
          <div className="h-6 w-0.5 bg-slate-200 hidden sm:block"></div>
          <div>
            <h1 className="text-xl font-black text-slate-800 line-clamp-1">{actualTopic.name || actualTopic.title}</h1>
            <p className="text-xs font-bold text-slate-400">
              Luyện đọc hiểu song ngữ Anh - Việt thông minh
            </p>
          </div>
        </div>

        <span className="bg-emerald-100 text-emerald-800 px-3.5 py-1.5 rounded-2xl text-xs font-black self-start sm:self-auto">
          {actualTopic.quizzes?.length || 0} Bài đọc
        </span>
      </div>

      {/* 2-COLUMN MAIN LAYOUT */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: ARTICLES LIST */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <div className="bg-white p-6 rounded-[2rem] border-4 border-slate-100 shadow-sm">
            <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <ListChecks size={22} className="text-emerald-500" /> Danh Sách Bài Đọc Thuộc Chủ Đề
            </h2>
            
            {actualTopic.quizzes && actualTopic.quizzes.length > 0 ? (
              <div className="space-y-3">
                {actualTopic.quizzes.map((quiz: any, index: number) => (
                  <Link key={quiz.id} href={`/practice/quizzes/${quiz.id}`} className="block">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ x: 6 }}
                      className="bg-slate-50 hover:bg-emerald-50/50 p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-300 shadow-xs flex items-center justify-between group cursor-pointer transition-all"
                    >
                      <div className="flex-1 pr-4">
                        <h3 className="text-base font-black text-slate-800 group-hover:text-emerald-700 transition-colors mb-1">
                          Bài {index + 1}: {quiz.title}
                        </h3>
                        {quiz.description && (
                          <p className="text-slate-500 text-xs line-clamp-2 mb-3 font-medium">{quiz.description}</p>
                        )}
                        
                        <div className="flex items-center gap-3">
                          {quiz.timeLimit && (
                            <div className="flex items-center gap-1 text-slate-500 text-xs font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                              <Clock size={13} className="text-slate-400" /> {quiz.timeLimit} phút
                            </div>
                          )}
                          {quiz._count?.questions > 0 && (
                            <div className="flex items-center gap-1 text-emerald-700 text-xs font-bold bg-emerald-100/60 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <BookOpen size={13} /> {quiz._count.questions} câu hỏi
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="bg-white text-slate-400 group-hover:bg-emerald-500 group-hover:text-white p-3 rounded-2xl shadow-xs transition-colors shrink-0">
                        <ChevronRight size={20} />
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-bold text-sm">
                Chủ đề này hiện tại chưa có bài đọc nào.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TOPIC CONTEXT & READING TIPS */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Topic Overview Card */}
          <div className="bg-white p-6 rounded-[2rem] border-4 border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-sm">
                <BookOpen size={24} />
              </div>
              <div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Thông Tin Chủ Đề</span>
                <h3 className="text-base font-black text-slate-800">{actualTopic.name || actualTopic.title}</h3>
              </div>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed font-medium">
              {actualTopic.vietnameseName || actualTopic.description || "Hãy chọn một bài đọc bên cạnh để bắt đầu làm quen với từ vựng và cấu trúc ngữ pháp thực tế."}
            </p>
          </div>

          {/* Reading Pro Tips */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-[2rem] border-2 border-emerald-100 space-y-3">
            <h3 className="font-black text-emerald-950 text-base flex items-center gap-2">
              <span>💡</span> Kỹ Năng Đọc Hiểu
            </h3>
            <ul className="space-y-2.5 text-xs font-bold text-emerald-900">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-black">1.</span>
                <span>Đọc lướt (Skimming) toàn bài để nắm ý chính trước khi trả lời câu hỏi.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-black">2.</span>
                <span>Tìm từ khóa (Scanning) trong câu hỏi và đối chiếu với đoạn văn tương ứng.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-black">3.</span>
                <span>Sử dụng chế độ song ngữ để hiểu sâu ngữ cảnh từ vựng mới.</span>
              </li>
            </ul>
          </div>

          {/* Gamification Reward Card */}
          <div className="bg-emerald-50 border-2 border-emerald-200 p-5 rounded-[2rem] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
              📖
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm">Phần Thưởng Luyện Đọc</p>
              <p className="text-xs font-bold text-emerald-800 mt-0.5">+15 EXP mỗi bài đọc hoàn thành</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
