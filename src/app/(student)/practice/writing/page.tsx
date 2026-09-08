"use client";

import { useQuery } from "@tanstack/react-query";
import { PenTool, Loader2, ArrowRight, CheckCircle2, BookOpen } from "lucide-react";
import Link from "next/link";
import { writingService } from "@/lib/api/services/writing.service";

export default function WritingTopicsPage() {
  const { data: topicsData, isLoading } = useQuery({
    queryKey: ["writing-topics"],
    queryFn: writingService.getTopics,
  });
  const topics = (topicsData as any)?.quizzes || topicsData || [];

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 uppercase tracking-wider">
            <PenTool size={14} /> Luyện viết tiếng Anh với AI
          </div>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Luyện Viết AI
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Viết bài theo các chủ đề thực tế trong môi trường làm việc và nhận đánh giá ngữ pháp, từ vựng chi tiết từ AI.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : topics && topics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map((topic: any) => {
            const isCompleted = topic.isCompleted;
            return (
              <div
                key={topic.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs transition duration-200 hover:-translate-y-1 hover:border-rose-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                      Workplace Writing
                    </span>
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 size={12} /> Đã hoàn thành
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 line-clamp-1">
                    {topic.topicName || topic.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {topic.description ||
                      "Luyện tập viết câu và đoạn văn trả lời email theo yêu cầu công việc."}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Link
                    href={`/practice/writing/${topic.id}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-blue-700"
                  >
                    {isCompleted ? "Ôn tập lại" : "Bắt đầu viết"} <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center max-w-lg mx-auto space-y-3">
          <BookOpen className="mx-auto text-slate-300" size={40} />
          <h3 className="text-base font-extrabold text-slate-800">
            Chưa có bài luyện viết nào
          </h3>
          <p className="text-xs text-slate-500">
            Hệ thống đang chuẩn bị các đề bài mới. Vui lòng quay lại sau!
          </p>
        </div>
      )}
    </div>
  );
}
