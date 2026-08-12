"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, Loader2, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSocket } from "@/lib/providers/SocketProvider";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { courseService } from "@/lib/api/services/course.service";

export default function CoursesPage() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: courseService.getAllCourses,
  });

  useEffect(() => {
    if (!socket) return;
    
    socket.on("courseUpdated", () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    });

    return () => {
      socket.off("courseUpdated");
    };
  }, [socket, queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="animate-spin text-junior-green" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-junior-green p-4 rounded-2xl text-white">
          <BookOpen size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Lớp học của tôi</h1>
          <p className="text-slate-500 font-medium mt-1">Chọn một khóa học để bắt đầu hành trình nhé!</p>
        </div>
      </div>

      {/* Courses Grid */}
      {courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -6 }}
              className="bg-white rounded-[2rem] border-4 border-slate-200 overflow-hidden shadow-sm flex flex-col"
            >
              {/* Thumbnail */}
              <div className="h-48 bg-sky-100 relative overflow-hidden">
                {course.thumbnailUrl ? (
                  <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sky-300">
                    <BookOpen size={64} />
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-xl text-junior-orange font-bold text-sm flex items-center gap-1 shadow-sm">
                  <Star size={16} fill="currentColor" /> {course.level || "ALL LEVEL"}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2">{course.title}</h3>
                <p className="text-slate-500 font-medium text-sm line-clamp-3 mb-6 flex-1">
                  {course.description || "Chưa có mô tả cho khóa học này."}
                </p>
                
                <Link href={`/courses/${course.id}`}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full btn-green-3d flex items-center justify-center gap-2 bg-junior-green text-white font-bold p-3 rounded-xl"
                  >
                    Vào Học <ArrowRight size={20} strokeWidth={3} />
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-[2rem] border-4 border-slate-200 text-center">
          <BookOpen size={64} className="text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Chưa có khóa học nào</h2>
          <p className="text-slate-500 font-medium">Bạn hãy quay lại sau nhé, giáo viên đang chuẩn bị bài giảng rồi!</p>
        </div>
      )}
    </div>
  );
}
