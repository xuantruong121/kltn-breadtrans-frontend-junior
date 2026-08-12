"use client";

import { motion } from "framer-motion";
import { Headphones, Book, Library, Mic, PenTool, ArrowRight } from "lucide-react";
import Link from "next/link";

const PRACTICE_AREAS = [
  {
    id: "listening",
    title: "Luyện Nghe (Chép chính tả)",
    description: "Cải thiện kỹ năng nghe thông qua phương pháp chép chính tả hiệu quả cao.",
    icon: Headphones,
    color: "bg-junior-blue",
    path: "/practice/quizzes?type=listening",
  },
  {
    id: "vocab",
    title: "Học Từ Vựng (Flashcards)",
    description: "Bộ thẻ từ vựng sinh động giúp bạn nhớ lâu hơn gấp 3 lần.",
    icon: Library,
    color: "bg-junior-orange",
    path: "/practice/vocab",
  },
  {
    id: "reading",
    title: "Luyện Đọc (Song ngữ)",
    description: "Đọc hiểu tiếng Anh dễ dàng hơn với chế độ hiển thị song ngữ thông minh.",
    icon: Book,
    color: "bg-junior-green",
    path: "/practice/reading",
  },
  {
    id: "speaking",
    title: "Luyện Phát Âm (AI Chấm)",
    description: "Tự tin giao tiếp với AI Gia sư chấm điểm phát âm cực kỳ chuẩn xác.",
    icon: Mic,
    color: "bg-purple-500",
    path: "/practice/speaking",
  },
  {
    id: "writing",
    title: "Luyện Viết (Toeic Part 1-3)",
    description: "Viết bài theo chủ đề và nhận nhận xét ngay lập tức từ AI.",
    icon: PenTool,
    color: "bg-pink-500",
    path: "/practice/writing",
  },
];

export default function PracticePage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-sky-400 to-indigo-500 p-12 rounded-[3rem] text-white text-center mb-12 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">🏝️ Đảo Luyện Tập</h1>
          <p className="text-xl font-medium text-sky-100 max-w-2xl mx-auto">
            Nơi bạn có thể mài giũa từng kỹ năng riêng biệt. Hãy chọn một hòn đảo nhỏ để bắt đầu chuyến phiêu lưu hôm nay!
          </p>
        </div>
        {/* Decor shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-white rounded-full mix-blend-overlay blur-3xl"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-white rounded-full mix-blend-overlay blur-3xl"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PRACTICE_AREAS.map((area, index) => (
          <Link href={area.path} key={area.id}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-white rounded-[2rem] border-4 border-slate-200 p-6 flex flex-col h-full shadow-sm hover:shadow-xl transition-all hover:border-slate-300"
            >
              <div className={`${area.color} w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-6 shadow-inner`}>
                <area.icon size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">{area.title}</h2>
              <p className="text-slate-500 font-medium mb-6 flex-1">{area.description}</p>
              
              <div className="flex items-center text-slate-400 font-bold gap-2 group-hover:text-slate-700 transition-colors mt-auto">
                Khám phá <ArrowRight size={20} />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
