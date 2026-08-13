"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Book, Loader2, ArrowLeft, ArrowRight, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readingService } from "@/lib/api/services/reading.service";

export default function ReadingTopicsPage() {
  const router = useRouter();
  
  const { data: topics, isLoading } = useQuery({
    queryKey: ["reading-topics"],
    queryFn: readingService.getTopics,
  });
  const topicList = Array.isArray(topics) ? topics : [];

  return (
    <div className="max-w-6xl mx-auto">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-8 transition-colors"
      >
        <ArrowLeft size={20} /> Quay lại Đảo Luyện Tập
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="bg-junior-green p-4 rounded-2xl text-white">
          <Book size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Luyện Đọc (Song ngữ)</h1>
          <p className="text-slate-500 font-medium mt-1">Luyện đọc hiểu dễ dàng hơn với chế độ song ngữ.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-junior-green" size={48} />
        </div>
      ) : topicList && topicList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topicList.map((topic: any, index: number) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -6 }}
              className="bg-white rounded-[2rem] border-4 border-slate-200 overflow-hidden shadow-sm flex flex-col"
            >
              <div className="h-40 bg-green-100 relative">
                {topic.iconUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center text-5xl">
                    {topic.iconUrl}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-green-300">
                    <Book size={64} />
                  </div>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-1">{topic.name}</h3>
                <p className="text-slate-500 font-medium text-sm line-clamp-2 mb-6 flex-1">
                  {topic.vietnameseName || topic.name} • {topic.totalArticles || 0} bài
                </p>
                <Link href={`/practice/reading/${topic.id}`}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full btn-green-3d flex items-center justify-center gap-2 bg-junior-green text-white font-bold p-3 rounded-xl"
                  >
                    Bắt đầu Đọc <PlayCircle size={20} strokeWidth={3} />
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-50 p-12 rounded-2xl border-2 border-dashed border-slate-300 text-center">
          <p className="text-slate-500 font-medium text-lg">Chưa có bài đọc nào được tạo.</p>
        </div>
      )}
    </div>
  );
}
